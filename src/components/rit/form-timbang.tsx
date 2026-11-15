"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Controller, useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Lock, Scale } from "lucide-react";
import { apiJson } from "@/lib/api-client";
import {
  SUMBER_ANGKA,
  SUMBER_ANGKA_LABEL,
  TOLERANSI_SELISIH_KG,
  type JenisBarang,
  type StatusRit,
  type SumberAngka,
} from "@/lib/constants";
import {
  formatKg,
  formatRupiah,
  hitungNetto,
  hitungSelisih,
  hitungTagihanShipper,
  taraMencurigakan,
} from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bidang } from "./bidang";

export type IsiTimbang = {
  tanggal: string;
  noTiket: string;
  bruto: string;
  tara: string;
  namaTimbangan: string;
  sumberAngka: SumberAngka;
  catatan: string;
};

type IsianTimbang = { muat: IsiTimbang; bongkar: IsiTimbang };
type Jenis = keyof IsianTimbang;

const skemaIsi = z.object({
  tanggal: z.string(),
  noTiket: z.string(),
  bruto: z.string(),
  tara: z.string(),
  namaTimbangan: z.string(),
  sumberAngka: z.enum(SUMBER_ANGKA),
  catatan: z.string(),
});

/** Seksi yang masih kosong dibiarkan lewat — admin boleh menyimpan sebagian. */
const skemaForm = z.object({ muat: skemaIsi, bongkar: skemaIsi }).superRefine((nilai, ctx) => {
  for (const jenis of ["muat", "bongkar"] as const) {
    const isi = nilai[jenis];
    if (!isi.bruto.trim() && !isi.tara.trim()) continue;

    const bruto = Number(isi.bruto);
    const tara = Number(isi.tara);
    if (!isi.tanggal) {
      ctx.addIssue({ code: "custom", path: [jenis, "tanggal"], message: "Tanggal timbang wajib diisi" });
    }
    if (!isi.bruto.trim() || !Number.isFinite(bruto) || bruto <= 0) {
      ctx.addIssue({ code: "custom", path: [jenis, "bruto"], message: "Bruto wajib diisi" });
    }
    if (!isi.tara.trim() || !Number.isFinite(tara) || tara <= 0) {
      ctx.addIssue({ code: "custom", path: [jenis, "tara"], message: "Tara wajib diisi" });
    }
    if (bruto > 0 && tara > 0 && bruto <= tara) {
      ctx.addIssue({ code: "custom", path: [jenis, "bruto"], message: "Bruto harus lebih besar dari tara" });
    }
    if (isi.sumberAngka === "KONFIRMASI_MANUAL" && !isi.catatan.trim()) {
      ctx.addIssue({
        code: "custom",
        path: [jenis, "catatan"],
        message: "Angka konfirmasi manual wajib disertai catatan",
      });
    }
  }
});

const KOSONG: IsiTimbang = {
  tanggal: "",
  noTiket: "",
  bruto: "",
  tara: "",
  namaTimbangan: "",
  sumberAngka: "SLIP",
  catatan: "",
};

