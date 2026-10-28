"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TAMANHOS, avatarUrl, idade, wkg, zonasPotencia, type PerfilAtleta } from "@/lib/atleta";

// Recorta ao centro em quadrado e reduz para 512 px (JPEG).
async function fotoQuadrada(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const lado = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  c.getContext("2d")!.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.88));
}

export default function PerfilEditor({ perfil }: { perfil: PerfilAtleta }) {
  const router = useRouter();
  const s = (v: unknown) => (v == null ? "" : String(v));
  const [f, setF] = useState({
    nome: perfil.nome ?? "",
    data_nascimento: s(perfil.data_nascimento),
    peso: s(perfil.peso), altura: s(perfil.altura), ftp: s(perfil.ftp), fc_max: s(perfil.fc_max),
    localidade: s(perfil.localidade), bicicleta: s(perfil.bicicleta), bio: s(perfil.bio), strava_url: s(perfil.strava_url),
    tamanho_camisola: s(perfil.tamanho_camisola), tamanho_calcao: s(perfil.tamanho_calcao),
    mostrar_peso: !!perfil.mostrar_peso,
  });
  const [foto, setFoto] = useState<string | null>(avatarUrl(perfil.avatar_path));
  const [fotoBusy, setFotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const anos = idade(f.data_nascimento || null);
  const rel = wkg(f.ftp ? +f.ftp : null, f.peso ? +f.peso : null);

  async function trocarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFotoBusy(true); setMsg(null);
    try {
      const blob = await fotoQuadrada(file);
      const sb = createClient();
      const path = `${perfil.id}/${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from("avatares").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      const { error } = await sb.from("perfis").update({ avatar_path: path }).eq("id", perfil.id);
      if (error) { await sb.storage.from("avatares").remove([path]); throw error; }
      if (perfil.avatar_path) await sb.storage.from("avatares").remove([perfil.avatar_path]);
      setFoto(URL.createObjectURL(blob));
      router.refresh();
    } catch {
      setMsg({ ok: false, t: "Não foi possível mudar a foto. Experimenta outra imagem." });
    }
    setFotoBusy(false);
  }
  async function tirarFoto() {
    if (!perfil.avatar_path) { setFoto(null); return; }
    const sb = createClient();
    await sb.from("perfis").update({ avatar_path: null }).eq("id", perfil.id);
    await sb.storage.from("avatares").remove([perfil.avatar_path]);
    setFoto(null);
    router.refresh();
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
    const txt = (v: string) => v.trim() || null;
    let strava = txt(f.strava_url);
    if (strava && !/^https?:\/\//i.test(strava)) strava = "https://" + strava;
    const { error } = await createClient().from("perfis").update({
      nome: f.nome.trim(),
      data_nascimento: f.data_nascimento || null,
      peso: num(f.peso), altura: num(f.altura), ftp: num(f.ftp), fc_max: num(f.fc_max),
      localidade: txt(f.localidade), bicicleta: txt(f.bicicleta), bio: txt(f.bio), strava_url: strava,
      tamanho_camisola: f.tamanho_camisola || null, tamanho_calcao: f.tamanho_calcao || null,
      mostrar_peso: f.mostrar_peso,
    }).eq("id", perfil.id);
    setBusy(false);
    setMsg(error
      ? { ok: false, t: /check/i.test(error.message) ? "Algum valor está fora do intervalo esperado (ex.: FTP entre 50 e 700 W)." : "Não foi possível guardar. Tenta outra vez." }
      : { ok: true, t: "Perfil guardado." });
    if (!error) router.refresh();
  }

  return (
    <form className="perfil" onSubmit={guardar} autoComplete="off">
      <div className="panel perfil-top">
        <div className="perfil-foto">
          {foto ? <img src={foto} alt="A tua foto de perfil" /> : <span className="av" style={{ width: 96, height: 96, fontSize: 44 }}>{(f.nome || "?").charAt(0).toUpperCase()}</span>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button type="button" className="btn" disabled={fotoBusy} aria-busy={fotoBusy} onClick={() => fileRef.current?.click()}>
              {fotoBusy ? <><span className="spinner" aria-hidden="true" />A enviar…</> : foto ? "Mudar foto" : "Adicionar foto"}
            </button>
            {foto && !fotoBusy && <button type="button" className="btn ghost danger" onClick={tirarFoto}>Remover</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={trocarFoto} />
          </div>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="pNome">Nome na equipa</label>
          <input id="pNome" type="text" maxLength={40} required value={f.nome} onChange={set("nome")} />
          <span className="hint">É assim que apareces nos eventos, treinos, feed e estatísticas.</span>
        </div>
      </div>

      <fieldset className="panel perfil-sec">
        <legend>Dados de atleta</legend>
        <div className="fgrid">
          <div className="field"><label htmlFor="pNasc">Data de nascimento</label><input id="pNasc" type="date" max={new Date().toISOString().slice(0, 10)} value={f.data_nascimento} onChange={set("data_nascimento")} />{anos != null && <span className="hint">{anos} anos</span>}</div>
          <div className="field"><label htmlFor="pFtp">FTP (W)</label><input id="pFtp" type="number" inputMode="numeric" min={50} max={700} value={f.ftp} onChange={set("ftp")} placeholder="ex.: 250" /></div>
          <div className="field"><label htmlFor="pPeso">Peso (kg)</label><input id="pPeso" type="number" inputMode="decimal" min={25} max={250} step={0.1} value={f.peso} onChange={set("peso")} />{rel != null && <span className="hint"><b className="num">{rel.toFixed(2)}</b> W/kg</span>}</div>
          <div className="field"><label htmlFor="pFc">FC máxima (bpm)</label><input id="pFc" type="number" inputMode="numeric" min={100} max={230} value={f.fc_max} onChange={set("fc_max")} /></div>
          <div className="field"><label htmlFor="pAlt">Altura (cm)</label><input id="pAlt" type="number" inputMode="numeric" min={100} max={230} value={f.altura} onChange={set("altura")} /></div>
          <label className="check" style={{ alignSelf: "end" }}><input type="checkbox" checked={f.mostrar_peso} onChange={set("mostrar_peso")} /><span>Mostrar o peso à equipa</span></label>
        </div>
        <p className="hint" style={{ margin: 0 }}>A equipa vê a tua idade, FTP, W/kg, FC máxima e altura. O peso só aparece se marcares a opção acima.</p>
        {f.ftp && +f.ftp >= 50 && (
          <details className="zonas">
            <summary>Ver as tuas zonas de potência</summary>
            <table>
              <tbody>
                {zonasPotencia(+f.ftp).map((z) => (
                  <tr key={z.nome}><td>{z.nome}</td><td className="r num">{z.ate ? `${z.de}–${z.ate} W` : `> ${z.de} W`}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </fieldset>

      <fieldset className="panel perfil-sec">
        <legend>Sobre ti</legend>
        <div className="fgrid">
          <div className="field"><label htmlFor="pLoc">Localidade</label><input id="pLoc" type="text" maxLength={60} value={f.localidade} onChange={set("localidade")} /></div>
          <div className="field"><label htmlFor="pBike">Bicicleta</label><input id="pBike" type="text" maxLength={80} placeholder="ex.: Canyon Ultimate CF SL" value={f.bicicleta} onChange={set("bicicleta")} /></div>
          <div className="field full"><label htmlFor="pBio">Apresentação</label><textarea id="pBio" maxLength={400} rows={3} placeholder="Há quanto tempo pedalas, que provas gostas…" value={f.bio} onChange={set("bio")} /></div>
          <div className="field full"><label htmlFor="pStrava">Perfil do Strava</label><input id="pStrava" type="url" inputMode="url" maxLength={200} placeholder="strava.com/athletes/…" value={f.strava_url} onChange={set("strava_url")} /></div>
        </div>
      </fieldset>

      <fieldset className="panel perfil-sec">
        <legend>Equipamento</legend>
        <div className="fgrid">
          <div className="field"><label htmlFor="pCam">Tamanho da camisola</label><select id="pCam" value={f.tamanho_camisola} onChange={set("tamanho_camisola")}><option value="">—</option>{TAMANHOS.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label htmlFor="pCal">Tamanho dos calções</label><select id="pCal" value={f.tamanho_calcao} onChange={set("tamanho_calcao")}><option value="">—</option>{TAMANHOS.map((t) => <option key={t}>{t}</option>)}</select></div>
        </div>
        <p className="hint" style={{ margin: 0 }}>Ajuda a equipa a fazer as encomendas de equipamento.</p>
      </fieldset>

      <div className="perfil-save">
        {msg && <span className={msg.ok ? "ok-msg" : "notice"}>{msg.t}</span>}
        <button className="btn primary" disabled={busy} aria-busy={busy}>{busy ? <><span className="spinner" aria-hidden="true" />A guardar…</> : "Guardar perfil"}</button>
      </div>
    </form>
  );
}
