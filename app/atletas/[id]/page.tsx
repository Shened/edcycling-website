import Link from "next/link";
import { notFound } from "next/navigation";
import Texto from "@/components/Texto";
import Atividades from "@/components/Atividades";
import { getSession } from "@/lib/session";
import { CAMPOS_PERFIL, avatarUrl, idade, wkg, type PerfilAtleta } from "@/lib/atleta";
import { calcular, type InscricaoMin } from "@/lib/stats";
import { fmtKm } from "@/lib/gpx";
import type { Atividade, Evento, Membro, Treino } from "@/lib/types";

// Perfil de um atleta, visível para a equipa.
export default async function AtletaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, perfil: eu, isMember, isAdmin } = await getSession();
  if (!isMember) {
    return <section className="view"><p className="empty">Os perfis dos atletas são só para a equipa. <Link href="/entrar">Entra</Link> para os veres.</p></section>;
  }
  const { data } = await supabase.from("perfis").select(CAMPOS_PERFIL).eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as unknown as PerfilAtleta;
  const ano = new Date().getFullYear();
  const [{ data: treinos }, { data: eventos }, { data: insc }, { data: membros }, { data: atvs }] = await Promise.all([
    supabase.from("treinos").select("id,titulo,data,tipo,km,km_plano,dmais,duracao_s,presencas_fechadas,convidados,treino_participantes(user_id,estado,presente)").gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`),
    supabase.from("eventos").select("*"),
    supabase.from("inscricoes").select("evento_id,user_id,estado,presente").eq("user_id", id),
    supabase.from("perfis").select("id,nome").in("role", ["membro", "admin"]).eq("atleta", true),
    supabase.from("atividades").select("*").eq("user_id", id).order("data", { ascending: false }).order("hora", { ascending: false, nullsFirst: false }).limit(100),
  ]);
  const hoje = new Date().toISOString().slice(0, 10);
  const st = calcular((treinos ?? []) as unknown as Treino[], (eventos ?? []) as Evento[], (insc ?? []) as InscricaoMin[], (membros ?? []) as Membro[], ano, hoje);
  const linha = st.atletas.find((a) => a.id === id);
  const anos = idade(p.data_nascimento);
  const rel = wkg(p.ftp, p.peso);
  const foto = avatarUrl(p.avatar_path);
  const factos: [string, string][] = [];
  if (anos != null) factos.push(["Idade", `${anos} anos`]);
  if (p.ftp) factos.push(["FTP", `${p.ftp} W`]);
  if (rel != null) factos.push(["W/kg", rel.toFixed(2)]);
  if (p.fc_max) factos.push(["FC máx.", `${p.fc_max} bpm`]);
  if (p.altura) factos.push(["Altura", `${p.altura} cm`]);
  if (p.peso && (p.mostrar_peso || eu?.id === id)) factos.push(["Peso", `${Number(p.peso).toLocaleString("pt-PT")} kg`]);

  return (
    <section className="view atleta">
      <div className="atleta-top">
        {foto ? <img className="atleta-foto" src={foto} alt="" /> : <span className="av" style={{ width: 112, height: 112, fontSize: 52 }}>{(p.nome || "?").charAt(0).toUpperCase()}</span>}
        <div className="atleta-id">
          <p className="eyebrow" style={{ color: "var(--pink)" }}>Atleta EDCycling{p.localidade ? ` · ${p.localidade}` : ""}</p>
          <h2 className="big" style={{ fontSize: "clamp(34px,7vw,56px)" }}>{p.nome}</h2>
          {p.bicicleta && <p className="empty" style={{ margin: 0 }}>Bicicleta: <b style={{ color: "var(--ink)" }}>{p.bicicleta}</b></p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {p.strava_url && <a className="btn" href={p.strava_url} target="_blank" rel="noreferrer">Strava</a>}
            {eu?.id === id && <Link className="btn primary" href="/perfil">Editar perfil</Link>}
          </div>
        </div>
      </div>

      {factos.length > 0 && (
        <dl className="nums nums-auto">
          {factos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
        </dl>
      )}

      {p.bio && <div className="panel"><Texto texto={p.bio} /></div>}

      <div>
        <div className="sechead" style={{ marginBottom: 10 }}><h2 style={{ fontSize: 24 }}>Com a equipa em {ano}</h2><Link href="/estatisticas" className="btn ghost">Ver ranking</Link></div>
        <div className="tiles">
          <div className="tile"><div className="v num">{fmtKm(linha?.km ?? 0)}</div><div className="k">km de bicicleta</div></div>
          <div className="tile"><div className="v num">{linha?.treinos ?? 0}</div><div className="k">treinos</div></div>
          <div className="tile"><div className="v num">{Math.round((linha?.presenca ?? 0) * 100)}%</div><div className="k">presença nos treinos</div></div>
          <div className="tile"><div className="v num">{(linha?.dmais ?? 0).toLocaleString("pt-PT")}</div><div className="k">m de D+</div></div>
        </div>
        {(linha?.eventos ?? 0) > 0 && <p className="hint">Esteve em {linha!.eventos} evento{linha!.eventos === 1 ? "" : "s"} da equipa este ano.</p>}
      </div>

      <Atividades atividades={(atvs ?? []) as Atividade[]} userId={id} meuId={eu?.id ?? ""} isAdmin={isAdmin} nome={p.nome || ""} />
    </section>
  );
}
