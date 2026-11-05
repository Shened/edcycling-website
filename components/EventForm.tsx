"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { marcar } from "@/lib/metricas";
import { ESTADOS, MESES_L, TIPOS, evAno, evMes, parseDate } from "@/lib/dates";
import { ehDesporto, type Evento } from "@/lib/types";
import { apagarEventoComAviso, avisarAlteracao, avisarNovo, avisarSondagem } from "@/lib/avisos";
import { TEMAS, temaSugerido } from "@/lib/temas";
import Link from "next/link";

// Formulário de criar/editar evento. Os admins criam já confirmados; os atletas propõem (fica "Proposta" até um admin decidir).
export default function EventForm({ evento, onClose, dataInicial, isAdmin = true }: { evento: Evento | null; onClose: () => void; dataInicial?: string; isAdmin?: boolean }) {
  const d0 = parseDate(dataInicial);
  const router = useRouter();
  const now = new Date();
  const [f, setF] = useState({
    titulo: evento?.titulo ?? "",
    tipo: evento?.tipo ?? "passeio",
    estado: evento?.estado ?? (isAdmin ? "confirmado" : "proposta"),
    data: evento?.data ?? dataInicial ?? "",
    mes: evento ? evMes(evento) : (d0 ?? now).getMonth() + 1,
    ano: evento ? evAno(evento) : (d0 ?? now).getFullYear(),
    hora: evento?.hora ?? "",
    partida: evento?.partida ?? "",
    km: evento?.km?.toString() ?? "",
    dmais: evento?.dmais?.toString() ?? "",
    notas: evento?.notas ?? "",
    tema: evento?.tema ?? "",
    equipamento_id: evento?.equipamento_id ?? "",
    desporto: evento ? ehDesporto(evento) : true,
  });
  const [despMexido, setDespMexido] = useState(!!evento);
  // Equipamentos da equipa (null = a tabela ainda não existe; nesse caso o campo não aparece).
  const [kits, setKits] = useState<{ id: string; nome: string }[] | null>(null);
  useEffect(() => {
    createClient().from("equipamentos").select("id,nome").eq("ativo", true).order("ordem").order("nome")
      .then(({ data, error }) => setKits(error ? null : (data ?? [])));
  }, []);
  // Votação de datas (só admins): várias datas possíveis, a equipa marca as que dão jeito.
  const [votar, setVotar] = useState(evento?.sondagem === "aberta");
  const [datas, setDatas] = useState<{ id?: string; data: string; hora: string }[]>([]);
  const [origIds, setOrigIds] = useState<string[]>([]);
  useEffect(() => {
    if (!evento || !isAdmin) return;
    createClient().from("evento_opcoes").select("id,data,hora").eq("evento_id", evento.id).order("data").then(({ data }) => {
      const l = (data ?? []) as { id: string; data: string; hora: string | null }[];
      setDatas(l.map((o) => ({ id: o.id, data: o.data, hora: o.hora?.slice(0, 5) ?? "" })));
      setOrigIds(l.map((o) => o.id));
    });
  }, [evento, isAdmin]);
  function ligarVotacao(on: boolean) {
    setVotar(on);
    if (on && !datas.length) setDatas([{ data: f.data, hora: "" }, { data: "", hora: "" }]);
  }
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
      // Convívio sugere "não desportivo" (até a pessoa mexer na opção).
      if (k === "tipo" && !despMexido) n.desporto = v !== "convivio";
      if (k === "data") { const d = parseDate(v); if (d) { n.mes = d.getMonth() + 1; n.ano = d.getFullYear(); } }
      return n;
    });
  };

  const sug = temaSugerido(f.data);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.titulo.trim()) return;
    const opcoes = votar ? datas.filter((d) => d.data).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)) : [];
    if (votar && opcoes.length < 2) { setErr("Para votar, põe pelo menos 2 datas possíveis."); return; }
    if (votar && new Set(opcoes.map((o) => o.data + o.hora)).size !== opcoes.length) { setErr("Há datas repetidas na votação."); return; }
    setBusy(true); setErr("");
    const abriu = isAdmin && votar && evento?.sondagem !== "aberta";
    const body = {
      titulo: f.titulo.trim(), tipo: f.tipo, estado: isAdmin ? f.estado : "proposta", data: votar ? null : f.data || null,
      mes: votar ? +opcoes[0].data.slice(5, 7) : +f.mes, ano: votar ? +opcoes[0].data.slice(0, 4) : +f.ano, hora: f.hora || null, partida: f.partida.trim() || null,
      km: f.km ? +f.km : null, dmais: f.dmais ? +f.dmais : null, notas: f.notas.trim() || null, tema: f.tema || null,
      ...(kits ? { equipamento_id: f.equipamento_id || null } : {}),
      desporto: f.desporto,
      ...(isAdmin ? { sondagem: votar ? "aberta" : evento?.sondagem === "aberta" ? null : evento?.sondagem ?? null } : {}),
      updated_at: new Date().toISOString(),
    };
    const sb = createClient();
    const res = evento
      ? await sb.from("eventos").update(body).eq("id", evento.id)
      : await sb.from("eventos").insert(body).select("id").single();
    if (res.error && /sondagem/.test(res.error.message)) { setBusy(false); setErr("Falta correr a migration 029 no Supabase."); return; }
    const id = evento?.id ?? (res.data as { id: string } | null)?.id;
    // Guarda as datas da votação (apaga as que saíram, atualiza as que ficaram, cria as novas).
    if (!res.error && isAdmin && id && (votar || origIds.length)) {
      const ficam = new Set(opcoes.filter((o) => o.id).map((o) => o.id!));
      const sair = origIds.filter((x) => !ficam.has(x));
      if (sair.length) await sb.from("evento_opcoes").delete().in("id", sair);
      for (const [i, o] of opcoes.entries()) {
        const linha = { data: o.data, hora: o.hora || null, ordem: i };
        if (o.id) await sb.from("evento_opcoes").update(linha).eq("id", o.id);
        else await sb.from("evento_opcoes").insert({ ...linha, evento_id: id });
      }
    }
    setBusy(false);
    if (res.error && /desporto/.test(res.error.message)) { setErr("Falta correr a migration 028 no Supabase."); return; }
    if (res.error) { setErr(!isAdmin && /row-level|policy|criador_id/i.test(res.error.message) ? "Ainda não é possível propor eventos (falta a migration 026)." : "Não foi possível guardar. Tenta outra vez."); return; }
    // Avisos (correm no servidor; não atrasam quem guardou)
    if (abriu && id) { void avisarSondagem(id); if (!evento) marcar("Evento criado", { tipo: f.tipo, tema: f.tema || "nenhum", votacao: "sim" }); }
    else if (evento) void avisarAlteracao("evento", evento.id, { data: evento.data, hora: evento.hora, partida: evento.partida, estado: evento.estado });
    else if (res.data) { void avisarNovo("evento", (res.data as { id: string }).id); marcar("Evento criado", { tipo: f.tipo, tema: f.tema || "nenhum" }); }
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
          <h3>{evento ? evento.titulo : isAdmin ? "Novo evento" : "Propor evento"}</h3>
          {!isAdmin && <p className="hint" style={{ margin: "-6px 0 0" }}>Fica como <b>proposta</b>: a equipa diz se vai e um admin confirma.</p>}
          <div className="fgrid">
            <div className="field full"><label htmlFor="fTitulo">Nome do evento</label><input ref={first} id="fTitulo" type="text" required maxLength={60} placeholder="ex.: Serra da Estrela" value={f.titulo} onChange={set("titulo")} /></div>
            <div className="field"><label htmlFor="fTipo">Tipo</label><select id="fTipo" value={f.tipo} onChange={set("tipo")}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            {isAdmin && <div className="field"><label htmlFor="fEstado">Estado</label><select id="fEstado" value={f.estado} onChange={set("estado")}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>}
            {isAdmin && (
              <div className="field full">
                <label className="chk" htmlFor="fVotar">
                  <input id="fVotar" type="checkbox" checked={votar} onChange={(ev) => ligarVotacao(ev.target.checked)} />
                  <span><b>Decidir a data por votação</b><span className="hint" style={{ display: "block" }}>Pões várias datas possíveis, os atletas marcam as que lhes dão jeito e depois escolhes a final.</span></span>
                </label>
                {votar && (
                  <div className="ef-datas">
                    {datas.map((d, i) => (
                      <div key={d.id ?? `n${i}`} className="ef-data">
                        <input type="date" aria-label={`Data ${i + 1}`} value={d.data} onChange={(ev) => setDatas((l) => l.map((x, j) => (j === i ? { ...x, data: ev.target.value } : x)))} />
                        <input type="time" aria-label={`Hora da data ${i + 1} (opcional)`} value={d.hora} onChange={(ev) => setDatas((l) => l.map((x, j) => (j === i ? { ...x, hora: ev.target.value } : x)))} />
                        <button type="button" className="btn ghost" aria-label={`Tirar a data ${i + 1}`} onClick={() => setDatas((l) => l.filter((_, j) => j !== i))}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setDatas((l) => [...l, { data: "", hora: "" }])}>+ Mais uma data</button>
                    <span className="hint">A hora é opcional; se não puseres, fica a hora de saída do evento.{evento?.sondagem === "aberta" ? " Tirar uma data apaga os votos dessa data." : ""}</span>
                  </div>
                )}
              </div>
            )}
            {!votar && <div className="field"><label htmlFor="fData">Data</label><input id="fData" type="date" value={f.data} onChange={set("data")} /><span className="hint">Sem data? Escolhe só o mês.</span></div>}
            {!votar && (
            <div className="field"><label htmlFor="fMes">Mês / ano</label>
              <div style={{ display: "flex", gap: 6 }}>
                <select id="fMes" style={{ flex: 1 }} value={f.mes} onChange={set("mes")}>{MESES_L.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                <input type="number" aria-label="Ano" min={2023} max={2040} style={{ width: 84 }} value={f.ano} onChange={set("ano")} />
              </div>
            </div>
            )}
            <div className="field"><label htmlFor="fHora">Hora de saída</label><input id="fHora" type="time" value={f.hora} onChange={set("hora")} /></div>
            <div className="field"><label htmlFor="fPartida">Ponto de encontro</label><input id="fPartida" type="text" maxLength={80} value={f.partida} onChange={set("partida")} /></div>
            <div className="field"><label htmlFor="fKm">Distância (km)</label><input id="fKm" type="number" min={0} value={f.km} onChange={set("km")} /></div>
            <div className="field"><label htmlFor="fDmais">Desnível (m D+)</label><input id="fDmais" type="number" min={0} step={10} value={f.dmais} onChange={set("dmais")} /></div>
            {kits && (
              <div className="field full"><label htmlFor="fEquip">Equipamento</label>
                <select id="fEquip" value={f.equipamento_id} onChange={set("equipamento_id")}>
                  <option value="">Livre (sem equipamento definido)</option>
                  {kits.map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
                </select>
                <span className="hint">{kits.length ? "Os atletas veem no cartão e na página do evento qual equipamento levar." : <>Ainda não há equipamentos. Cria-os em <Link href="/gestao/equipamentos">Gestão, Equipamentos</Link>.</>}</span>
              </div>
            )}
            <div className="field full"><label htmlFor="fTema">Tema festivo</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select id="fTema" style={{ flex: "1 1 180px" }} value={f.tema} onChange={set("tema")}>
                  <option value="">Sem tema</option>
                  {Object.entries(TEMAS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                </select>
                {!f.tema && sug && <button type="button" className="btn" onClick={() => setF((p) => ({ ...p, tema: sug }))}>Usar tema de {TEMAS[sug].label}</button>}
              </div>
              <span className="hint">Muda as cores do cartão e da página do evento.</span>
            </div>
            <div className="field full">
              <label className="chk" htmlFor="fDesp">
                <input id="fDesp" type="checkbox" checked={f.desporto} onChange={(e) => { setDespMexido(true); setF((p) => ({ ...p, desporto: e.target.checked })); }} />
                <span><b>Evento desportivo</b><span className="hint" style={{ display: "block" }}>Conta como treino nos números da equipa (treinos, km e D+). Desliga para jantares, convívios e afins.</span></span>
              </label>
            </div>
            <div className="field full"><label htmlFor="fNotas">Notas</label><textarea id="fNotas" maxLength={800} placeholder="Almoço, carro de apoio, equipamento a levar…" value={f.notas} onChange={set("notas")} /></div>
          </div>
          {err && <div className="notice">{err}</div>}
          <div className="mactions">
            {evento ? <button type="button" className="btn ghost danger" onClick={remove} disabled={busy}>{armed ? "Confirmar: apagar de vez" : evento.estado === "proposta" ? "Apagar proposta" : "Apagar evento"}</button> : <span />}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn primary" disabled={busy}>{busy ? "A guardar…" : !isAdmin && !evento ? "Propor" : "Guardar"}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
