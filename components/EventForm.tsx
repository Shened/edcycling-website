"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ESTADOS, MESES_L, TIPOS, evAno, evMes, parseDate } from "@/lib/dates";
import type { Evento } from "@/lib/types";
import { apagarEventoComAviso, avisarAlteracao, avisarNovo } from "@/lib/avisos";

// Formulário de criar/editar evento (só admins — o RLS garante o resto).
export default function EventForm({ evento, onClose, dataInicial }: { evento: Evento | null; onClose: () => void; dataInicial?: string }) {
  const d0 = parseDate(dataInicial);
  const router = useRouter();
  const now = new Date();
  const [f, setF] = useState({
    titulo: evento?.titulo ?? "",
    tipo: evento?.tipo ?? "passeio",
    estado: evento?.estado ?? "proposta",
    data: evento?.data ?? dataInicial ?? "",
    mes: evento ? evMes(evento) : (d0 ?? now).getMonth() + 1,
    ano: evento ? evAno(evento) : (d0 ?? now).getFullYear(),
    hora: evento?.hora ?? "",
    partida: evento?.partida ?? "",
    km: evento?.km?.toString() ?? "",
    dmais: evento?.dmais?.toString() ?? "",
    notas: evento?.notas ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState("");
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setF((p) => {
      const n = { ...p, [k]: v };
      if (k === "data") { const d = parseDate(v); if (d) { n.mes = d.getMonth() + 1; n.ano = d.getFullYear(); } }
      return n;
    });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.titulo.trim()) return;
    setBusy(true); setErr("");
    const body = {
      titulo: f.titulo.trim(), tipo: f.tipo, estado: f.estado, data: f.data || null,
      mes: +f.mes, ano: +f.ano, hora: f.hora || null, partida: f.partida.trim() || null,
      km: f.km ? +f.km : null, dmais: f.dmais ? +f.dmais : null, notas: f.notas.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const sb = createClient();
    const res = evento
      ? await sb.from("eventos").update(body).eq("id", evento.id)
      : await sb.from("eventos").insert(body).select("id").single();
    setBusy(false);
    if (res.error) { setErr("Não foi possível guardar. Confirma que és admin e tenta outra vez."); return; }
    // Avisos (correm no servidor; não atrasam quem guardou)
    if (evento) void avisarAlteracao("evento", evento.id, { data: evento.data, hora: evento.hora, partida: evento.partida, estado: evento.estado });
    else if (res.data) void avisarNovo("evento", (res.data as { id: string }).id);
    onClose(); router.refresh();
  }
  async function remove() {
    if (!evento) return;
    if (!armed) { setArmed(true); return; }
    setBusy(true);
    const erro = await apagarEventoComAviso(evento.id);
    setBusy(false);
    if (erro) { setErr(erro); return; }
    onClose(); router.refresh();
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save} autoComplete="off">
        <div className="stripe" />
        <div className="mbody">
          <h3>{evento ? evento.titulo : "Novo evento"}</h3>
          <div className="fgrid">
            <div className="field full"><label htmlFor="fTitulo">Nome do evento</label><input ref={first} id="fTitulo" type="text" required maxLength={60} placeholder="ex.: Serra da Estrela" value={f.titulo} onChange={set("titulo")} /></div>
            <div className="field"><label htmlFor="fTipo">Tipo</label><select id="fTipo" value={f.tipo} onChange={set("tipo")}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label htmlFor="fEstado">Estado</label><select id="fEstado" value={f.estado} onChange={set("estado")}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label htmlFor="fData">Data</label><input id="fData" type="date" value={f.data} onChange={set("data")} /><span className="hint">Sem data? Escolhe só o mês.</span></div>
            <div className="field"><label htmlFor="fMes">Mês / ano</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select id="fMes" style={{ flex: 1 }} value={f.mes} onChange={set("mes")}>{MESES_L.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                <input type="number" aria-label="Ano" min={2023} max={2040} style={{ width: 84 }} value={f.ano} onChange={set("ano")} />
              </div>
            </div>
            <div className="field"><label htmlFor="fHora">Hora de saída</label><input id="fHora" type="time" value={f.hora} onChange={set("hora")} /></div>
            <div className="field"><label htmlFor="fPartida">Ponto de encontro</label><input id="fPartida" type="text" maxLength={80} value={f.partida} onChange={set("partida")} /></div>
            <div className="field"><label htmlFor="fKm">Distância (km)</label><input id="fKm" type="number" min={0} value={f.km} onChange={set("km")} /></div>
            <div className="field"><label htmlFor="fDmais">Desnível (m D+)</label><input id="fDmais" type="number" min={0} step={10} value={f.dmais} onChange={set("dmais")} /></div>
            <div className="field full"><label htmlFor="fNotas">Notas</label><textarea id="fNotas" maxLength={800} placeholder="Almoço, carro de apoio, equipamento a levar…" value={f.notas} onChange={set("notas")} /></div>
          </div>
          {err && <div className="notice">{err}</div>}
          <div className="mactions">
            {evento ? <button type="button" className="btn ghost danger" onClick={remove} disabled={busy}>{armed ? "Confirmar: apagar de vez" : "Apagar evento"}</button> : <span />}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "A guardar…" : "Guardar"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
