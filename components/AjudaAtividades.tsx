"use client";
import { useState } from "react";
import Link from "next/link";

type App = "strava" | "garmin" | "outras";

const PASSOS: Record<App, { t: React.ReactNode; d: React.ReactNode }[]> = {
  strava: [
    { t: "O mais fácil: liga o Strava", d: <>Em <Link href="/definicoes">Definições</Link>, toca em <b>Ligar ao Strava</b> (só uma vez). Depois, em <b>+ Atividade</b>, escolhe <b>Importar do Strava</b> e marca as atividades que queres. Funciona no telemóvel e não precisas de ficheiros. Se preferires exportar o ficheiro, segue os passos abaixo.</> },
    { t: "Abre o Strava no browser", d: <>A app do Strava não exporta ficheiros. Abre <b>strava.com</b> no computador, ou no browser do telemóvel com a opção <b>Ver versão para computador</b>.</> },
    { t: "Abre a tua atividade", d: <>Em <b>O meu perfil</b> ou no feed, carrega no título da atividade. Só consegues exportar atividades tuas.</> },
    { t: "Carrega nos três pontos ⋯", d: <>Estão na coluna da esquerda, junto aos ícones da atividade.</> },
    { t: "Escolhe o ficheiro", d: <><b>Exportar GPX</b> serve para voltas com GPS. <b>Exportar original</b> dá o ficheiro do relógio (muitas vezes um <b>.fit</b>), que é o melhor para natação em piscina.</> },
  ],
  garmin: [
    { t: "Abre o Garmin Connect no browser", d: <>Entra em <b>connect.garmin.com</b> no computador. A app do telemóvel não deixa exportar.</> },
    { t: "Abre a atividade", d: <>Em <b>Atividades</b>, escolhe a que queres e abre-a.</> },
    { t: "Carrega na engrenagem ⚙", d: <>Fica no canto superior direito da atividade.</> },
    { t: "Exporta o ficheiro", d: <><b>Exportar original</b> descarrega um <b>.zip</b>: abre-o e tira de lá o <b>.fit</b> (no iPhone, carrega no .zip na app Ficheiros; no Android, na app de ficheiros). Também há <b>Exportar para GPX</b>.</> },
  ],
  outras: [
    { t: "Komoot, Wahoo, Coros, Polar, Suunto…", d: <>Quase todas têm uma opção <b>Exportar</b> ou <b>Descarregar GPX</b> no menu da atividade, normalmente no site e não na app.</> },
    { t: "Ligadas ao Strava", d: <>Se o teu relógio ou app já envia as atividades para o Strava, o mais simples é exportar a partir do Strava (separador ao lado).</> },
    { t: "Apple Watch e rolo", d: <>Os treinos do Apple Watch ou do rolo (Zwift, etc.) que vão para o Strava exportam-se de lá. Sem ficheiro, podes sempre registar à mão.</> },
  ],
};

export default function AjudaAtividades() {
  const [app, setApp] = useState<App>("strava");
  return (
    <div className="ajuda-inst">
      <div className="seg" role="tablist" aria-label="De onde vem a atividade">
        {([["strava", "Strava"], ["garmin", "Garmin"], ["outras", "Outras apps"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={app === k} aria-pressed={app === k} onClick={() => setApp(k)}>{l}</button>
        ))}
      </div>
      <ol className="passos">
        {PASSOS[app].map((p, i) => (
          <li key={i}>
            <span className="n num">{i + 1}</span>
            <div><h4>{p.t}</h4><p>{p.d}</p></div>
          </li>
        ))}
      </ol>
      <div className="panel ajuda-depois">
        <h4>Depois, no site</h4>
        <p>Abre o teu perfil de atleta (menu do avatar, <b>O meu perfil</b>, e depois <b>As tuas atividades</b>) ou carrega num dia passado em <Link href="/treinos">Treinos</Link>. Escolhe <b>Adicionar atividade</b> e carrega o <b>.gpx</b> ou o <b>.fit</b>: a distância, o tempo, o desnível e o tipo são preenchidos sozinhos. Se não tiveres ficheiro, escreve os valores à mão.</p>
        <p className="hint" style={{ margin: 0 }}>Os menus do Strava e do Garmin mudam de vez em quando; se não encontrares a opção, procura por “Exportar” no menu da atividade.</p>
      </div>
    </div>
  );
}
