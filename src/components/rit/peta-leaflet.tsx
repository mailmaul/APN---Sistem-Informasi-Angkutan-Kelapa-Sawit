"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import "leaflet/dist/leaflet.css";

// Semua isi berkas ini menyentuh `window` saat diimpor (Leaflet), jadi hanya
// boleh dimuat lewat next/dynamic dengan ssr:false dari peta-jejak.tsx.
// Penanda sengaja memakai CircleMarker (SVG) supaya tidak bergantung pada
// berkas ikon Leaflet yang jalurnya rusak saat di-bundle.

export type TitikJejak = { lat: number; lng: number; waktu: Date; leg: string };
export type TitikTetap = { lat: number; lng: number; nama: string; jenis: "ASAL" | "TUJUAN" };

const WARNA_LEG: Record<string, string> = {
  MENUJU_MUAT: "#0891b2",
  MENUJU_BONGKAR: "#0f766e",
};

export function PetaLeaflet({
  jejak,
  tetap,
  tinggi = 280,
}: {
  jejak: TitikJejak[];
  tetap: TitikTetap[];
  tinggi?: number;
}) {
  const semua: [number, number][] = [
    ...jejak.map((t) => [t.lat, t.lng] as [number, number]),
    ...tetap.map((t) => [t.lat, t.lng] as [number, number]),
  ];

  const lat = semua.map((p) => p[0]);
  const lng = semua.map((p) => p[1]);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lat), Math.min(...lng)],
    [Math.max(...lat), Math.max(...lng)],
  ];
  const satuTitik = semua.length === 1 || (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]);

  const legs = Array.from(new Set(jejak.map((t) => t.leg)));

  return (
    <MapContainer
      {...(satuTitik ? { center: semua[0], zoom: 13 } : { bounds, boundsOptions: { padding: [24, 24] } })}
      scrollWheelZoom={false}
      style={{ height: tinggi, width: "100%" }}
      className="z-0 overflow-hidden rounded-md"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {legs.map((leg) => (
        <Polyline
          key={leg}
          positions={jejak.filter((t) => t.leg === leg).map((t) => [t.lat, t.lng] as [number, number])}
          pathOptions={{ color: WARNA_LEG[leg] ?? "#64748b", weight: 4, opacity: 0.85 }}
        />
      ))}

      {tetap.map((t) => (
        <CircleMarker
          key={`${t.jenis}-${t.nama}`}
          center={[t.lat, t.lng]}
          radius={7}
          pathOptions={{
            color: t.jenis === "ASAL" ? "#d97706" : "#16a34a",
            fillColor: t.jenis === "ASAL" ? "#d97706" : "#16a34a",
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Tooltip>
            {t.jenis === "ASAL" ? "Muat" : "Bongkar"}: {t.nama}
          </Tooltip>
        </CircleMarker>
      ))}

      {jejak.length > 0 && (
        <CircleMarker
          center={[jejak[jejak.length - 1].lat, jejak[jejak.length - 1].lng]}
          radius={5}
          pathOptions={{ color: "#0f172a", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}
        >
          <Tooltip>
            Titik terakhir ·{" "}
            {format(jejak[jejak.length - 1].waktu, "d MMM HH:mm", { locale: localeId })}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
