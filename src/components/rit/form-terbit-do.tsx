"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { apiJson } from "@/lib/api-client";
import { JENIS_BARANG_LABEL, type JenisBarang } from "@/lib/constants";
import { formatRupiah, formatTon } from "@/lib/perhitungan";
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
import { Bidang } from "./bidang";
import { skemaTerbitDo, type IsianTerbitDo } from "./skema";

export type OpsiKontrak = {
  id: string;
  noSpk: string;
  shipper: string;
  jenisBarang: string;
  rute: string;
  totalTonase: number;
  tarifShipperPerTon: number;
  ongkosSupirPerRit: number;
};

export type OpsiArmada = { id: string; label: string; keterangan?: string };

const KOSONG = "";

export function FormTerbitDo({
  kontrak,
  truk,
  supir,
  kontrakAwal,
}: {
  kontrak: OpsiKontrak[];
  truk: OpsiArmada[];
  supir: OpsiArmada[];
  kontrakAwal?: string;
}) {
  const router = useRouter();
  const [mengirim, setMengirim] = useState(false);

  const form = useForm<IsianTerbitDo>({
    resolver: zodResolver(skemaTerbitDo, undefined, { raw: true }) as unknown as Resolver<IsianTerbitDo>,
    defaultValues: {
      noDo: "",
      kontrakId: kontrakAwal && kontrak.some((k) => k.id === kontrakAwal) ? kontrakAwal : KOSONG,
      tanggalTerbit: format(new Date(), "yyyy-MM-dd"),
      trukId: KOSONG,
      supirId: KOSONG,
      catatan: KOSONG,
    },
  });

  const galat = form.formState.errors;
  const kontrakId = form.watch("kontrakId");
  const trukId = form.watch("trukId");
  const supirId = form.watch("supirId");
  const terpilih = kontrak.find((k) => k.id === kontrakId);
  const langsungDitugaskan = Boolean(trukId && supirId);

  const kirim = form.handleSubmit(async (nilai) => {
    setMengirim(true);
    try {
      const hasil = await apiJson<{ rit: { id: string; noDo: string } }>("/api/rit", {
        method: "POST",
        body: nilai,
      });
      toast.success(
        langsungDitugaskan
          ? `DO ${hasil.rit.noDo} terbit dan ditugaskan ke supir`
          : `DO ${hasil.rit.noDo} diterbitkan`,
      );
      router.push(`/rit/${hasil.rit.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menerbitkan DO");
    } finally {
      setMengirim(false);
    }
  });

  return (
    <form onSubmit={kirim} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Kontrak / SPK" galat={galat.kontrakId?.message} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="kontrakId"
            render={({ field }) => (
              <Select
                items={Object.fromEntries(
                  kontrak.map((k) => [k.id, `${k.noSpk} — ${k.shipper}`]),
                )}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? KOSONG)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kontrak yang masih aktif" />
                </SelectTrigger>
                <SelectContent>
                  {kontrak.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.noSpk} — {k.shipper}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        {terpilih ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Lock className="size-3" />
              Tarif yang akan dibekukan ke DO ini
            </div>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Barang</dt>
                <dd>{JENIS_BARANG_LABEL[terpilih.jenisBarang as JenisBarang]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Rute</dt>
                <dd className="text-right">{terpilih.rute}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Tarif shipper</dt>
                <dd className="angka font-medium">
                  {formatRupiah(terpilih.tarifShipperPerTon)} / ton
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Ongkos supir</dt>
                <dd className="angka font-medium">
                  {formatRupiah(terpilih.ongkosSupirPerRit)} / rit
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-muted-foreground">Tonase kontrak</dt>
                <dd className="angka">{formatTon(terpilih.totalTonase * 1000)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <Bidang label="Nomor DO" galat={galat.noDo?.message}>
          <Input {...form.register("noDo")} placeholder="DO/2026/0001" autoFocus />
        </Bidang>

        <Bidang label="Tanggal terbit" galat={galat.tanggalTerbit?.message}>
          <Input {...form.register("tanggalTerbit")} type="date" className="angka" />
        </Bidang>

        <Bidang
          label="Truk"
          galat={galat.trukId?.message}
          petunjuk="Boleh dikosongkan dan dialokasikan nanti"
        >
          <Controller
            control={form.control}
            name="trukId"
            render={({ field }) => (
              <Select
                items={Object.fromEntries(truk.map((t) => [t.id, t.label]))}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? KOSONG)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Belum dialokasikan" />
                </SelectTrigger>
                <SelectContent>
                  {truk.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                      {t.keterangan ? (
                        <span className="text-xs text-muted-foreground">{t.keterangan}</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        <Bidang
          label="Supir"
          galat={galat.supirId?.message}
          petunjuk="Supir langsung dapat notifikasi saat ditugaskan"
        >
          <Controller
            control={form.control}
            name="supirId"
            render={({ field }) => (
              <Select
                items={Object.fromEntries(supir.map((s) => [s.id, s.label]))}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? KOSONG)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Belum dialokasikan" />
                </SelectTrigger>
                <SelectContent>
                  {supir.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        <Bidang label="Catatan" className="sm:col-span-2" galat={galat.catatan?.message}>
          <Textarea
            {...form.register("catatan")}
            rows={2}
            placeholder="Opsional — instruksi khusus untuk rit ini"
          />
        </Bidang>
      </div>

      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {langsungDitugaskan
          ? "Truk dan supir terisi: DO langsung berstatus Ditugaskan dan supir menerima notifikasi."
          : "Tanpa truk + supir, DO berstatus Diterbitkan dan bisa dialokasikan dari halaman detail rit."}
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={mengirim || kontrak.length === 0}>
          {mengirim ? "Menerbitkan…" : "Terbitkan DO"}
        </Button>
        <Button type="button" variant="ghost" size="lg" disabled={mengirim} onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  );
}
