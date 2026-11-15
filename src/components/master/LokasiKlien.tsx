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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { JENIS_LOKASI, JENIS_LOKASI_LABEL, type JenisLokasi } from "@/lib/constants";
import { formatAngka } from "@/lib/perhitungan";
import { AksiBaris } from "./AksiBaris";
import { BadgeAktif } from "./BadgeAktif";
import { Bidang } from "./Bidang";
import { KerangkaMaster } from "./KerangkaMaster";
import { KonfirmasiDialog, type Konfirmasi } from "./KonfirmasiDialog";
import { KosongTabel } from "./KosongTabel";
import { useMaster } from "./useMaster";

export type BarisLokasi = {
  id: string;
  nama: string;
  alamat: string | null;
  lat: number | null;
  lng: number | null;
  jenis: JenisLokasi;
  aktif: boolean;
  jumlahKontrak: number;
};

/** Koordinat diketik sebagai teks supaya kolom boleh benar-benar dikosongkan. */
const koordinat = (maks: number, pesan: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (v !== "-" && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= maks), pesan);

const skema = z.object({
  nama: z.string().trim().min(2, "Nama lokasi minimal 2 huruf"),
  alamat: z.string().trim().max(300, "Alamat terlalu panjang"),
  lat: koordinat(90, "Lintang harus angka antara -90 dan 90"),
  lng: koordinat(180, "Bujur harus angka antara -180 dan 180"),
  jenis: z.enum(JENIS_LOKASI),
  aktif: z.boolean(),
});
type NilaiForm = z.infer<typeof skema>;

const KOSONG: NilaiForm = {
  nama: "",
  alamat: "",
  lat: "",
  lng: "",
  jenis: "KEDUANYA",
  aktif: true,
};

const PILIHAN_JENIS = JENIS_LOKASI.map((j) => ({ value: j, label: JENIS_LOKASI_LABEL[j] }));

