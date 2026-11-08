"use client";
import { useCallback, useState } from "react";
import { useEsc } from "./useEsc";
import { marcar } from "@/lib/metricas";

const ICONE = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>;

/** Janela com a mensagem pronta: copiar para colar no grupo, ou abrir o WhatsApp já com o texto. */
export function JanelaWhatsApp({ texto: inicial, onClose }: { texto: string; onClose: () => void }) {
  const [texto, setTexto] = useState(inicial);
  const [copiado, setCopiado] = useState(false);
  const fechar = useCallback(() => onClose(), [onClose]);
  useEsc(true, fechar);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); marcar("WhatsApp", { acao: "copiar" }); setTimeout(() => setCopiado(false), 2500); }
    catch { setCopiado(false); }
  }
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="waT">
        <div className="stripe" />
        <div className="mbody">
          <div>
            <p className="eyebrow" style={{ color: "var(--muted)" }}>Partilhar no grupo</p>
            <h3 id="waT">Mensagem para o WhatsApp</h3>
          </div>
          <label htmlFor="waTexto" className="sr-only">Mensagem</label>
          <textarea id="waTexto" className="wa-texto" rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <p className="hint" style={{ margin: 0 }}>Podes mudar o texto. O link abre o evento no site, onde cada um diz se vai.</p>
          <div className="wa-acoes">
            <button type="button" className="btn primary" onClick={copiar}>{copiado ? "Copiado ✓ Cola no grupo" : "Copiar mensagem"}</button>
            <a className="btn wa-abrir" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" onClick={() => marcar("WhatsApp", { acao: "abrir" })}>{ICONE} Abrir no WhatsApp</a>
            <button type="button" className="btn ghost" onClick={fechar}>Fechar</button>
          </div>
          <p className="sr-only" aria-live="polite">{copiado ? "Mensagem copiada" : ""}</p>
        </div>
      </div>
    </div>
  );
}

/** Botão "Partilhar no WhatsApp". O texto é gerado só quando se carrega (precisa do endereço do site). */
export default function BotaoWhatsApp({ gerar, compacto }: { gerar: (origem: string) => string; compacto?: boolean }) {
  const [texto, setTexto] = useState<string | null>(null);
  return (
    <>
      <button type="button" className={`btn wa-btn${compacto ? " compacto" : ""}`} onClick={() => setTexto(gerar(window.location.origin))}>
        {ICONE}<span>{compacto ? "WhatsApp" : "Partilhar no WhatsApp"}</span>
      </button>
      {texto !== null && <JanelaWhatsApp texto={texto} onClose={() => setTexto(null)} />}
    </>
  );
}
