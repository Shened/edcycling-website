import { avatarUrl } from "@/lib/atleta";

// Foto de perfil ou, sem foto, a inicial do nome no degradê da equipa.
export default function Avatar({ nome, path, size = 36 }: { nome: string; path?: string | null; size?: number }) {
  const url = avatarUrl(path);
  const st = { width: size, height: size, fontSize: Math.round(size * 0.5) };
  return url
    ? <img className="av av-img" src={url} alt="" width={size} height={size} style={st} loading="lazy" />
    : <span className="av" aria-hidden="true" style={st}>{(nome || "?").trim().charAt(0).toUpperCase()}</span>;
}
