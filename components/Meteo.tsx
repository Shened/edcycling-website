"use client";
import { useEffect, useState } from "react";

// Previsão do tempo (Open-Meteo, gratuito e sem chave) para a hora de saída de um evento ou treino.
// Só aparece até 15 dias antes; o local vem do percurso (GPX), do ponto de encontro ou, em último caso, Gondomar.

const GONDOMAR = { lat: 41.1394, lon: -8.5325, nome: "Gondomar" };
const WMO: Record<number, [string, string]> = {
  0: ["☀️", "Céu limpo"], 1: ["🌤️", "Pouco nublado"], 2: ["⛅", "Parcialmente nublado"], 3: ["☁️", "Nublado"],
  45: ["🌫️", "Nevoeiro"], 48: ["🌫️", "Nevoeiro com geada"],
  51: ["🌦️", "Chuvisco fraco"], 53: ["🌦️", "Chuvisco"], 55: ["🌧️", "Chuvisco forte"], 56: ["🌧️", "Chuvisco gelado"], 57: ["🌧️", "Chuvisco gelado"],
  61: ["🌦️", "Chuva fraca"], 63: ["🌧️", "Chuva"], 65: ["🌧️", "Chuva forte"], 66: ["🌧️", "Chuva gelada"], 67: ["🌧️", "Chuva gelada"],
  71: ["🌨️", "Neve fraca"], 73: ["🌨️", "Neve"], 75: ["❄️", "Neve forte"], 77: ["🌨️", "Grãos de neve"],
  80: ["🌦️", "Aguaceiros"], 81: ["🌧️", "Aguaceiros"], 82: ["⛈️", "Aguaceiros fortes"], 85: ["🌨️", "Aguaceiros de neve"], 86: ["🌨️", "Aguaceiros de neve"],
  95: ["⛈️", "Trovoada"], 96: ["⛈️", "Trovoada com granizo"], 99: ["⛈️", "Trovoada com granizo"],
};

interface Previsao { local: string; icone: string; texto: string; temp: number; chuva: number; vento: number; min: number; max: number; hora: string }

const hojeIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
const diasAte = (d: string) => Math.round((new Date(d + "T12:00:00").getTime() - new Date(hojeIso() + "T12:00:00").getTime()) / 864e5);

async function local(partida?: string | null, trajeto?: [number, number][] | null) {
  if (trajeto?.length) return { lat: trajeto[0][0], lon: trajeto[0][1], nome: partida || "início do percurso" };
  if (partida && partida.trim().length > 2) {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(partida.trim())}&count=1&language=pt&countryCode=PT`);
      const j = await r.json();
      const g = j?.results?.[0];
      if (g) return { lat: g.latitude as number, lon: g.longitude as number, nome: g.name as string };
    } catch { /* usa Gondomar */ }
  }
  return GONDOMAR;
}

export default function Meteo({ data, hora, partida, trajeto }: { data: string | null; hora?: string | null; partida?: string | null; trajeto?: [number, number][] | null }) {
  const [p, setP] = useState<Previsao | null | "erro">(null);
  const dias = data ? diasAte(data) : -1;
  const visivel = !!data && dias >= 0 && dias <= 15;

  useEffect(() => {
    if (!visivel || !data) return;
    const chave = `edc-meteo:${data}:${hora ?? ""}:${partida ?? ""}:${trajeto?.[0]?.join(",") ?? ""}`;
    try {
      const c = sessionStorage.getItem(chave);
      if (c) { const o = JSON.parse(c); if (Date.now() - o.t < 3 * 3600e3) { setP(o.p); return; } }
    } catch { /* sem cache */ }
    let vivo = true;
    (async () => {
      try {
        const l = await local(partida, trajeto);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=temperature_2m_min,temperature_2m_max&timezone=Europe%2FLisbon&start_date=${data}&end_date=${data}`;
        const j = await (await fetch(url)).json();
        const h = (hora ?? "09:00").slice(0, 2);
        const i = Math.max(0, (j.hourly?.time as string[] ?? []).findIndex((t) => t.slice(11, 13) === h));
        const code = j.hourly.weather_code[i] as number;
        const prev: Previsao = {
          local: l.nome, icone: WMO[code]?.[0] ?? "🌡️", texto: WMO[code]?.[1] ?? "Previsão",
          temp: Math.round(j.hourly.temperature_2m[i]), chuva: j.hourly.precipitation_probability[i] ?? 0, vento: Math.round(j.hourly.wind_speed_10m[i]),
          min: Math.round(j.daily.temperature_2m_min[0]), max: Math.round(j.daily.temperature_2m_max[0]), hora: `${h}:00`,
        };
        if (!vivo) return;
        setP(prev);
        try { sessionStorage.setItem(chave, JSON.stringify({ t: Date.now(), p: prev })); } catch { /* nada */ }
      } catch { if (vivo) setP("erro"); }
    })();
    return () => { vivo = false; };
  }, [visivel, data, hora, partida, trajeto]);

  if (!visivel || p === "erro") return null;
  if (!p) return <div className="meteo carregar" aria-hidden="true" />;
  return (
    <div className="meteo" role="group" aria-label="Previsão do tempo">
      <span className="meteo-ico" aria-hidden="true">{p.icone}</span>
      <div className="meteo-t">
        <b>{p.texto}, {p.temp}°C às {p.hora}</b>
        <span>Chuva {p.chuva}% · vento {p.vento} km/h · mín. {p.min}° máx. {p.max}°</span>
        <span className="meteo-f">Previsão para {p.local}{dias > 7 ? " (ainda longe; pode mudar)" : ""} · Open-Meteo</span>
      </div>
    </div>
  );
}
