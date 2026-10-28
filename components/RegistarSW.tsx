"use client";
import { useEffect } from "react";

// Regista o service worker (só em produção, para não atrapalhar o npm run dev).
export default function RegistarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
