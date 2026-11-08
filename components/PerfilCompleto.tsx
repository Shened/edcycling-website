import Link from "next/link";
import type { Completude } from "@/lib/completo";

// Barra "Perfil completo" com o que falta. Na página inicial só aparece até chegar aos 100%.
export default function PerfilCompleto({ c, compacto }: { c: Completude; compacto?: boolean }) {
  const falta = c.itens.filter((i) => !i.feito);
  const cheio = c.pct === 100;
  return (
    <section className={`pcomp${cheio ? " cheio" : ""}${compacto ? " compacto" : ""}`} aria-labelledby="pcompT">
      <div className="pcomp-h">
        <h3 id="pcompT">{cheio ? "Perfil completo ✓" : "Completa o teu perfil"}</h3>
        <span className="pcomp-pct num">{c.pct}%</span>
      </div>
      <div className="pcomp-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.pct} aria-label="Perfil completo">
        <span style={{ width: `${c.pct}%` }} />
      </div>
      {cheio ? <p className="hint" style={{ margin: 0 }}>Tens tudo preenchido e ligado. Obrigado!</p> : (
        <ul className="pcomp-l">
          {(compacto ? falta.slice(0, 3) : falta).map((i) => (
            <li key={i.k}>
              <Link href={i.href}><b>{i.label}</b><span>{i.dica}</span></Link>
            </li>
          ))}
          {compacto && falta.length > 3 && <li className="pcomp-mais"><Link href="/perfil">E mais {falta.length - 3} →</Link></li>}
        </ul>
      )}
    </section>
  );
}
