"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api-client";
import { withBasePath } from "@/lib/base-path";
import {
  JENIS_BARANG_LABEL,
  STATUS_PENGAJUAN_LABEL,
  type JenisBarang,
  type StatusPengajuan,
} from "@/lib/constants";
import type { BarisPengajuan } from "@/lib/pengajuan";
import { formatTanggalJam } from "./format";

// Putusan kantor atas pengajuan DO supir. Kuota dikunci di server pada
// transaksi persetujuan, jadi dua admin yang menekan Setujui bersamaan tidak
// bisa melewati batas unit: yang kalah menerima "kuota sudah penuh" dari sini.

const JEDA_SEGAR_MS = 30_000;

const WARNA_STATUS: Record<string, string> = {
  DIAJUKAN: "border-oranye/40 text-oranye",
  DISETUJUI: "border-sukses/40 text-sukses",
  DITOLAK: "border-bahaya/40 text-bahaya",
  KEDALUWARSA: "border-border text-muted-foreground",
};

function Baris({
  pengajuan,
  onPutusan,
  sibuk,
}: {
  pengajuan: BarisPengajuan;
  onPutusan: (id: string, putusan: "SETUJUI" | "TOLAK", alasan?: string) => void;
  sibuk: boolean;
}) {
  const [tolakTerbuka, setTolakTerbuka] = useState(false);
  const [alasan, setAlasan] = useState("");

  const menunggu = pengajuan.status === "DIAJUKAN";
  const kuota = pengajuan.kontrak.unitDiminta;
  const sisa = kuota === null ? null : Math.max(0, kuota - pengajuan.kontrak.unitTerpakai);

  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start gap-3">
        <Image
          src={withBasePath(pengajuan.fotoSelfieUrl)}
          alt={`Selfie ${pengajuan.nama}`}
          width={56}
          height={72}
          className="h-18 w-14 shrink-0 rounded-md object-cover"
          unoptimized
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pengajuan.nama}</p>
          <p className="angka truncate text-xs text-muted-foreground">
            {pengajuan.nopol} · SIM {pengajuan.noSim} · {pengajuan.noHp}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Masuk {formatTanggalJam(pengajuan.dibuatPada)}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="angka truncate text-sm">{pengajuan.kontrak.noSpk}</p>
          <p className="truncate text-xs text-muted-foreground">
            {pengajuan.kontrak.shipper} ·{" "}
            {JENIS_BARANG_LABEL[pengajuan.kontrak.jenisBarang as JenisBarang]}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {pengajuan.kontrak.lokasiAsal} → {pengajuan.kontrak.lokasiTujuan}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className={WARNA_STATUS[pengajuan.status]}>
            {STATUS_PENGAJUAN_LABEL[pengajuan.status as StatusPengajuan]}
          </Badge>
          <span className="angka text-xs text-muted-foreground">
            {sisa === null ? "kuota bebas" : `sisa ${sisa} unit`}
          </span>
        </div>
      </div>

      {pengajuan.rit && (
        <Link
          href={`/rit/${pengajuan.rit.id}`}
          className="angka text-xs text-primary hover:underline"
        >
          DO terbit: {pengajuan.rit.noDo}
        </Link>
      )}

      {pengajuan.alasanTolak && (
        <p className="text-xs text-muted-foreground">Alasan: {pengajuan.alasanTolak}</p>
      )}

      {!menunggu && pengajuan.diputusOleh && (
        <p className="text-xs text-muted-foreground">
          Diputus {pengajuan.diputusOleh} lewat {pengajuan.sumberPersetujuan?.toLowerCase()} ·{" "}
          {formatTanggalJam(pengajuan.diputusPada)}
        </p>
      )}

      {menunggu && (
        <div className="flex flex-col gap-2">
          {tolakTerbuka ? (
            <>
              <Textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Alasan penolakan — supir membacanya apa adanya di aplikasi"
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={sibuk || alasan.trim().length < 5}
                  onClick={() => onPutusan(pengajuan.id, "TOLAK", alasan.trim())}
                >
                  Kirim penolakan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setTolakTerbuka(false)}>
                  Batal
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={sibuk || sisa === 0}
                onClick={() => onPutusan(pengajuan.id, "SETUJUI")}
              >
                <Check className="size-4" />
                Setujui &amp; terbitkan DO
              </Button>
              <Button size="sm" variant="outline" disabled={sibuk} onClick={() => setTolakTerbuka(true)}>
                <X className="size-4" />
                Tolak
              </Button>
              {sisa === 0 && (
                <span className="self-center text-xs text-bahaya">Kuota PO sudah penuh</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PanelPengajuanDo({ awal }: { awal: BarisPengajuan[] }) {
  const [data, setData] = useState(awal);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function muat() {
    const baru = await apiJson<{ pengajuan: BarisPengajuan[] }>("/api/pengajuan");
    setData(baru.pengajuan);
  }

  useEffect(() => {
    const pewaktu = setInterval(() => {
      muat().catch(() => {
        // Jaringan putus sesaat tidak boleh mengosongkan layar.
      });
    }, JEDA_SEGAR_MS);
    return () => clearInterval(pewaktu);
  }, []);

  async function putuskan(id: string, putusan: "SETUJUI" | "TOLAK", alasan?: string) {
    setSibuk(true);
    setGalat(null);
    try {
      await apiJson(`/api/pengajuan/${id}/putusan`, {
        method: "POST",
        body: putusan === "TOLAK" ? { putusan, alasan } : { putusan },
      });
      await muat();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengirim putusan");
      await muat().catch(() => {});
    } finally {
      setSibuk(false);
    }
  }

  const menunggu = data.filter((p) => p.status === "DIAJUKAN");
  const selesai = data.filter((p) => p.status !== "DIAJUKAN").slice(0, 10);

  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b py-3">
        <div>
          <CardTitle className="text-sm">Pengajuan DO dari supir</CardTitle>
          <p className="text-xs text-muted-foreground">
            {menunggu.length} menunggu putusan · tidak diputus 1×24 jam otomatis kedaluwarsa
          </p>
        </div>
        <button
          type="button"
          onClick={() => muat().catch(() => setGalat("Gagal memuat ulang"))}
          className="angka flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3" />
          muat ulang
        </button>
      </CardHeader>

      {galat && <p className="border-b bg-bahaya/10 px-4 py-2 text-xs text-bahaya">{galat}</p>}

      {data.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada pengajuan DO dari aplikasi supir.
        </p>
      ) : (
        <div>
          {[...menunggu, ...selesai].map((p) => (
            <Baris key={p.id} pengajuan={p} onPutusan={putuskan} sibuk={sibuk} />
          ))}
        </div>
      )}
    </Card>
  );
}
