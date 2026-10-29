import Link from "next/link";
import { getSession } from "@/lib/session";
import { MESES, evAno, evMes, fmtDate, isPast, sortEventos } from "@/lib/dates";
import type { Evento } from "@/lib/types";

// Resumo do painel de admin: números e o que precisa de atenção.
export default async function Resumo() {
  const { supabase } = await getSession();
  const d = new Date();
  const hoje = d.toISOString().slice(0, 10);
  const ha60 = new Date(d.getTime() - 60 * 864e5).toISOString().slice(0, 10);

  const [{ data: perfis }, { data: eventos }, { data: insc }, { data: treinos }, { data: noticias }] = await Promise.all([
    supabase.from("perfis").select("id,nome,email,role,ativo,atleta"),
    supabase.from("eventos").select("*"),
    supabase.from("inscricoes").select("evento_id,estado"),
    supabase.from("treinos").select("id,titulo,data,presencas_fechadas").lt("data", hoje).gte("data", ha60).order("data", { ascending: false }),
    supabase.from("noticias").select("id,titulo,publicado"),
  ]);
  const ps = perfis ?? [];
  const evs = sortEventos((eventos ?? []) as Evento[]);
  const proximos = evs.filter((e) => !isPast(e) && e.estado !== "cancelado");
  const atletas = ps.filter((p) => p.role !== "pendente" && p.atleta !== false && p.ativo).length;
  const convites = ps.filter((p) => !p.ativo);
  const semPresTreinos = (treinos ?? []).filter((t) => !t.presencas_fechadas);
  const semPresEventos = evs.filter((e) => e.estado !== "cancelado" && isPast(e) && !e.presencas_fechadas && (!e.data || e.data >= ha60));
  const rascunhos = (noticias ?? []).filter((n) => !n.publicado);
  const publicadas = (noticias ?? []).length - rascunhos.length;
  const vai = (id: string) => (insc ?? []).filter((i) => i.evento_id === id && i.estado === "vai").length;
  const tarefas = convites.length + semPresTreinos.length + semPresEventos.length + rascunhos.length;

  return (
    <section className="view">
      <div className="tiles">
        <div className="tile"><div className="v num">{atletas}</div><div className="k">Atletas ativos</div></div>
        <div className="tile"><div className="v num">{proximos.length}</div><div className="k">Próximos eventos</div></div>
        <div className="tile"><div className="v num">{convites.length}</div><div className="k">Convites por aceitar</div></div>
        <div className="tile"><div className="v num">{publicadas}</div><div className="k">Publicações na página inicial</div></div>
      </div>

      <div className="adm-acoes">
        <Link className="btn primary" href="/gestao/membros#convidar">+ Convidar atleta</Link>
        <Link className="btn" href="/gestao/publicacoes?nova=1">+ Nova publicação</Link>
        <Link className="btn" href="/gestao/eventos">+ Criar evento</Link>
        <Link className="btn" href="/treinos">Planear treino</Link>
      </div>

      <div className="adm-cols">
        <div className="panel">
          <h3 className="adm-h">Precisa de atenção {tarefas > 0 && <span className="adm-badge num">{tarefas}</span>}</h3>
          {tarefas === 0 ? <p className="empty">Está tudo em dia.</p> : (
            <ul className="todo">
              {convites.map((p) => (
                <li key={p.id}><span className="pill pendente">Convite</span><span><b>{p.nome || p.email}</b> ainda não aceitou o convite.</span><Link href="/gestao/membros">Ver</Link></li>
              ))}
              {semPresEventos.map((e) => (
                <li key={e.id}><span className="pill tipo">Evento</span><span>Registar presenças em <b>{e.titulo}</b>.</span><Link href={`/eventos/${e.id}`}>Abrir</Link></li>
              ))}
              {semPresTreinos.map((t) => (
                <li key={t.id}><span className="pill tipo">Treino</span><span>Registar presenças em <b>{t.titulo}</b> ({fmtDate(t.data, { day: "numeric", month: "short" })}).</span><Link href="/treinos">Abrir</Link></li>
              ))}
              {rascunhos.map((n) => (
                <li key={n.id}><span className="pill">Rascunho</span><span><b>{n.titulo}</b> ainda não está publicada.</span><Link href="/gestao/publicacoes">Editar</Link></li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h3 className="adm-h">Próximos eventos</h3>
          {proximos.length ? (
            <ul className="todo">
              {proximos.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <span className="num muted" style={{ minWidth: 64 }}>{e.data ? fmtDate(e.data, { day: "numeric", month: "short" }) : `${MESES[evMes(e) - 1]} ${evAno(e)}`}</span>
                  <span><b>{e.titulo}</b> · <span className="c-vai num">{vai(e.id)}</span> vão</span>
                  <Link href={`/eventos/${e.id}`}>Ver</Link>
                </li>
              ))}
            </ul>
          ) : <p className="empty">Sem eventos marcados.</p>}
        </div>
      </div>
    </section>
  );
}