export function LokasiKlien({ daftar }: { daftar: BarisLokasi[] }) {
  const { sibuk, buat, ubah, hapus, setAktif } = useMaster("/api/lokasi");
  const [cari, setCari] = useState("");
  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<BarisLokasi | null>(null);
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
    return daftar.filter((l) =>
      [l.nama, l.alamat, JENIS_LOKASI_LABEL[l.jenis]].some((t) => t?.toLowerCase().includes(kunci)),
    );
  }, [daftar, cari]);

  function bukaTambah() {
    setSunting(null);
    reset(KOSONG);
    setFormBuka(true);
  }

  function bukaUbah(baris: BarisLokasi) {
    setSunting(baris);
    reset({
      nama: baris.nama,
      alamat: baris.alamat ?? "",
      lat: baris.lat === null ? "" : String(baris.lat),
      lng: baris.lng === null ? "" : String(baris.lng),
      jenis: baris.jenis,
      aktif: baris.aktif,
    });
    setFormBuka(true);
  }

  const simpan = handleSubmit(async (nilai) => {
    const muatan = {
      nama: nilai.nama,
      alamat: nilai.alamat,
      lat: nilai.lat === "" ? null : Number(nilai.lat),
      lng: nilai.lng === "" ? null : Number(nilai.lng),
      jenis: nilai.jenis,
      aktif: nilai.aktif,
    };
    const berhasil = sunting ? await ubah(sunting.id, muatan) : await buat(muatan);
    if (berhasil) setFormBuka(false);
  });

  function aksiBaris(baris: BarisLokasi) {
    return [
      { label: "Ubah", ikon: <PencilIcon />, onPilih: () => bukaUbah(baris) },
      baris.aktif
        ? {
            label: "Nonaktifkan",
            ikon: <PowerOffIcon />,
            onPilih: () =>
              setKonfirmasi({
                judul: `Nonaktifkan ${baris.nama}?`,
                pesan:
                  "Lokasi tidak bisa dipilih lagi pada kontrak baru. Kontrak yang memakainya tetap utuh.",
                labelAksi: "Nonaktifkan",
                jalankan: () => setAktif(baris.id, false),
              }),
          }
        : {
            label: "Aktifkan",
            ikon: <PowerIcon />,
            onPilih: () => setAktif(baris.id, true),
          },
      ...(baris.jumlahKontrak === 0
        ? [
            {
              label: "Hapus",
              ikon: <Trash2Icon />,
              destruktif: true,
              onPilih: () =>
                setKonfirmasi({
                  judul: `Hapus ${baris.nama}?`,
                  pesan: "Lokasi ini belum pernah dipakai kontrak, jadi bisa dihapus permanen.",
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
        deskripsi="Titik muat dan bongkar. Koordinat dipakai untuk peta pelacakan dan pencatatan lokasi di tiap checkpoint."
        cari={cari}
        onCari={setCari}
        placeholderCari="Cari nama atau alamat"
        labelTambah="Tambah lokasi"
        onTambah={bukaTambah}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Koordinat</TableHead>
              <TableHead className="text-right">Kontrak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {terlihat.length === 0 ? (
              <KosongTabel
                kolom={7}
                judul={daftar.length === 0 ? "Belum ada lokasi" : "Tidak ada yang cocok"}
                pesan={
                  daftar.length === 0
                    ? "Daftarkan pabrik asal dan tujuan bongkar supaya kontrak bisa menunjuk rutenya."
                    : `Tidak ada lokasi yang cocok dengan "${cari}".`
                }
                aksi={
                  daftar.length === 0 ? (
                    <Button size="sm" onClick={bukaTambah}>
                      Tambah lokasi
                    </Button>
                  ) : null
                }
              />
            ) : (
              terlihat.map((baris) => (
                <TableRow key={baris.id} className="h-11">
                  <TableCell className="font-medium">{baris.nama}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {JENIS_LOKASI_LABEL[baris.jenis]}
                  </TableCell>
                  <TableCell className="max-w-[20rem] truncate text-muted-foreground">
                    {baris.alamat ?? "—"}
                  </TableCell>
                  <TableCell className="angka text-muted-foreground">
                    {baris.lat !== null && baris.lng !== null
                      ? `${baris.lat.toFixed(5)}, ${baris.lng.toFixed(5)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="angka text-right">
                    {formatAngka(baris.jumlahKontrak)}
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
            <DialogTitle>{sunting ? "Ubah lokasi" : "Tambah lokasi"}</DialogTitle>
            <DialogDescription>
              Pilih jenisnya sesuai pemakaian: tempat muat, tempat bongkar, atau keduanya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={simpan} className="grid gap-3">
            <Bidang label="Nama lokasi" htmlFor="nama" galat={errors.nama?.message}>
              <Input id="nama" placeholder="PKS Tanjung Morawa" autoFocus {...register("nama")} />
            </Bidang>

            <Controller
              control={control}
              name="jenis"
              render={({ field }) => (
                <Bidang label="Jenis" galat={errors.jenis?.message}>
                  <Select
                    items={PILIHAN_JENIS}
                    value={field.value}
                    onValueChange={(nilai) => field.onChange(nilai as JenisLokasi)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih jenis lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {PILIHAN_JENIS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Bidang>
              )}
            />

            <Bidang label="Alamat" htmlFor="alamat" galat={errors.alamat?.message}>
              <Textarea id="alamat" rows={2} placeholder="Alamat lengkap" {...register("alamat")} />
            </Bidang>

            <div className="grid grid-cols-2 gap-3">
              <Bidang
                label="Lintang (lat)"
                htmlFor="lat"
                galat={errors.lat?.message}
                petunjuk="Boleh dikosongkan"
              >
                <Input id="lat" inputMode="decimal" placeholder="3.58333" {...register("lat")} />
              </Bidang>
              <Bidang
                label="Bujur (lng)"
                htmlFor="lng"
                galat={errors.lng?.message}
                petunjuk="Boleh dikosongkan"
              >
                <Input id="lng" inputMode="decimal" placeholder="98.67222" {...register("lng")} />
              </Bidang>
            </div>

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
                    Aktif — bisa dipilih saat membuat kontrak
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
