import type { Metadata } from "next";
import Link from "next/link";
import AjudaInstalar from "@/components/AjudaInstalar";

export const metadata: Metadata = { title: "Ajuda · EDCycling" };

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "Tenho de instalar alguma coisa da Play Store ou da App Store?", a: "Não. A app é o próprio site guardado no ecrã inicial. Não ocupa espaço e não precisa de lojas." },
  { q: "Como atualizo a app?", a: "Não precisas de fazer nada: sempre que o site muda, a app abre já com a versão nova." },
  { q: "Tenho de fazer login sempre?", a: "Não. A sessão fica guardada. Só voltas a entrar se carregares em Sair ou se apagares os dados do browser." },
  { q: "Esqueci-me da password.", a: <>No ecrã de entrar, carrega em <Link href="/recuperar">Esqueci-me da password</Link> e recebes um email para definires uma nova.</> },
  { q: "Não tenho conta. Como entro?", a: "As contas são criadas por convite. Pede a um admin da equipa que te convide; recebes um email para definires a password." },
  { q: "Como removo a app?", a: "Tal como qualquer app: carrega no ícone sem largar e escolhe Remover (iPhone) ou Desinstalar (Android)." },
];

export default function Ajuda() {
  return (
    <section className="view ajuda">
      <div className="intro-txt">
        <p className="eyebrow" style={{ color: "var(--pink)" }}>Ajuda</p>
        <h2 className="big" style={{ fontSize: "clamp(32px,6vw,52px)" }}>Instala a app no telemóvel</h2>
        <p className="lead">O site da EDCycling funciona como uma app: fica no ecrã inicial com o ícone da equipa, abre em ecrã inteiro e tem a navegação em baixo. São quatro passos e não precisas de nenhuma loja de apps.</p>
      </div>

      <AjudaInstalar />

      <div>
        <div className="sechead" style={{ marginBottom: 12 }}><h2>Perguntas frequentes</h2></div>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
