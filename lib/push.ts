"use client";
// Notificações push no browser: saber o estado neste dispositivo e ativá-las.
import { createClient } from "@/lib/supabase/client";

export type EstadoPush = "?" | "sem-suporte" | "ios-instalar" | "bloqueado" | "desligado" | "ligado" | "sem-chave";

export function b64ToUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registo(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

export async function estadoPush(vapid: string): Promise<EstadoPush> {
  try {
    if (!vapid) return "sem-chave";
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !standalone ? "ios-instalar" : "sem-suporte";
    if (Notification.permission === "denied") return "bloqueado";
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "ligado" : "desligado";
  } catch { return "sem-suporte"; }
}

/** Pede autorização, subscreve e guarda a subscrição. Devolve o novo estado (lança erro se falhar). */
export async function ativarPush(userId: string, vapid: string): Promise<EstadoPush> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "bloqueado" : "desligado";
  const reg = await registo();
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapid) as BufferSource });
  const j = sub.toJSON();
  const { error } = await createClient().from("push_subscricoes").upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "", dispositivo: navigator.userAgent.slice(0, 200) },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return "ligado";
}
