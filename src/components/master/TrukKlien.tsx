"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PencilIcon, PowerIcon, PowerOffIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AMBANG_PERINGATAN_TARA_KG } from "@/lib/constants";
import { formatAngka, formatKg, formatTon } from "@/lib/perhitungan";
import { AksiBaris } from "./AksiBaris";
import { BadgeAktif } from "./BadgeAktif";
import { Bidang } from "./Bidang";
import { KerangkaMaster } from "./KerangkaMaster";
import { KonfirmasiDialog, type Konfirmasi } from "./KonfirmasiDialog";
import { KosongTabel } from "./KosongTabel";
import { useMaster } from "./useMaster";

export type BarisTruk = {
  id: string;
  nopol: string;
  taraBaku: number;
  kapasitas: number;
  aktif: boolean;
  catatan: string | null;
  jumlahRit: number;
};

/** Berat selalu bilangan bulat kilogram — tidak ada koma di slip timbang. */
const beratKg = (pesan: string) =>
  z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) > 0, pesan);

const skema = z
  .object({
    nopol: z.string().trim().min(3, "Nomor polisi minimal 3 karakter").max(15, "Terlalu panjang"),
    taraBaku: beratKg("Tara baku harus angka kg lebih dari 0"),
    kapasitas: beratKg("Kapasitas harus angka kg lebih dari 0"),
    aktif: z.boolean(),
    catatan: z.string().trim().max(300, "Catatan terlalu panjang"),
  })
  .refine((v) => Number(v.kapasitas) > Number(v.taraBaku), {
    error: "Kapasitas harus lebih besar dari tara baku",
    path: ["kapasitas"],
  });
type NilaiForm = z.infer<typeof skema>;

const KOSONG: NilaiForm = {
  nopol: "",
  taraBaku: "",
  kapasitas: "",
  aktif: true,
  catatan: "",
};

