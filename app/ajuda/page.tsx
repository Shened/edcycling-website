import type { Metadata } from "next";
import Link from "next/link";
import AjudaInstalar from "@/components/AjudaInstalar";
import AjudaAtividades from "@/components/AjudaAtividades";

export const metadata: Metadata = { title: "Ajuda · EDCycling" };

const SECCOES: { href: string; t: string; d: string; i: React.ReactNode }[] = [
  { href: "/eventos", t: "Eventos", d: "Passeios e provas da equipa. Abre um evento para ver os detalhes e responde Vou, Talvez ou Não vou.", i: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></> },
  { href: "/treinos", t: "Treinos", d: "O calendário dos treinos de grupo. Carrega num dia para marcar um treino ou juntares-te a um.", i: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { href: "/fotos", t: "Feed", d: "Fotos e textos da equipa. Dois toques numa foto dão gosto; podes comentar e ligar a publicação a um evento.", i: <><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="11" r="2" /><path d="m21 17-5-5-8 8" /></> },
  { href: "/atletas", t: "Atletas", d: "O perfil de cada atleta: dados, bicicleta, atividades e o que fez com a equipa este ano.", i: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.6c3 .2 5 1.9 5 4.9" /></> },
  { href: "/estatisticas", t: "Números", d: "Quilómetros, desnível e presenças da equipa ao longo da época, e o ranking.", i: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  { href: "/perfil", t: "O teu perfil", d: "No menu do teu avatar (em cima à direita): foto, FTP, tamanhos de equipamento e as tuas atividades.", i: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></> },
  { href: "/definicoes", t: "Notificações", d: "Também no menu do avatar, em Definições: escolhe que avisos queres no telemóvel e por email.", i: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></> },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "Tenho de instalar alguma coisa da Play Store ou da App Store?", a: "Não. A app é o próprio site guardado no ecrã inicial. Não ocupa espaço e não precisa de lojas." },
  { q: "Como atualizo a app?", a: "Não precisas de fazer nada: sempre que o site muda, a app abre já com a versão nova." },
  { q: "O ícone da app no telemóvel ainda é o antigo.", a: "O telemóvel guarda o ícone no momento em que instalas a app. Para ver o novo, remove a app do ecrã inicial e instala-a outra vez (os passos estão no início desta página). A sessão e os teus dados não se perdem." },
  { q: "Tenho de fazer login sempre?", a: "Não. A sessão fica guardada. Só voltas a entrar se carregares em Sair ou se apagares os dados do browser." },
  { q: "As minhas atividades são vistas por todos?", a: "A equipa vê-as no teu perfil, a não ser que marques “Só eu vejo esta atividade”. No calendário de Treinos e na página de Eventos, as tuas atividades só aparecem para ti." },
  { q: "Esqueci-me da password.", a: <>No ecrã de entrar, carrega em <Link href="/recuperar">Esqueci-me da password</Link> e recebes um email para definires uma nova.</> },
  { q: "Não tenho conta. Como entro?", a: "As contas são criadas por convite. Pede a um admin da equipa que te convide; recebes um email para definires a password." },
  { q: "Como removo a app?", a: "Tal como qualquer app: carrega no ícone sem largar e escolhe Remover (iPhone) ou Desinstalar (Android)." },
];

export default function Ajuda() {
  return (
    <section className="view ajuda">
      <div className="intro-txt">
        <h2 className="big" style={{ fontSize: "clamp(36px,7vw,56px)" }}>Ajuda</h2>
        <p className="lead">Tudo o que precisas para usar o site da EDCycling: instalar a app, conhecer as secções e carregar as tuas atividades.</p>
        <nav className="ajuda-idx" aria-label="Nesta página">
          <a href="#instalar">Instalar a app</a>
          <a href="#site">Conhecer o site</a>
          <a href="#atividades">Carregar atividades</a>
          <a href="#perguntas">Perguntas</a>
        </nav>
      </div>

      <section id="instalar" className="ajuda-sec">
        <h2>Instalar a app no telemóvel</h2>
        <p className="lead">O site funciona como uma app: fica no ecrã inicial com o ícone da equipa e abre em ecrã inteiro. São quatro passos e não precisas de nenhuma loja.</p>
        <AjudaInstalar />
      </section>

      <section id="site" className="ajuda-sec">
        <h2>Conhecer o site</h2>
        <p className="lead">No telemóvel, as secções estão na barra de baixo; no computador, na barra de cima. O teu perfil, as definições e o sair estão no menu do teu avatar.</p>
        <ul className="ajuda-grid">
          {SECCOES.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="ajuda-card">
                <span className="ajuda-ic" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.i}</svg></span>
                <span><b>{s.t}</b><span>{s.d}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="atividades" className="ajuda-sec">
        <h2>Carregar as tuas atividades</h2>
        <p className="lead">O site não liga diretamente ao Strava, mas aceita os ficheiros das tuas voltas, corridas e natação: <b>.gpx</b> ou <b>.fit</b>. Primeiro descarrega o ficheiro da app onde a atividade está.</p>
        <AjudaAtividades />
      </section>

      <section id="perguntas" className="ajuda-sec">
        <h2>Perguntas frequentes</h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
