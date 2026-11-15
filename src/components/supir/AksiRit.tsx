"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  CloudUpload,
  LoaderCircle,
  MapPinned,
  TriangleAlert,
} from "lucide-react";
import { apiJson } from "@/lib/api-client";
import {
  ALUR_SUPIR,
  STATUS_BOLEH_KENDALA,
  STATUS_RIT_LABEL,
  TRANSISI_SUDAH_DI_LOKASI,
  transisiBerikutnya,
  type StatusRit,
  type TransisiRit,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gunakanGps } from "./gunakan-gps";
import { IndikatorGps, PeringatanIzinLokasi } from "./IndikatorGps";
import { siapkanFoto, unggahFoto } from "./foto";
import { galatJaringan, jumlahAntrian, langgananAntrian, tambahAksi } from "./antrian";
import { FormKendala } from "./FormKendala";
import type { TugasSupir } from "./tipe";

// Satu layar satu aksi: tombol utama besar, sisanya informasi pendukung.
// Komponen ini dipakai di layar tugas maupun di detail rit.

function idAksi(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nolAntrian() {
  return 0;
}

/** Posisi status pada alur supir, untuk indikator "Langkah x dari y". */
function nomorLangkah(status: StatusRit): number | null {
  const i = ALUR_SUPIR.findIndex((t) => t.dari === status);
  if (i >= 0) return i + 1;
  const sesudah = ALUR_SUPIR.findIndex((t) => t.ke === status);
  return sesudah >= 0 ? sesudah + 1 : null;
}

export function AksiRit({ tugas }: { tugas: TugasSupir }) {
  const router = useRouter();

  // Status hasil aksi yang masih mengantre (offline) ditahan di sini supaya
  // supir bisa terus bekerja walau server belum tahu.
  const [statusAntre, setStatusAntre] = useState<StatusRit | null>(null);
  const [statusTerakhirDariServer, setStatusTerakhirDariServer] = useState(tugas.status);
  if (statusTerakhirDariServer !== tugas.status) {
    setStatusTerakhirDariServer(tugas.status);
    setStatusAntre(null);
  }
  const status = statusAntre ?? tugas.status;

  const antre = useSyncExternalStore(langgananAntrian, jumlahAntrian, nolAntrian);

  const gps = gunakanGps({ ritId: tugas.id, lacak: status === "MENUJU_MUAT" || status === "MENUJU_BONGKAR" });

  const [sibuk, setSibuk] = useState(false);
  const [transisiFoto, setTransisiFoto] = useState<TransisiRit | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [kendalaTerbuka, setKendalaTerbuka] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const lanjutKendala: TransisiRit | null =
    status === "KENDALA" && tugas.statusSebelumKendala
      ? { dari: "KENDALA", ke: tugas.statusSebelumKendala, aksi: "Lanjutkan Perjalanan" }
      : null;
  const utama = lanjutKendala ?? transisiBerikutnya(status);
  const sudahDiLokasi = status === TRANSISI_SUDAH_DI_LOKASI.dari ? TRANSISI_SUDAH_DI_LOKASI : null;

  const langkah = nomorLangkah(lanjutKendala ? lanjutKendala.ke : status);

  async function jalankan(transisi: TransisiRit, fotoDataUrl?: string) {
    if (transisi.wajibFoto && !fotoDataUrl) {
      setFoto(null);
      setTransisiFoto(transisi);
      return;
    }

    setSibuk(true);
    const titik = await gps.ambilTitik();
    try {
      const fotoUrl = fotoDataUrl ? await unggahFoto(fotoDataUrl) : undefined;
      await apiJson(`/api/rit/${tugas.id}/status`, {
        method: "POST",
        body: {
          dari: transisi.dari,
          ke: transisi.ke,
          lat: titik?.lat,
          lng: titik?.lng,
          fotoUrl,
        },
      });
      setTransisiFoto(null);
      setFoto(null);
      toast.success(`Tercatat: ${STATUS_RIT_LABEL[transisi.ke]}`);
      router.refresh();
    } catch (e) {
      if (galatJaringan(e)) {
        tambahAksi({
          id: idAksi(),
          ritId: tugas.id,
          noDo: tugas.noDo,
          dari: transisi.dari,
          ke: transisi.ke,
          lat: titik?.lat,
          lng: titik?.lng,
          fotoDataUrl,
          dibuat: Date.now(),
        });
        setStatusAntre(transisi.ke);
        setTransisiFoto(null);
        setFoto(null);
        toast.info("Tersimpan di HP, menunggu sinyal", {
          description: "Aksi otomatis dikirim begitu jaringan kembali.",
        });
      } else {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
        // Biasanya status sudah berpindah di server — ambil ulang supaya layar
        // menampilkan keadaan yang benar.
        router.refresh();
      }
    } finally {
      setSibuk(false);
    }
  }

  async function pilihFoto(berkas: File | undefined) {
    if (!berkas) return;
    try {
      setFoto(await siapkanFoto(berkas));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foto gagal dibaca");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <IndikatorGps kondisi={gps.kondisi} titik={gps.titik} />
        {langkah ? (
          <span className="angka text-xs font-medium text-muted-foreground">
            Langkah {langkah} dari {ALUR_SUPIR.length}
          </span>
        ) : null}
      </div>

      {langkah ? (
        <div className="flex gap-1" aria-hidden>
          {ALUR_SUPIR.map((t, i) => (
            <span
              key={t.ke}
              className={`h-1.5 flex-1 rounded-full ${i < langkah ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      ) : null}

      <PeringatanIzinLokasi kondisi={gps.kondisi} />

      {antre > 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-peringatan/25 bg-peringatan/5 px-3 py-2 text-xs font-medium text-peringatan">
          <CloudUpload className="size-4 shrink-0" />
          <span className="angka">{antre}</span> aksi tersimpan di HP, menunggu sinyal untuk dikirim.
        </p>
      ) : null}

      {utama ? (
        <Button
          type="button"
          className="h-14 w-full rounded-[10px] text-base font-semibold"
          disabled={sibuk}
          onClick={() => jalankan(utama)}
        >
          {sibuk ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : utama.wajibFoto ? (
            <Camera className="size-5" />
          ) : (
            <ArrowRight className="size-5" />
          )}
          {utama.aksi}
        </Button>
      ) : (
        <p className="rounded-lg border bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground">
          Tidak ada aksi untuk status &ldquo;{STATUS_RIT_LABEL[status]}&rdquo;. Tunggu kabar dari
          kantor.
        </p>
      )}

      {sudahDiLokasi ? (
        <Button
          type="button"
          variant="outline"
          className="h-13 w-full rounded-[10px] text-sm font-medium"
          disabled={sibuk}
          onClick={() => jalankan(sudahDiLokasi)}
        >
          <MapPinned className="size-4" />
          {sudahDiLokasi.aksi}
        </Button>
      ) : null}

      {utama?.wajibFoto ? (
        <p className="text-center text-xs text-muted-foreground">
          Langkah ini butuh foto slip timbang.
        </p>
      ) : null}

      {STATUS_BOLEH_KENDALA.includes(status) ? (
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full rounded-[10px] text-sm font-medium text-bahaya hover:bg-bahaya/10 hover:text-bahaya"
          onClick={() => setKendalaTerbuka(true)}
        >
          <TriangleAlert className="size-4" />
          Lapor Kendala
        </Button>
      ) : null}

      {/* Dialog foto slip — tombol lanjut terkunci sampai fotonya ada. */}
      <Dialog
        open={transisiFoto !== null}
        onOpenChange={(terbuka) => {
          if (!terbuka && !sibuk) {
            setTransisiFoto(null);
            setFoto(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Foto {transisiFoto?.wajibFoto === "SLIP_BONGKAR" ? "Slip Bongkar" : "Slip Muat"}
            </DialogTitle>
            <DialogDescription>
              Pastikan angka bruto, tara, dan netto terbaca jelas. Kantor memakai foto ini untuk
              mengisi timbangan.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => pilihFoto(e.target.files?.[0])}
          />

          {foto ? (
            <img src={foto} alt="Foto slip" className="max-h-64 w-full rounded-lg border object-contain" />
          ) : (
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted"
            >
              <Camera className="size-7" />
              Ketuk untuk memotret slip
            </button>
          )}

          {foto ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={sibuk}
              onClick={() => inputFoto.current?.click()}
            >
              Ganti Foto
            </Button>
          ) : null}

          <Button
            type="button"
            className="h-14 w-full rounded-[10px] text-base font-semibold"
            disabled={!foto || sibuk}
            onClick={() => transisiFoto && foto && jalankan(transisiFoto, foto)}
          >
            {sibuk ? <LoaderCircle className="size-5 animate-spin" /> : null}
            {transisiFoto?.aksi}
          </Button>
          {!foto ? (
            <p className="text-center text-xs text-muted-foreground">
              Tombol aktif setelah foto slip diambil.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={kendalaTerbuka} onOpenChange={setKendalaTerbuka}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lapor Kendala</DialogTitle>
            <DialogDescription>
              Rit {tugas.noDo} akan ditandai bermasalah dan kantor segera diberi tahu.
            </DialogDescription>
          </DialogHeader>
          <FormKendala
            ritId={tugas.id}
            ambilTitik={gps.ambilTitik}
            onSelesai={() => setKendalaTerbuka(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
