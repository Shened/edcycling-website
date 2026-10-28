import type { MetadataRoute } from "next";

// Faz do site uma app instalável no telemóvel.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EDCycling",
    short_name: "EDCycling",
    description: "Eventos, treinos, fotos e estatísticas da equipa EDCycling.",
    id: "/",
    start_url: "/eventos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#052F42",
    theme_color: "#052F42",
    lang: "pt-PT",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Eventos", url: "/eventos" },
      { name: "Treinos", url: "/treinos" },
      { name: "Fotos", url: "/fotos" },
    ],
  };
}
