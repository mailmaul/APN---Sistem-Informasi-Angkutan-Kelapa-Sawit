"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiJson } from "@/lib/api-client";
import { formatKg, formatRupiah } from "@/lib/perhitungan";

// Potongan susut yang dibebankan ke supir, beserta jalan keluarnya.
//
// Rincian sengaja ditampilkan utuh (selisih kg → kelebihan → rupiah), bukan
// hanya angka akhir: bayaran orang berkurang di sini, jadi alasannya harus
// bisa dibaca siapa pun yang membuka rit ini.

type Props = {
  ritId: string;
  selesai: boolean;
  selisihKg: number | null;
  kelebihanKg: number | null;
  nilaiSelisih: number | null;
  potonganSupir: number | null;
  pemaafanPotongan: number;
  alasanPemaafan: string | null;
  dimaafkanOleh: string | null;
  ongkosBorongan: number;
  /** Hanya owner yang boleh memaafkan — ini keputusan uang, bukan koreksi data. */
  bolehMemaafkan: boolean;
};

export function PanelPotongan({
  ritId,
  selesai,
  selisihKg,
  kelebihanKg,
  nilaiSelisih,
  potonganSupir,
  pemaafanPotongan,
  alasanPemaafan,
  dimaafkanOleh,
  ongkosBorongan,
  bolehMemaafkan,
}: Props) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [nominal, setNominal] = useState(String(pemaafanPotongan || ""));
  const [alasan, setAlasan] = useState(alasanPemaafan ?? "");
  const [mengirim, setMengirim] = useState(false);

  const nilai = nilaiSelisih ?? 0;
  const adaSusut = selesai && (selisihKg ?? 0) > 0 && nilai > 0;
  const potongan = potonganSupir ?? 0;
  const bayar = ongkosBorongan - potongan;

  async function simpan() {
    setMengirim(true);
    try {
      await apiJson(`/api/rit/${ritId}/pemaafan`, {
        method: "POST",
        body: { nominal: Number(nominal || 0), alasan },
      });
      toast.success("Pemaafan tersimpan");
      setBuka(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pemaafan");
    } finally {
      setMengirim(false);
    }
  }

  if (!selesai) return null;

  if (!adaSusut) {
    return (
      <p className="text-xs text-muted-foreground">
        Tidak ada potongan — susut masih dalam toleransi
        {(selisihKg ?? 0) < 0 ? " (muatan justru bertambah)" : ""}.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Baris label="Susut" nilai={formatKg(selisihKg ?? 0)} />
      <Baris label="Di luar toleransi" nilai={formatKg(kelebihanKg ?? 0)} />
      <Baris label="Nilai susut" nilai={formatRupiah(nilai)} />
      {pemaafanPotongan > 0 && (
        <Baris label="Dimaafkan" nilai={`− ${formatRupiah(pemaafanPotongan)}`} hijau />
      )}
      <Separator />
      <Baris label="Potongan supir" nilai={`− ${formatRupiah(potongan)}`} merah tebal />
      <Baris label="Borongan" nilai={formatRupiah(ongkosBorongan)} />
      <div className="flex items-baseline justify-between gap-3 pt-1">
        <span className="text-xs font-medium">Diterima supir</span>
        <span className={`angka text-base font-semibold ${bayar < 0 ? "text-bahaya" : ""}`}>
          {formatRupiah(bayar)}
        </span>
      </div>
      {bayar < 0 && (
        <p className="text-xs text-bahaya">
          Potongan melebihi borongan — selisihnya menjadi saldo utang supir.
        </p>
      )}

      {alasanPemaafan && (
        <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
          Dimaafkan{dimaafkanOleh ? ` oleh ${dimaafkanOleh}` : ""}: {alasanPemaafan}
        </p>
      )}

      {bolehMemaafkan && (
        <>
          <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => setBuka(true)}>
            <HandCoins className="size-3.5" />
            {pemaafanPotongan > 0 ? "Ubah pemaafan" : "Maafkan potongan"}
          </Button>

          <Dialog open={buka} onOpenChange={setBuka}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Maafkan potongan susut</DialogTitle>
                <DialogDescription>
                  Nilai susut rit ini {formatRupiah(nilai)}. Isi berapa yang dimaafkan — sisanya
                  tetap dipotong dari bayaran supir.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="nominal-maaf">
                    Nominal dimaafkan (Rp)
                  </label>
                  <Input
                    id="nominal-maaf"
                    type="number"
                    min="0"
                    max={nilai}
                    className="angka"
                    value={nominal}
                    onChange={(e) => setNominal(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => setNominal(String(nilai))}
                  >
                    Maafkan seluruhnya ({formatRupiah(nilai)})
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="alasan-maaf">
                    Alasan (wajib, tersimpan permanen)
                  </label>
                  <Textarea
                    id="alasan-maaf"
                    rows={3}
                    placeholder="mis. selisih akibat timbangan tujuan bermasalah, sudah dicek operator"
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setBuka(false)} disabled={mengirim}>
                  Batal
                </Button>
                <Button onClick={simpan} disabled={mengirim || alasan.trim().length < 5}>
                  {mengirim ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function Baris({
  label,
  nilai,
  merah,
  hijau,
  tebal,
}: {
  label: string;
  nilai: string;
  merah?: boolean;
  hijau?: boolean;
  tebal?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`angka text-sm ${merah ? "text-bahaya" : ""} ${hijau ? "text-sukses" : ""} ${
          tebal ? "font-semibold" : ""
        }`}
      >
        {nilai}
      </span>
    </div>
  );
}
