import Link from "next/link";
import { MESES, parseDate, sortEventos, isPast } from "@/lib/dates";
import { dataPub, imagemUrl, resumo, type Noticia } from "@/lib/noticias";
import type { Evento } from "@/lib/types";
import AtivarAvisos from "./AtivarAvisos";

const TIPO_TREINO: Record<string, string> = { estrada: "Estrada", gravel: "Gravel", btt: "BTT", rolo: "Rolo", corrida: "Corrida", natacao: "Natação" };
const TIPO_EVENTO: Record<string, string> = { passeio: "Passeio", treino: "Treino", prova: "Prova", convivio: "Convívio" };

export interface TreinoMin { id: string; titulo: string; data: string; hora: string | null; tipo: string; partida: string | null; perfis?: { nome: string | null } | null }
export interface PostMin { id: string; autor_id: string; legenda: string | null; created_at: string; perfis: { nome: string | null } | null; eventos: { titulo: string } | null; foto?: string | null }

const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function Dia({ iso }: { iso: string | null }) {
  const d = parseDate(iso);
  return (
    <span className="ini-dia" suppressHydrationWarning>
      <b>{d ? d.getDate() : "—"}</b>
      <span>{d ? MESES[d.getMonth()] : ""}</span>
    </span>
  );
}

// Página inicial de quem tem conta: o que aí vem, as novidades da equipa e o que se publicou.
export default function InicioMembro({ nome, eventos, treinos, noticias, posts, porFechar = 0, votacoes = 0, isAdmin, userId, vapid = "" }: {
  nome: string; eventos: Evento[]; treinos: TreinoMin[]; noticias: Noticia[]; posts: PostMin[]; porFechar?: number; votacoes?: number; userId: string; vapid?: string; isAdmin: boolean;
}) {
  const hoje = hojeIso();
  // Próximos 5: eventos confirmados e treinos, por data.
  const agenda = [
    ...sortEventos(eventos).filter((e) => !isPast(e) && e.estado !== "cancelado" && e.data).map((e) => ({ k: "e" as const, data: e.data!, hora: e.hora, id: e.id, titulo: e.titulo, sub: [TIPO_EVENTO[e.tipo] ?? "Evento", e.partida].filter(Boolean).join(" · "), href: `/eventos/${e.id}` })),
    ...treinos.filter((t) => t.data >= hoje).map((t) => ({ k: "t" as const, data: t.data, hora: t.hora, id: t.id, titulo: t.titulo, sub: [`Treino de ${(TIPO_TREINO[t.tipo] ?? "bicicleta").toLowerCase()}`, t.partida].filter(Boolean).join(" · "), href: `/treinos?treino=${t.id}` })),
  ].sort((a, b) => (a.data + (a.hora ?? "")).localeCompare(b.data + (b.hora ?? ""))).slice(0, 5);

  return (
    <section className="view ini">
      <div className="sechead">
        <h2>Olá, {nome.split(" ")[0] || "atleta"}</h2>
      </div>

      {vapid && <AtivarAvisos userId={userId} vapid={vapid} />}

      {(votacoes > 0 || (isAdmin && porFechar > 0)) && (
        <div className="ini-alertas">
          {votacoes > 0 && <Link href="/eventos" className="ini-alerta"><b>{votacoes}</b> {votacoes === 1 ? "evento à espera do teu voto na data" : "eventos à espera do teu voto na data"} →</Link>}
          {isAdmin && porFechar > 0 && <Link href="/eventos?ver=passados" className="ini-alerta"><b>{porFechar}</b> {porFechar === 1 ? "evento passado por dar como terminado" : "eventos passados por dar como terminados"} →</Link>}
        </div>
      )}

      <div className="ini-grid">
        <section className="ini-sec" aria-labelledby="iniAg">
          <div className="ini-h"><h3 id="iniAg">A seguir</h3><Link href="/treinos" className="ini-mais">Calendário</Link></div>
          {agenda.length ? (
            <ul className="ini-ag">
              {agenda.map((a) => (
                <li key={`${a.k}-${a.id}`}>
                  <Link href={a.href} className={`ini-ag-i ${a.k === "e" ? "ev" : "tr"}`}>
                    <Dia iso={a.data} />
                    <span className="ini-ag-t"><b>{a.titulo}</b><span>{[a.hora ? a.hora.slice(0, 5) : null, a.sub].filter(Boolean).join(" · ")}</span></span>
                    <span className="ini-tag">{a.k === "e" ? "Evento" : "Treino"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="empty" style={{ margin: 0 }}>Nada marcado para os próximos dias. <Link href="/treinos">Marca um treino</Link>.</p>}
        </section>

        <section className="ini-sec" aria-labelledby="iniFeed">
          <div className="ini-h"><h3 id="iniFeed">No feed</h3><Link href="/fotos" className="ini-mais">Ver o feed</Link></div>
          {posts.length ? (
            <ul className="ini-feed">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href="/fotos" className="ini-feed-i">
                    {p.foto ? <img src={p.foto} alt="" loading="lazy" /> : <span className="ini-feed-ph" aria-hidden="true" />}
                    <span className="ini-feed-t">
                      <b>{p.perfis?.nome ?? "Membro"}{p.eventos?.titulo ? <span> · {p.eventos.titulo}</span> : null}</b>
                      <span>{p.legenda ? resumo(p.legenda, 90) : "Partilhou fotos"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="empty" style={{ margin: 0 }}>Ainda não há publicações. <Link href="/fotos">Publica a primeira</Link>.</p>}
        </section>
      </div>

      {noticias.length > 0 && (
        <div className="novidades">
          <div className="sechead" style={{ marginBottom: 14 }}><h2>Novidades da equipa</h2></div>
          <div className="nov-grid">
            {noticias.map((n, i) => (
              <Link key={n.id} href={`/noticias/${n.id}`} className={`nov${i === 0 ? " first" : ""}${n.imagem_path ? "" : " sem-img"}`}>
                {n.imagem_path ? <img src={imagemUrl(n.imagem_path)!} alt="" loading="lazy" /> : null}
                <span className="nov-b">
                  <span className="nov-d">{dataPub(n)}</span>
                  <span className="nov-t">{n.titulo}</span>
                  {n.texto && <span className="nov-x">{resumo(n.texto, i === 0 ? 240 : 140)}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link href="/tour-de-freixo" className="tdf-promo">
        <img src="/tdf/logo.webp" alt="" width={452} height={420} />
        <div>
          <span className="eyebrow">By EDCycling</span>
          <b>Tour de Freixo</b>
          <p>Classificação geral, sprint e montanha, etapa a etapa.</p>
          <span className="cta">Ver classificações →</span>
        </div>
      </Link>
    </section>
  );
}
