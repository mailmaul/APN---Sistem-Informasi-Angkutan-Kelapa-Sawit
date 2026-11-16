"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPinOff, RefreshCw, Satellite, Smartphone, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiJson } from "@/lib/api-client";
import { STATUS_RIT_LABEL } from "@/lib/constants";
import type { BarisSupirApp, NadaStatus, StatusAplikasiSupir } from "@/lib/aplikasi-supir";
import { formatAngka } from "@/lib/perhitungan";
import { formatJam, formatTanggalJam } from "./format";
import { KartuKpi } from "./KartuKpi";

// Pemantauan perangkat supir. Yang dibaca adalah jejak yang benar-benar sampai
// ke server; aplikasi yang dibunuh sistem terlihat dari diamnya, bukan dari
// laporannya sendiri.

const JEDA_SEGAR_MS = 30_000;

const WARNA_NADA: Record<NadaStatus, string> = {
  sukses: "bg-sukses",
  peringatan: "bg-peringatan",
  bahaya: "bg-bahaya",
  netral: "bg-muted-foreground",
};

function Baris({ supir }: { supir: BarisSupirApp }) {
  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className={`size-2 shrink-0 rounded-full ${WARNA_NADA[supir.nada]}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {supir.nama}
            {!supir.aktif && <span className="ml-2 text-xs text-muted-foreground">nonaktif</span>}
          </p>
          <p className="angka truncate text-xs text-muted-foreground">{supir.hp}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {supir.rit ? (
          <Link href={`/rit/${supir.rit.id}`} className="group block min-w-0">
            <p className="angka truncate text-sm group-hover:underline">{supir.rit.noDo}</p>
            <p className="truncate text-xs text-muted-foreground">
              {STATUS_RIT_LABEL[supir.rit.status]}
              {supir.rit.nopol ? ` · ${supir.rit.nopol}` : ""}
            </p>
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground">Tidak ada rit berjalan</p>
        )}
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {supir.rit?.sedangJalan && supir.nada === "bahaya" ? (
            <MapPinOff className="size-3.5 text-bahaya" />
          ) : (
            <Satellite className="size-3.5" />
          )}
          <span className="angka">
            {supir.gpsTerakhir ? `${supir.jedaGpsMenit} mnt lalu` : "belum ada titik"}
          </span>
        </span>
        <span className="angka text-xs text-muted-foreground">
          {formatAngka(supir.titik24Jam)} titik/24j
        </span>
        {supir.bolongTerlamaMenit !== null && supir.bolongTerlamaMenit >= 10 && (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <TriangleAlert className="size-3 text-peringatan" />
            bolong {supir.bolongTerlamaMenit} mnt
          </Badge>
        )}
        {supir.kendalaTerbuka > 0 && (
          <Badge variant="outline" className="gap-1 border-bahaya/40 text-[11px] text-bahaya">
            {supir.kendalaTerbuka} kendala
          </Badge>
        )}
      </div>

      <div className="min-w-0 flex-1 sm:text-right">
        <p className="line-clamp-2 text-xs text-muted-foreground">{supir.catatan}</p>
        <p className="angka truncate text-[11px] text-muted-foreground">
          aksi terakhir: {formatTanggalJam(supir.aksiTerakhir?.waktu)}
        </p>
      </div>
    </div>
  );
}

export function StatusAplikasiSupirPanel({ awal }: { awal: StatusAplikasiSupir }) {
  const [data, setData] = useState(awal);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    let batal = false;

    async function segarkan() {
      try {
        const baru = await apiJson<StatusAplikasiSupir>("/api/aplikasi-supir");
        if (batal) return;
        setData(baru);
        setGagal(false);
      } catch {
        // Data lama tetap ditampilkan; hanya penanda waktunya yang diberi tanda.
        if (!batal) setGagal(true);
      }
    }

    const pewaktu = setInterval(segarkan, JEDA_SEGAR_MS);
    return () => {
      batal = true;
      clearInterval(pewaktu);
    };
  }, []);

  const { ringkasan } = data;
  const bermasalah = data.supir.filter((s) => s.nada === "bahaya");
  const lainnya = data.supir.filter((s) => s.nada !== "bahaya");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuKpi
          judul="Supir memakai app"
          nilai={`${ringkasan.supirPakaiHariIni}/${ringkasan.supirTotal}`}
          ikon={Smartphone}
          keterangan={`${ringkasan.supirSunyi} supir tanpa aksi dalam 24 jam`}
        />
        <KartuKpi
          judul="Rit berjalan"
          nilai={formatAngka(ringkasan.ritBerjalan)}
          ikon={Satellite}
          keterangan={`${formatAngka(ringkasan.titik24Jam)} titik GPS masuk dalam 24 jam`}
        />
        <KartuKpi
          judul="Jejak terputus"
          nilai={formatAngka(ringkasan.jejakTerputus)}
          ikon={MapPinOff}
          nada={ringkasan.jejakTerputus > 0 ? "bahaya" : "sukses"}
          keterangan="Truk di jalan tanpa titik GPS terbaru"
        />
        <KartuKpi
          judul="Kendala terbuka"
          nilai={formatAngka(ringkasan.kendalaTerbuka)}
          ikon={TriangleAlert}
          nada={ringkasan.kendalaTerbuka > 0 ? "peringatan" : "netral"}
          keterangan={`${formatAngka(ringkasan.foto24Jam)} foto bukti terunggah 24 jam`}
        />
      </div>

      <Card className="gap-0 overflow-hidden rounded-lg py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b py-3">
          <div>
            <CardTitle className="text-sm">Perangkat supir</CardTitle>
            <p className="text-xs text-muted-foreground">
              Supir dengan jejak terputus ditaruh paling atas
            </p>
          </div>
          <span className="angka flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={gagal ? "size-3 text-bahaya" : "size-3"} />
            {gagal ? "gagal menyegarkan" : formatJam(data.diperbaruiPada)}
          </span>
        </CardHeader>

        {data.supir.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada akun supir. Tambahkan lewat Master → Pengguna.
          </p>
        ) : (
          <div>
            {[...bermasalah, ...lainnya].map((s) => (
              <Baris key={s.id} supir={s} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
