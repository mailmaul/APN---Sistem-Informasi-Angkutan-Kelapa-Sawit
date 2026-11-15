import { NextResponse } from "next/server";
import { withBasePath } from "@/lib/base-path";

// Manifest dibuat lewat route (bukan berkas statis) supaya basePath "/apn"
// ikut terpasang di start_url, scope, dan ikon. Salah satu saja keliru, PWA
// tidak mau dipasang ke home screen.

export async function GET() {
  const manifest = {
    name: "APN — Sistem Angkutan",
    short_name: "APN Supir",
    description: "Tugas angkutan, foto slip timbang, dan lapor kendala untuk supir APN",
    lang: "id",
    dir: "ltr",
    start_url: withBasePath("/supir"),
    scope: withBasePath("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    categories: ["business", "productivity"],
    icons: [
      {
        src: withBasePath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-192-maskable.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: withBasePath("/icons/icon-512-maskable.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tugas sekarang",
        url: withBasePath("/supir"),
        icons: [{ src: withBasePath("/icons/icon-192.png"), sizes: "192x192" }],
      },
      { name: "Riwayat rit", url: withBasePath("/supir/riwayat") },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
