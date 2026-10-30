"use client";
import { useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { idade, wkg, type PerfilAtleta } from "@/lib/atleta";

export default function AtletasLista({ atletas, euId }: { atletas: PerfilAtleta[]; euId: string }) {
  const [q, setQ] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = atletas.filter((a) => !q || norm(`${a.nome} ${a.localidade ?? ""} ${a.bicicleta ?? ""} ${a.bicicleta_btt ?? ""} ${a.bicicleta_cx ?? ""}`).includes(norm(q)));
  return (
    <section className="view">
      <div className="sechead">
        <h2>Atletas</h2>
        <span className="empty"><span className="num">{atletas.length}</span> atleta{atletas.length === 1 ? "" : "s"} na equipa</span>
      </div>
      {atletas.length > 6 && (
        <input type="text" placeholder="Procurar por nome, localidade ou bicicleta…" aria-label="Procurar atleta" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 420, width: "100%" }} />
      )}
      <div className="atl-grid">
        {lista.map((a) => {
          const anos = idade(a.data_nascimento);
          const rel = wkg(a.ftp, a.peso);
          const sub = [a.localidade, anos != null ? `${anos} anos` : null].filter(Boolean).join(" · ");
          return (
            <Link key={a.id} href={`/atletas/${a.id}`} className="atl-card">
              <Avatar nome={a.nome} path={a.avatar_path} size={64} />
              <span className="atl-n">{a.nome}{a.id === euId && <span className="pill admin" style={{ marginLeft: 6 }}>tu</span>}</span>
              {sub && <span className="atl-s">{sub}</span>}
              {(a.ftp || rel) && (
                <span className="atl-f">
                  {a.ftp ? <span><b className="num">{a.ftp}</b> W</span> : null}
                  {rel ? <span><b className="num">{rel.toFixed(1)}</b> W/kg</span> : null}
                </span>
              )}
              {[a.bicicleta, a.bicicleta_btt, a.bicicleta_cx].filter(Boolean).map((b) => <span key={b} className="atl-b">{b}</span>)}
            </Link>
          );
        })}
        {!lista.length && <p className="empty">Ninguém encontrado.</p>}
      </div>
    </section>
  );
}
