"use client";
import { useState } from "react";
import type { Membro } from "@/lib/types";

interface Props {
  membros: Membro[];
  iniciais: string[];
  convidadosIniciais: string[];
  respostas: Record<string, string>;
  onSave: (ids: string[], convidados: string[]) => Promise<string | null>;
  onCancel: () => void;
}

const RESP: Record<string, string> = { vai: "disse vou", talvez: "talvez", nao: "não ia" };

// Lista de presenças: atletas do site (caixas) + participantes sem conta (nomes escritos).
export default function PresencasEditor({ membros, iniciais, convidadosIniciais, respostas, onSave, onCancel }: Props) {
  const [sel, setSel] = useState<Set<string>>(new Set(iniciais));
  const [conv, setConv] = useState<string[]>(convidadosIniciais);
  const [nome, setNome] = useState("");
  const [filtro, setFiltro] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const visiveis = filtro ? membros.filter((m) => norm(m.nome).includes(norm(filtro))) : membros;

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function adicionar() {
    const n = nome.trim().replace(/\s+/g, " ");
    if (!n) return;
    const m = membros.find((x) => norm(x.nome) === norm(n));
    if (m) setSel((s) => new Set(s).add(m.id)); // já tem conta: marca-o na lista
    else if (!conv.some((c) => norm(c) === norm(n))) setConv([...conv, n]);
    setNome("");
  }
  async function guardar() {
    setBusy(true); setErr("");
    const e = await onSave([...sel], conv);
    setBusy(false);
    if (e) setErr(e);
  }

  return (
    <div className="pres">
      <p className="hint" style={{ margin: 0 }}>Marca quem participou. Esta lista é a que conta para as estatísticas.</p>
      {membros.length > 8 && (
        <input type="text" placeholder="Procurar atleta…" aria-label="Procurar atleta" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      )}
      <div className="checks">
        {visiveis.map((m) => (
          <label key={m.id} className="check">
            <input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />
            <span>{m.nome || "Membro"}</span>
            {respostas[m.id] && <span className="r">{RESP[respostas[m.id]]}</span>}
          </label>
        ))}
        {!visiveis.length && <span className="empty">Nenhum atleta com esse nome.</span>}
      </div>

      <div className="field">
        <label htmlFor="pConv">Participantes sem conta no site</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input id="pConv" type="text" maxLength={40} placeholder="Nome e apelido" style={{ flex: 1 }} value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }} />
          <button type="button" className="btn" onClick={adicionar}>Adicionar</button>
        </div>
      </div>
      {conv.length > 0 && (
        <div className="grp go">
          {conv.map((c) => (
            <span key={c} className="chip guest">{c}
              <button type="button" className="x" aria-label={`Remover ${c}`} onClick={() => setConv(conv.filter((x) => x !== c))}>×</button>
            </span>
          ))}
        </div>
      )}

      {err && <div className="notice">{err}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn primary" disabled={busy} aria-busy={busy} onClick={guardar}>
          {busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : `Guardar presenças (${sel.size + conv.length})`}
        </button>
        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
