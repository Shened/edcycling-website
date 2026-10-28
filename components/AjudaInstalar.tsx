"use client";
import { useEffect, useState } from "react";
import InstalarApp from "./InstalarApp";

type SO = "android" | "iphone";

const Partilhar = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-label="botão Partilhar"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>
);
const Menu = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-label="menu ⋮"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
);
const Mais = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-label="ícone de adicionar"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></svg>
);

const PASSOS: Record<SO, { t: React.ReactNode; d: React.ReactNode }[]> = {
  android: [
    { t: "Abre o site no Chrome", d: <>Entra em <b>edcycling-website.vercel.app</b> e faz login com a tua conta.</> },
    { t: <>Abre o menu <Menu /></>, d: <>Carrega nos três pontos no canto superior direito do Chrome. Também podes usar o botão <b>Instalar app</b> desta página, se aparecer.</> },
    { t: "Escolhe “Instalar app”", d: <>Em alguns telemóveis aparece como <b>Adicionar ao ecrã principal</b>. Confirma em <b>Instalar</b>.</> },
    { t: "Abre pelo ícone EDC", d: <>A app fica no ecrã inicial e na lista de apps. Abre em ecrã inteiro, já com a tua sessão iniciada.</> },
  ],
  iphone: [
    { t: "Abre o site no Safari", d: <>No iPhone só o <b>Safari</b> instala apps de sites. Entra em <b>edcycling-website.vercel.app</b> e faz login.</> },
    { t: <>Carrega em Partilhar <Partilhar /></>, d: <>É o quadrado com a seta para cima, na barra de baixo do Safari (ou ao lado do endereço no iPad).</> },
    { t: <>Escolhe “Adicionar ao ecrã principal” <Mais /></>, d: <>Desce na lista de opções até a encontrares. Se não aparecer, carrega em <b>Editar ações</b> e acrescenta-a.</> },
    { t: "Confirma em “Adicionar”", d: <>O ícone EDC fica no ecrã principal. Abre sempre a partir daí para teres a app em ecrã inteiro.</> },
  ],
};

export default function AjudaInstalar() {
  const [so, setSo] = useState<SO>("android");
  useEffect(() => { if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setSo("iphone"); }, []);
  return (
    <div className="ajuda-inst">
      <div className="seg" role="tablist" aria-label="Sistema do telemóvel">
        <button type="button" role="tab" aria-selected={so === "android"} aria-pressed={so === "android"} onClick={() => setSo("android")}>Android</button>
        <button type="button" role="tab" aria-selected={so === "iphone"} aria-pressed={so === "iphone"} onClick={() => setSo("iphone")}>iPhone</button>
      </div>
      <ol className="passos">
        {PASSOS[so].map((p, i) => (
          <li key={i}>
            <span className="n num">{i + 1}</span>
            <div><h4>{p.t}</h4><p>{p.d}</p></div>
          </li>
        ))}
      </ol>
      <InstalarApp />
    </div>
  );
}