function angka(teks: string): number | null {
  const n = Number(teks);
  return teks.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

function SeksiTimbang({
  jenis,
  judul,
  form,
  taraBaku,
  terkunci,
}: {
  jenis: Jenis;
  judul: string;
  form: UseFormReturn<IsianTimbang>;
  taraBaku: number | null;
  terkunci: boolean;
}) {
  const galat = form.formState.errors[jenis];
  const isi = form.watch(jenis);
  const bruto = angka(isi.bruto);
  const tara = angka(isi.tara);
  const netto = bruto !== null && tara !== null ? hitungNetto(bruto, tara) : null;
  const taraAneh = tara !== null && taraBaku !== null && taraMencurigakan(tara, taraBaku);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{judul}</h4>
        {netto !== null && (
          <span className="angka text-xs text-muted-foreground">Netto {formatKg(netto)}</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Bidang label="Tanggal timbang" galat={galat?.tanggal?.message}>
          <Input
            {...form.register(`${jenis}.tanggal`)}
            type="date"
            className="angka"
            disabled={terkunci}
          />
        </Bidang>
        <Bidang label="Nomor tiket" galat={galat?.noTiket?.message}>
          <Input {...form.register(`${jenis}.noTiket`)} placeholder="mis. 004213" disabled={terkunci} />
        </Bidang>
        <Bidang label="Bruto (kg)" galat={galat?.bruto?.message}>
          <Input
            {...form.register(`${jenis}.bruto`)}
            type="number"
            min="0"
            step="1"
            className="angka"
            placeholder="0"
            disabled={terkunci}
          />
        </Bidang>
        <Bidang label="Tara (kg)" galat={galat?.tara?.message}>
          <Input
            {...form.register(`${jenis}.tara`)}
            type="number"
            min="0"
            step="1"
            className="angka"
            placeholder="0"
            disabled={terkunci}
          />
        </Bidang>
        <Bidang
          label="Netto (kg)"
          className="sm:col-span-2"
          petunjuk="Dihitung otomatis dari bruto − tara, tidak bisa diketik"
        >
          <Input
            readOnly
            tabIndex={-1}
            value={netto === null ? "" : netto}
            placeholder="—"
            className="angka bg-muted/60 font-semibold"
          />
        </Bidang>
        <Bidang label="Nama jembatan timbang" galat={galat?.namaTimbangan?.message}>
          <Input
            {...form.register(`${jenis}.namaTimbangan`)}
            placeholder="mis. Timbangan PKS"
            disabled={terkunci}
          />
        </Bidang>
        <Bidang label="Sumber angka" galat={galat?.sumberAngka?.message}>
          <Controller
            control={form.control}
            name={`${jenis}.sumberAngka`}
            render={({ field }) => (
              <Select
                items={SUMBER_ANGKA_LABEL}
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "SLIP")}
                disabled={terkunci}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUMBER_ANGKA.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUMBER_ANGKA_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>
        <Bidang label="Catatan" className="sm:col-span-2" galat={galat?.catatan?.message}>
          <Textarea
            {...form.register(`${jenis}.catatan`)}
            rows={2}
            placeholder="Wajib diisi kalau angka bukan dari slip"
            disabled={terkunci}
          />
        </Bidang>
      </div>

      {taraAneh && taraBaku !== null && (
        <p className="flex items-start gap-2 rounded-md border border-peringatan/30 bg-peringatan/10 px-3 py-2 text-xs text-peringatan">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Tara {formatKg(tara ?? 0)} menyimpang jauh dari tara baku truk ({formatKg(taraBaku)}).
            Periksa ulang slipnya — kemungkinan salah ketik.
          </span>
        </p>
      )}
    </div>
  );
}

export function FormTimbang({
  ritId,
  status,
  jenisBarang,
  taraBakuTruk,
  tarifShipperPerTonSnapshot,
  ongkosSupirPerRitSnapshot,
  awal,
}: {
  ritId: string;
  status: StatusRit;
  jenisBarang: JenisBarang;
  taraBakuTruk: number | null;
  tarifShipperPerTonSnapshot: number;
  ongkosSupirPerRitSnapshot: number;
  awal: { muat: IsiTimbang | null; bongkar: IsiTimbang | null };
}) {
  const router = useRouter();
  const [mengirim, setMengirim] = useState<"simpan" | "selesaikan" | null>(null);

  const bisaInput = status === "SELESAI_BONGKAR" || status === "MENUNGGU_INPUT";
  const terkunci = !bisaInput;

  const form = useForm<IsianTimbang>({
    resolver: zodResolver(skemaForm, undefined, { raw: true }) as unknown as Resolver<IsianTimbang>,
    defaultValues: { muat: awal.muat ?? KOSONG, bongkar: awal.bongkar ?? KOSONG },
  });

  const nilai = form.watch();
  const nettoMuat = (() => {
    const b = angka(nilai.muat.bruto);
    const t = angka(nilai.muat.tara);
    return b !== null && t !== null ? hitungNetto(b, t) : null;
  })();
  const nettoBongkar = (() => {
    const b = angka(nilai.bongkar.bruto);
    const t = angka(nilai.bongkar.tara);
    return b !== null && t !== null ? hitungNetto(b, t) : null;
  })();

  const hasil =
    nettoMuat !== null && nettoBongkar !== null
      ? hitungSelisih(nettoMuat, nettoBongkar, jenisBarang)
      : null;
  const tagihan = nettoBongkar !== null ? hitungTagihanShipper(nettoBongkar, tarifShipperPerTonSnapshot) : null;
  const lengkap = nettoMuat !== null && nettoBongkar !== null;

  const kirim = (selesaikan: boolean) =>
    form.handleSubmit(async (isian) => {
      const seksi = (jenis: Jenis) => {
        const s = isian[jenis];
        if (!s.bruto.trim() || !s.tara.trim()) return null;
        return {
          tanggal: s.tanggal,
          noTiket: s.noTiket,
          bruto: s.bruto,
          tara: s.tara,
          namaTimbangan: s.namaTimbangan,
          sumberAngka: s.sumberAngka,
          catatan: s.catatan,
        };
      };

      setMengirim(selesaikan ? "selesaikan" : "simpan");
      try {
        await apiJson(`/api/rit/${ritId}/timbang`, {
          method: "POST",
          body: { muat: seksi("muat"), bongkar: seksi("bongkar"), selesaikan },
        });
        toast.success(selesaikan ? "Rit diselesaikan, angkanya dibekukan" : "Angka timbangan tersimpan");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan timbangan");
      } finally {
        setMengirim(null);
      }
    });

  return (
    <div className="space-y-4">
      {terkunci && (
        <p className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {status === "SELESAI"
              ? "Rit sudah diselesaikan. Angka timbangan dan hasil perhitungannya terkunci."
              : status === "DIBATALKAN"
                ? "Rit dibatalkan, tidak ada angka timbangan yang dicatat."
                : "Angka timbangan baru bisa diinput setelah supir menyelesaikan bongkar."}
          </span>
        </p>
      )}

      <SeksiTimbang
        jenis="muat"
        judul="Timbangan muat"
        form={form}
        taraBaku={taraBakuTruk}
        terkunci={terkunci}
      />
      <Separator />
      <SeksiTimbang
        jenis="bongkar"
        judul="Timbangan bongkar"
        form={form}
        taraBaku={taraBakuTruk}
        terkunci={terkunci}
      />

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Scale className="size-3.5" />
          Hasil
        </div>

        {hasil === null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Isi bruto dan tara pada kedua penimbangan untuk melihat selisih dan nilainya.
          </p>
        ) : (
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">Netto muat</dt>
              <dd className="angka font-medium">{formatKg(nettoMuat ?? 0)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">Netto bongkar</dt>
              <dd className="angka font-medium">{formatKg(nettoBongkar ?? 0)}</dd>
            </div>
            <Separator />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">
                Selisih {hasil.bertambah ? "(bertambah)" : "(berkurang)"}
              </dt>
              <dd className="angka font-medium">{formatKg(Math.abs(hasil.selisihKg))}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">
                Kelebihan setelah toleransi {TOLERANSI_SELISIH_KG} kg
              </dt>
              <dd className="angka font-medium">{formatKg(hasil.kelebihanKg)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">Nilai selisih</dt>
              <dd
                className={`angka font-semibold ${hasil.nilaiSelisih > 0 ? "text-bahaya" : "text-sukses"}`}
              >
                {hasil.dinilai ? formatRupiah(hasil.nilaiSelisih) : "tidak dinilai"}
              </dd>
            </div>
            <Separator />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">Tagihan shipper</dt>
              <dd className="angka font-medium">{tagihan === null ? "—" : formatRupiah(tagihan)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">Ongkos supir (borongan)</dt>
              <dd className="angka font-medium">{formatRupiah(ongkosSupirPerRitSnapshot)}</dd>
            </div>
          </dl>
        )}

        <p className="mt-3 rounded-md border border-sukses/25 bg-sukses/10 px-2.5 py-1.5 text-xs font-medium text-sukses">
          Ongkos supir borongan tidak terpengaruh selisih.
        </p>
      </div>

      {!terkunci && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="lg"
            onClick={kirim(true)}
            disabled={mengirim !== null || !lengkap}
          >
            {mengirim === "selesaikan" ? "Menyelesaikan…" : "Simpan & Selesaikan"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={kirim(false)}
            disabled={mengirim !== null}
          >
            {mengirim === "simpan" ? "Menyimpan…" : "Simpan dulu"}
          </Button>
          {!lengkap && (
            <span className="text-xs text-muted-foreground">
              Kedua penimbangan harus lengkap sebelum rit bisa diselesaikan.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
