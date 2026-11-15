"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { apiJson } from "@/lib/api-client";
import {
  JENIS_BARANG,
  JENIS_BARANG_LABEL,
  STATUS_KONTRAK,
  STATUS_KONTRAK_LABEL,
  TARIF_SELISIH_PER_KG,
  type JenisBarang,
  type StatusKontrak,
} from "@/lib/constants";
import { formatRupiah } from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bidang } from "./bidang";
import { skemaKontrak, type IsianKontrak } from "./skema";

export type OpsiPilihan = { id: string; nama: string };
export type OpsiLokasi = OpsiPilihan & { jenis: string };

export type KontrakAwal = {
  id: string;
  noSpk: string;
  shipperId: string;
  jenisBarang: string;
  lokasiAsalId: string;
  lokasiTujuanId: string;
  totalTonase: number;
  periodeMulai: Date | string;
  periodeSelesai: Date | string | null;
  tarifShipperPerTon: number;
  ongkosSupirPerRit: number;
  status: string;
};

const TANGGAL_INPUT = "yyyy-MM-dd";

/** Peta nilai→label dipakai Select agar trigger menampilkan nama, bukan id. */
function petaLabel(opsi: OpsiPilihan[]): Record<string, string> {
  return Object.fromEntries(opsi.map((o) => [o.id, o.nama]));
}