export function TrukKlien({ daftar }: { daftar: BarisTruk[] }) {
  const { sibuk, buat, ubah, hapus, setAktif } = useMaster("/api/truk");
  const [cari, setCari] = useState("");
  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<BarisTruk | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NilaiForm>({ resolver: zodResolver(skema), defaultValues: KOSONG });

  const terlihat = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return daftar;
    return daftar.filter((t) =>
      [t.nopol, t.catatan].some((teks) => teks?.toLowerCase().includes(kunci)),
    );
  }, [daftar, cari]);

  function bukaTambah() {
    setSunting(null);
    reset(KOSONG);
    setFormBuka(true);
  }

  function bukaUbah(baris: BarisTruk) {
    setSunting(baris);
    reset({
      nopol: baris.nopol,
      taraBaku: String(baris.taraBaku),
      kapasitas: String(baris.kapasitas),
      aktif: baris.aktif,
      catatan: baris.catatan ?? "",
    });
    setFormBuka(true);
  }

  const simpan = handleSubmit(async (nilai) => {
    const muatan = {
      nopol: nilai.nopol,
      taraBaku: Number(nilai.taraBaku),
      kapasitas: Number(nilai.kapasitas),
      aktif: nilai.aktif,
      catatan: nilai.catatan,
    };
    const berhasil = sunting ? await ubah(sunting.id, muatan) : await buat(muatan);
    if (berhasil) setFormBuka(false);
  });

  function aksiBaris(baris: BarisTruk) {
    return [
      { label: "Ubah", ikon: <PencilIcon />, onPilih: () => bukaUbah(baris) },
      baris.aktif
        ? {
            label: "Nonaktifkan",
            ikon: <PowerOffIcon />,
            onPilih: () =>
              setKonfirmasi({
                judul: `Nonaktifkan ${baris.nopol}?`,
                pesan:
                  "Truk tidak akan muncul lagi saat mengalokasikan armada. Rit yang sedang jalan tidak terganggu.",
                labelAksi: "Nonaktifkan",
                jalankan: () => setAktif(baris.id, false),
              }),
          }
        : {
            label: "Aktifkan",
            ikon: <PowerIcon />,
            onPilih: () => setAktif(baris.id, true),
          },
      ...(baris.jumlahRit === 0
        ? [
            {
              label: "Hapus",
              ikon: <Trash2Icon />,
              destruktif: true,
              onPilih: () =>
                setKonfirmasi({
                  judul: `Hapus ${baris.nopol}?`,
                  pesan: "Truk ini belum pernah dipakai rit, jadi bisa dihapus permanen.",
                  labelAksi: "Hapus permanen",
                  destruktif: true,
                  jalankan: () => hapus(baris.id),
                }),
            },
          ]
        : []),
    ];
  }

  return (
    <>
      <KerangkaMaster
        deskripsi={`Armada APN. Tara baku dipakai sebagai pembanding slip timbang — beda di atas ${formatKg(AMBANG_PERINGATAN_TARA_KG)} akan diperingatkan saat input.`}
        cari={cari}
        onCari={setCari}
        placeholderCari="Cari nomor polisi"
        labelTambah="Tambah truk"
        onTambah={bukaTambah}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nopol</TableHead>
              <TableHead className="text-right">Tara baku</TableHead>
              <TableHead className="text-right">Kapasitas</TableHead>
              <TableHead className="text-right">Muatan bersih</TableHead>
              <TableHead className="text-right">Rit</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {terlihat.length === 0 ? (
              <KosongTabel
                kolom={8}
                judul={daftar.length === 0 ? "Belum ada truk" : "Tidak ada yang cocok"}
                pesan={
                  daftar.length === 0
                    ? "Daftarkan armada dulu supaya DO bisa dialokasikan ke truk."
                    : `Tidak ada truk yang cocok dengan "${cari}".`
                }
                aksi={
                  daftar.length === 0 ? (
                    <Button size="sm" onClick={bukaTambah}>
                      Tambah truk
                    </Button>
                  ) : null
                }
              />
            ) : (
              terlihat.map((baris) => (
                <TableRow key={baris.id} className="h-11">
                  <TableCell className="angka font-medium">{baris.nopol}</TableCell>
                  <TableCell className="angka text-right">{formatKg(baris.taraBaku)}</TableCell>
                  <TableCell className="angka text-right">{formatKg(baris.kapasitas)}</TableCell>
                  <TableCell className="angka text-right text-muted-foreground">
                    {formatTon(baris.kapasitas - baris.taraBaku)}
                  </TableCell>
                  <TableCell className="angka text-right">{formatAngka(baris.jumlahRit)}</TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                    {baris.catatan ?? "—"}
                  </TableCell>
                  <TableCell>
                    <BadgeAktif aktif={baris.aktif} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AksiBaris aksi={aksiBaris(baris)} sibuk={sibuk} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </KerangkaMaster>

      <Dialog open={formBuka} onOpenChange={setFormBuka}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sunting ? "Ubah truk" : "Tambah truk"}</DialogTitle>
            <DialogDescription>
              Berat ditulis dalam kilogram tanpa titik. Kapasitas adalah berat kotor maksimum truk.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={simpan} className="grid gap-3">
            <Bidang label="Nomor polisi" htmlFor="nopol" galat={errors.nopol?.message}>
              <Input
                id="nopol"
                placeholder="BK 1234 AB"
                autoFocus
                className="angka uppercase"
                {...register("nopol")}
              />
            </Bidang>

            <div className="grid grid-cols-2 gap-3">
              <Bidang label="Tara baku (kg)" htmlFor="taraBaku" galat={errors.taraBaku?.message}>
                <Input
                  id="taraBaku"
                  inputMode="numeric"
                  placeholder="8500"
                  className="angka"
                  {...register("taraBaku")}
                />
              </Bidang>
              <Bidang label="Kapasitas (kg)" htmlFor="kapasitas" galat={errors.kapasitas?.message}>
                <Input
                  id="kapasitas"
                  inputMode="numeric"
                  placeholder="25000"
                  className="angka"
                  {...register("kapasitas")}
                />
              </Bidang>
            </div>

            <Bidang label="Catatan" htmlFor="catatan" galat={errors.catatan?.message}>
              <Textarea
                id="catatan"
                rows={2}
                placeholder="Mis. ban belakang baru diganti"
                {...register("catatan")}
              />
            </Bidang>

            <Controller
              control={control}
              name="aktif"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aktif"
                    checked={field.value}
                    onCheckedChange={(nilai) => field.onChange(nilai)}
                  />
                  <Label htmlFor="aktif" className="font-normal">
                    Aktif — siap dialokasikan ke rit
                  </Label>
                </div>
              )}
            />

            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={() => setFormBuka(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={sibuk}>
                {sibuk ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <KonfirmasiDialog
        konfirmasi={konfirmasi}
        onTutup={() => setKonfirmasi(null)}
        sibuk={sibuk}
      />
    </>
  );
}
