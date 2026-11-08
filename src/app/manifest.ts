import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Journal numérique des publications d'éducation physique et sportive repérées sur les sites académiques français.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f4f6f5",
    theme_color: "#0f766e",
    lang: "fr",
    dir: "ltr",
    categories: ["education", "news"],
    launch_handler: { client_mode: "navigate-existing" },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Recherche",
        short_name: "Recherche",
        description: "Rechercher une publication",
        url: "/recherche",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Marques-pages",
        short_name: "Marques-pages",
        description: "Publications enregistrées sur cet appareil",
        url: "/favoris",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Ma veille",
        short_name: "Veille",
        description: "Publications des académies et thèmes suivis",
        url: "/veille",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