export function FormKontrak({
  shipper,
  lokasi,
  kontrak,
  onSelesai,
}: {
  shipper: OpsiPilihan[];
  lokasi: OpsiLokasi[];
  kontrak?: KontrakAwal;
  onSelesai?: () => void;
}) {
  const router = useRouter();
  const [mengirim, setMengirim] = useState(false);

  const form = useForm<IsianKontrak>({
    resolver: zodResolver(skemaKontrak, undefined, { raw: true }) as unknown as Resolver<IsianKontrak>,
    defaultValues: {
      noSpk: kontrak?.noSpk ?? "",
      shipperId: kontrak?.shipperId ?? "",
      jenisBarang: (kontrak?.jenisBarang as JenisBarang) ?? "PALM_KERNEL",
      lokasiAsalId: kontrak?.lokasiAsalId ?? "",
      lokasiTujuanId: kontrak?.lokasiTujuanId ?? "",
      totalTonase: kontrak ? String(kontrak.totalTonase) : "",
      periodeMulai: format(kontrak?.periodeMulai ?? new Date(), TANGGAL_INPUT),
      periodeSelesai: kontrak?.periodeSelesai ? format(kontrak.periodeSelesai, TANGGAL_INPUT) : "",
      tarifShipperPerTon: kontrak ? String(kontrak.tarifShipperPerTon) : "",
      ongkosSupirPerRit: kontrak ? String(kontrak.ongkosSupirPerRit) : "",
      status: (kontrak?.status as StatusKontrak) ?? "AKTIF",
    },
  });

  const galat = form.formState.errors;
  const jenisBarang = form.watch("jenisBarang");
  const tarifSelisih = TARIF_SELISIH_PER_KG[jenisBarang];
  const asal = lokasi.filter((l) => l.jenis === "ASAL" || l.jenis === "KEDUANYA");
  const tujuan = lokasi.filter((l) => l.jenis === "TUJUAN" || l.jenis === "KEDUANYA");

  const kirim = form.handleSubmit(async (nilai) => {
    setMengirim(true);
    try {
      const hasil = await apiJson<{ kontrak: { id: string } }>(
        kontrak ? `/api/kontrak/${kontrak.id}` : "/api/kontrak",
        { method: kontrak ? "PATCH" : "POST", body: nilai },
      );
      toast.success(kontrak ? "Kontrak diperbarui" : `Kontrak ${nilai.noSpk} dibuat`);
      if (kontrak) {
        router.refresh();
        onSelesai?.();
      } else {
        router.push(`/kontrak/${hasil.kontrak.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan kontrak");
    } finally {
      setMengirim(false);
    }
  });

  return (
    <form onSubmit={kirim} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Nomor SPK" galat={galat.noSpk?.message}>
          <Input {...form.register("noSpk")} placeholder="SPK/2026/001" autoFocus />
        </Bidang>

        <Bidang label="Shipper" galat={galat.shipperId?.message}>
          <Controller
            control={form.control}
            name="shipperId"
            render={({ field }) => (
              <Select
                items={petaLabel(shipper)}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih shipper" />
                </SelectTrigger>
                <SelectContent>
                  {shipper.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        <Bidang
          label="Jenis barang"
          galat={galat.jenisBarang?.message}
          petunjuk={
            tarifSelisih === null
              ? "Tidak ada aturan selisih untuk barang ini"
              : `Selisih dinilai ${formatRupiah(tarifSelisih)}/kg`
          }
        >
          <Controller
            control={form.control}
            name="jenisBarang"
            render={({ field }) => (
              <Select
                items={JENIS_BARANG_LABEL}
                value={field.value}
                onValueChange={(v) => field.onChange(v ?? "PALM_KERNEL")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_BARANG.map((j) => (
                    <SelectItem key={j} value={j}>
                      {JENIS_BARANG_LABEL[j]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        <Bidang label="Total tonase (ton)" galat={galat.totalTonase?.message}>
          <Input
            {...form.register("totalTonase")}
            type="number"
            step="0.01"
            min="0"
            className="angka"
            placeholder="300"
          />
        </Bidang>

        <Bidang label="Lokasi asal" galat={galat.lokasiAsalId?.message}>
          <Controller
            control={form.control}
            name="lokasiAsalId"
            render={({ field }) => (
              <Select
                items={petaLabel(asal)}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih lokasi muat" />
                </SelectTrigger>
                <SelectContent>
                  {asal.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        <Bidang label="Lokasi tujuan" galat={galat.lokasiTujuanId?.message}>
          <Controller
            control={form.control}
            name="lokasiTujuanId"
            render={({ field }) => (
              <Select
                items={petaLabel(tujuan)}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih lokasi bongkar" />
                </SelectTrigger>
                <SelectContent>
                  {tujuan.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Bidang>

        <Bidang label="Periode mulai" galat={galat.periodeMulai?.message}>
          <Input {...form.register("periodeMulai")} type="date" className="angka" />
        </Bidang>

        <Bidang
          label="Periode selesai"
          galat={galat.periodeSelesai?.message}
          petunjuk="Kosongkan kalau belum ditentukan"
        >
          <Input {...form.register("periodeSelesai")} type="date" className="angka" />
        </Bidang>

        <Bidang
          label="Tarif shipper per ton (Rp)"
          galat={galat.tarifShipperPerTon?.message}
          petunjuk="Pemasukan APN, dihitung dari netto bongkar"
        >
          <Input
            {...form.register("tarifShipperPerTon")}
            type="number"
            min="0"
            step="1"
            className="angka"
            placeholder="185000"
          />
        </Bidang>

        <Bidang
          label="Ongkos supir per rit (Rp)"
          galat={galat.ongkosSupirPerRit?.message}
          petunjuk="Borongan penuh, tidak dipotong selisih berat"
        >
          <Input
            {...form.register("ongkosSupirPerRit")}
            type="number"
            min="0"
            step="1"
            className="angka"
            placeholder="900000"
          />
        </Bidang>

        {kontrak ? (
          <Bidang label="Status kontrak" galat={galat.status?.message}>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select
                  items={STATUS_KONTRAK_LABEL}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v ?? "AKTIF")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_KONTRAK.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_KONTRAK_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Bidang>
        ) : null}
      </div>

      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Tarif di kontrak hanya berlaku untuk DO yang terbit setelah disimpan. DO yang sudah
        terbit memakai tarif yang disalin saat penerbitannya.
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" disabled={mengirim}>
          {mengirim ? "Menyimpan…" : kontrak ? "Simpan perubahan" : "Simpan kontrak"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={mengirim}
          onClick={() => (onSelesai ? onSelesai() : router.back())}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
