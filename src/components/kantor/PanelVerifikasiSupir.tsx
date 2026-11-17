"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api-client";
import { STATUS_VERIFIKASI_LABEL } from "@/lib/constants";
import type { SupirMenungguVerifikasi } from "@/lib/aplikasi-supir";
import { formatTanggalJam } from "./format";

// Verifikasi akun supir yang mendaftar sendiri lewat aplikasi. Selama belum
// diverifikasi, tombol Ajukan DO di aplikasi mati — penyaringan terjadi di
// sini, bukan di tombol persetujuan DO.

function Baris({
  supir,
  onPutusan,
  sibuk,
}: {
  supir: SupirMenungguVerifikasi;
  onPutusan: (id: string, putusan: "TERIMA" | "TOLAK", alasan?: string) => void;
  sibuk: boolean;
}) {
  const [tolakTerbuka, setTolakTerbuka] = useState(false);
  const [alasan, setAlasan] = useState("");
  const ditolak = supir.statusVerifikasi === "DITOLAK";

  return (
    <div className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{supir.nama}</p>
          <p className="angka truncate text-xs text-muted-foreground">
            {supir.hp}
            {supir.noSim ? ` · SIM ${supir.noSim}` : ""}
            {supir.nopolTerakhir ? ` · ${supir.nopolTerakhir}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Mendaftar {formatTanggalJam(supir.mendaftarPada)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={ditolak ? "border-bahaya/40 text-bahaya" : "border-oranye/40 text-oranye"}
        >
          {STATUS_VERIFIKASI_LABEL[supir.statusVerifikasi]}
        </Badge>
      </div>

      {supir.alasanTolak && (
        <p className="text-xs text-muted-foreground">Alasan: {supir.alasanTolak}</p>
      )}

      {tolakTerbuka ? (
        <div className="flex flex-col gap-2">
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
              onClick={() => onPutusan(supir.id, "TOLAK", alasan.trim())}
            >
              Kirim penolakan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTolakTerbuka(false)}>
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={sibuk} onClick={() => onPutusan(supir.id, "TERIMA")}>
            <Check className="size-4" />
            Verifikasi
          </Button>
          {!ditolak && (
            <Button size="sm" variant="outline" disabled={sibuk} onClick={() => setTolakTerbuka(true)}>
              <X className="size-4" />
              Tolak
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function PanelVerifikasiSupir({ awal }: { awal: SupirMenungguVerifikasi[] }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function putuskan(id: string, putusan: "TERIMA" | "TOLAK", alasan?: string) {
    setSibuk(true);
    setGalat(null);
    try {
      await apiJson(`/api/pengguna/${id}/verifikasi`, {
        method: "POST",
        body: putusan === "TOLAK" ? { putusan, alasan } : { putusan },
      });
      router.refresh();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal mengirim putusan");
    } finally {
      setSibuk(false);
    }
  }

  if (awal.length === 0) return null;

  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm">Akun supir menunggu verifikasi</CardTitle>
        <p className="text-xs text-muted-foreground">
          Sebelum diverifikasi, supir bisa melihat daftar PO tetapi tidak bisa mengajukan DO
        </p>
      </CardHeader>

      {galat && <p className="border-b bg-bahaya/10 px-4 py-2 text-xs text-bahaya">{galat}</p>}

      <div>
        {awal.map((s) => (
          <Baris key={s.id} supir={s} onPutusan={putuskan} sibuk={sibuk} />
        ))}
      </div>
    </Card>
  );
}
