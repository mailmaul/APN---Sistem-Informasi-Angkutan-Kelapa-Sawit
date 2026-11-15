"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { withBasePath } from "@/lib/base-path";

// Pelacakan lokasi supir.
//
// Dua tugas: (1) merekam jejak perjalanan saat status MENUJU_*, (2) menyediakan
// titik terkini untuk dilampirkan ke setiap perpindahan status.
//
// Catatan implementasi: dukungan browser dibaca lewat useSyncExternalStore,
// bukan setState di dalam effect. Dengan begitu nilai saat render server (false)
// dan render klien tidak pernah bentrok, dan tidak ada render ganda sia-sia.

export type KondisiGps = "tidak-didukung" | "siaga" | "menunggu" | "aktif" | "ditolak" | "galat";

export type Titik = { lat: number; lng: number; akurasi?: number };

/** Jarak minimal antar pengiriman titik ke server. */
const JEDA_KIRIM_MS = 20_000;
/** Umur titik yang masih boleh dipakai ulang tanpa menembak GPS lagi. */
const UMUR_SEGAR_MS = 60_000;

function tanpaLangganan() {
  return () => {};
}
function bacaDukungan() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}
function dukunganDiServer() {
  return false;
}

export function gunakanGps({ ritId, lacak }: { ritId: string; lacak: boolean }) {
  const didukung = useSyncExternalStore(tanpaLangganan, bacaDukungan, dukunganDiServer);

  // Hanya hasil dari callback asinkron yang disimpan sebagai state.
  const [hasil, setHasil] = useState<"aktif" | "ditolak" | "galat" | null>(null);
  const [titik, setTitik] = useState<Titik | null>(null);

  const titikRef = useRef<{ titik: Titik; waktu: number } | null>(null);
  const kirimTerakhir = useRef(0);

  useEffect(() => {
    if (!didukung || !lacak) return;
    let batal = false;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (batal) return;
        const baru: Titik = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          akurasi: pos.coords.accuracy,
        };
        titikRef.current = { titik: baru, waktu: Date.now() };
        setTitik(baru);
        setHasil("aktif");

        const sekarang = Date.now();
        if (sekarang - kirimTerakhir.current < JEDA_KIRIM_MS) return;
        kirimTerakhir.current = sekarang;

        // Jejak GPS bersifat best effort: gagal kirim tidak boleh mengganggu
        // supir, tinggal dicoba lagi pada titik berikutnya.
        fetch(withBasePath(`/api/rit/${ritId}/track`), {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...baru, waktu: new Date().toISOString() }),
          keepalive: true,
        }).catch(() => {
          kirimTerakhir.current = 0;
        });
      },
      (err) => {
        if (batal) return;
        setHasil(err.code === err.PERMISSION_DENIED ? "ditolak" : "galat");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
    );

    return () => {
      batal = true;
      navigator.geolocation.clearWatch(id);
    };
  }, [didukung, lacak, ritId]);

  /** Titik untuk dilampirkan ke perpindahan status. null kalau lokasi tidak tersedia. */
  const ambilTitik = useCallback(async (): Promise<Titik | null> => {
    if (!didukung) return null;
    const tersimpan = titikRef.current;
    if (tersimpan && Date.now() - tersimpan.waktu < UMUR_SEGAR_MS) return tersimpan.titik;

    const { promise, resolve } = Promise.withResolvers<Titik | null>();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const baru: Titik = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          akurasi: pos.coords.accuracy,
        };
        titikRef.current = { titik: baru, waktu: Date.now() };
        setTitik(baru);
        resolve(baru);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setHasil("ditolak");
        // Lokasi tidak wajib ada — status tetap boleh berpindah tanpa titik.
        resolve(tersimpan?.titik ?? null);
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
    );
    return promise;
  }, [didukung]);

  const kondisi: KondisiGps = !didukung
    ? "tidak-didukung"
    : hasil === "ditolak"
      ? "ditolak"
      : lacak
        ? (hasil ?? "menunggu")
        : titik
          ? "aktif"
          : "siaga";

  return { kondisi, titik, ambilTitik, didukung };
}
