import type { MetadataRoute } from "next";

// PWA manifestosu: uygulama ana ekrana "gerçek uygulama" gibi kurulur —
// ikon, tam ekran, bildirim. iOS'ta push için ana ekrana ekleme şarttır.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liderlik Aynası",
    short_name: "AYNA",
    description: "Kampı yöneten yapay zekâ — kendini başkalarının gözünden gör.",
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["lifestyle", "education", "productivity"],
    background_color: "#06121e",
    theme_color: "#06121e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Maskable: dolu lacivert zeminli ikon — Android adaptive ikon kırpmasında
      // logo boş/şeffaf görünmesin diye ayrı dosya (şeffaf köşe yok).
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
