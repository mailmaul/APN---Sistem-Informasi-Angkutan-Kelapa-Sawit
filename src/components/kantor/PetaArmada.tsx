"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import { STATUS_RIT_LABEL, STATUS_RIT_WARNA } from "@/lib/constants";
import type { TitikArmada } from "@/lib/statistik";
import { formatJam } from "./format";

// Peta posisi armada. WAJIB dimuat lewat next/dynamic dengan ssr:false —
// Leaflet menyentuh `window` saat modulnya dievaluasi.
//
// Marker memakai CircleMarker (vektor) supaya tidak perlu berkas ikon PNG
// bawaan Leaflet yang rusak kalau dibundel.

/**
 * Warna titik mengikuti warna semantik status rit. Nilainya hex, bukan
 * var(--...), karena Leaflet menulis warna ke atribut SVG.
 */
const HEX: Record<string, string> = {
  netral: "#64748b",
  info: "#2563eb",
  accent: "#0f766e",
  peringatan: "#d97706",
  oranye: "#ea580c",
  sukses: "#16a34a",
  bahaya: "#dc2626",
};

/** Sumatera Utara — tampilan awal saat belum ada satu pun titik GPS. */
const PUSAT_BAKU: [number, number] = [3.0, 99.1];

function AturTampilan({ titik }: { titik: TitikArmada[] }) {
  const peta = useMap();

  useEffect(() => {
    if (titik.length === 0) return;
    if (titik.length === 1) {
      peta.setView([titik[0].lat, titik[0].lng], 11);
      return;
    }
    peta.fitBounds(
      titik.map((t) => [t.lat, t.lng] as [number, number]),
      { padding: [32, 32], maxZoom: 12 },
    );
  }, [peta, titik]);

  return null;
}

export default function PetaArmada({ titik }: { titik: TitikArmada[] }) {
  return (
    <MapContainer
      center={PUSAT_BAKU}
      zoom={8}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "transparent" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <AturTampilan titik={titik} />
      {titik.map((t) => {
        const warna = HEX[STATUS_RIT_WARNA[t.status]] ?? HEX.netral;
        return (
          <CircleMarker
            key={t.ritId}
            center={[t.lat, t.lng]}
            radius={7}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: warna, fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {t.nopol} · {STATUS_RIT_LABEL[t.status]}
            </Tooltip>
            <Popup>
              <span className="block text-sm font-medium">{t.noDo}</span>
              <span className="block text-xs">
                {t.nopol} · {t.supir}
              </span>
              <span className="block text-xs">{STATUS_RIT_LABEL[t.status]}</span>
              <span className="block text-xs text-slate-500">
                Titik terakhir {formatJam(t.waktu)}
              </span>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
