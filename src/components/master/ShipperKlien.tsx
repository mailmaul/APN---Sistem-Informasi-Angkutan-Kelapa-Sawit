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
import { formatAngka } from "@/lib/perhitungan";
import { AksiBaris } from "./AksiBaris";
import { BadgeAktif } from "./BadgeAktif";
import { Bidang } from "./Bidang";
import { KerangkaMaster } from "./KerangkaMaster";
import { KonfirmasiDialog, type Konfirmasi } from "./KonfirmasiDialog";
import { KosongTabel } from "./KosongTabel";
import { useMaster } from "./useMaster";

export type BarisShipper = {
  id: string;
  nama: string;
  kontak: string | null;
  alamat: string | null;
  aktif: boolean;
  jumlahKontrak: number;
};

const skema = z.object({
  nama: z.string().trim().min(2, "Nama shipper minimal 2 huruf"),
  kontak: z.string().trim().max(60, "Kontak terlalu panjang"),
  alamat: z.string().trim().max(300, "Alamat terlalu panjang"),
  aktif: z.boolean(),
});
type NilaiForm = z.infer<typeof skema>;

const KOSONG: NilaiForm = { nama: "", kontak: "", alamat: "", aktif: true };

export function ShipperKlien({ daftar }: { daftar: BarisShipper[] }) {
  const { sibuk, buat, ubah, hapus, setAktif } = useMaster("/api/shipper");
  const [cari, setCari] = useState("");
  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<BarisShipper | null>(null);
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
    return daftar.filter((s) =>
      [s.nama, s.kontak, s.alamat].some((t) => t?.toLowerCase().includes(kunci)),
    );
  }, [daftar, cari]);

  function bukaTambah() {
    setSunting(null);
    reset(KOSONG);
    setFormBuka(true);
  }

  function bukaUbah(baris: BarisShipper) {
    setSunting(baris);
    reset({
      nama: baris.nama,
      kontak: baris.kontak ?? "",
      alamat: baris.alamat ?? "",
      aktif: baris.aktif,
    });
    setFormBuka(true);
  }

  const simpan = handleSubmit(async (nilai) => {
    const berhasil = sunting ? await ubah(sunting.id, nilai) : await buat(nilai);
    if (berhasil) setFormBuka(false);
  });

  function aksiBaris(baris: BarisShipper) {
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
                  "Shipper tidak akan muncul lagi saat membuat kontrak baru. Kontrak yang sudah berjalan tidak terpengaruh.",
                labelAksi: "Nonaktifkan",
                jalankan: () => setAktif(baris.id, false),
              }),
          }
        : {
            label: "Aktifkan",
            ikon: <PowerIcon />,
            onPilih: () => setAktif(baris.id, true),
          },
      // Hapus permanen hanya aman selama shipper belum pernah punya kontrak.
      ...(baris.jumlahKontrak === 0
        ? [
            {
              label: "Hapus",
              ikon: <Trash2Icon />,
              destruktif: true,
              onPilih: () =>
                setKonfirmasi({
                  judul: `Hapus ${baris.nama}?`,
                  pesan: "Shipper ini belum pernah dipakai kontrak, jadi bisa dihapus permanen.",
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
        deskripsi="Pemilik barang yang memberi SPK ke APN. Tarif angkut diatur per kontrak, bukan di sini."
        cari={cari}
        onCari={setCari}
        placeholderCari="Cari nama atau kontak"
        labelTambah="Tambah shipper"
        onTambah={bukaTambah}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="text-right">Kontrak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {terlihat.length === 0 ? (
              <KosongTabel
                kolom={6}
                judul={daftar.length === 0 ? "Belum ada shipper" : "Tidak ada yang cocok"}
                pesan={
                  daftar.length === 0
                    ? "Tambahkan shipper dulu supaya kontrak dan DO bisa dibuat."
                    : `Tidak ada shipper yang cocok dengan "${cari}".`
                }
                aksi={
                  daftar.length === 0 ? (
                    <Button size="sm" onClick={bukaTambah}>
                      Tambah shipper
                    </Button>
                  ) : null
                }
              />
            ) : (
              terlihat.map((baris) => (
                <TableRow key={baris.id} className="h-11">
                  <TableCell className="font-medium">{baris.nama}</TableCell>
                  <TableCell className="angka text-muted-foreground">
                    {baris.kontak ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[22rem] truncate text-muted-foreground">
                    {baris.alamat ?? "—"}
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
            <DialogTitle>{sunting ? "Ubah shipper" : "Tambah shipper"}</DialogTitle>
            <DialogDescription>
              {sunting
                ? "Perubahan berlaku untuk kontrak baru; kontrak lama tetap seperti semula."
                : "Isi data pemilik barang yang akan diangkut APN."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={simpan} className="grid gap-3">
            <Bidang label="Nama shipper" htmlFor="nama" galat={errors.nama?.message}>
              <Input id="nama" placeholder="PT Sawit Makmur" autoFocus {...register("nama")} />
            </Bidang>

            <Bidang
              label="Kontak"
              htmlFor="kontak"
              galat={errors.kontak?.message}
              petunjuk="Nomor HP atau nama PIC. Boleh dikosongkan."
            >
              <Input id="kontak" placeholder="0812xxxxxxx" {...register("kontak")} />
            </Bidang>

            <Bidang label="Alamat" htmlFor="alamat" galat={errors.alamat?.message}>
              <Textarea id="alamat" rows={2} placeholder="Alamat kantor" {...register("alamat")} />
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
