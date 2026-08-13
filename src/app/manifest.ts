import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jogaê — seu fut, sem enrolação",
    short_name: "Jogaê",
    description:
      "Organize o fut, monte times equilibrados e acompanhe o jogo sem tirar a galera do WhatsApp.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090A0C",
    theme_color: "#090A0C",
    lang: "pt-BR",
    categories: ["sports", "productivity"],
    // PNGs gerados por `npm run icones` a partir da geometria do JogaeMark.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
