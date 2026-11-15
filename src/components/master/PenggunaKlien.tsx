"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRoundIcon, PencilIcon, PowerIcon, PowerOffIcon, Trash2Icon } from "lucide-react";
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
import { PERAN, PERAN_LABEL, type Peran } from "@/lib/constants";
import { formatAngka } from "@/lib/perhitungan";
import { AksiBaris } from "./AksiBaris";
import { BadgeAktif } from "./BadgeAktif";
import { Bidang } from "./Bidang";
import { KerangkaMaster } from "./KerangkaMaster";
import { KonfirmasiDialog, type Konfirmasi } from "./KonfirmasiDialog";
import { KosongTabel } from "./KosongTabel";
import { useMaster } from "./useMaster";

export type BarisPengguna = {
  id: string;
  nama: string;
  hp: string;
  peran: Peran;
  aktif: boolean;
  jumlahRit: number;
  punyaJejak: boolean;
};

const skema = z
  .object({
    // Ikut dibawa di nilai form supaya aturan password bisa beda antara
    // membuat akun baru dan menyunting akun lama.
    mode: z.enum(["buat", "ubah"]),
    nama: z.string().trim().min(2, "Nama minimal 2 huruf"),
    hp: z
      .string()
      .trim()
      .refine((v) => /^\+?[0-9\s.()-]{8,25}$/.test(v), "Nomor HP harus 8-20 angka"),
    peran: z.enum(PERAN),
    aktif: z.boolean(),
    password: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "buat" && v.password.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password wajib diisi, minimal 6 karakter",
      });
    }
    if (v.mode === "ubah" && v.password !== "" && v.password.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password baru minimal 6 karakter",
      });
    }
  });
type NilaiForm = z.infer<typeof skema>;

const skemaReset = z.object({
  password: z.string().min(6, "Password baru minimal 6 karakter"),
});

const PILIHAN_PERAN = PERAN.map((p) => ({ value: p, label: PERAN_LABEL[p] }));

export function PenggunaKlien({
  daftar,
  peranSesi,
  idSesi,
}: {
  daftar: BarisPengguna[];
  peranSesi: Peran;
  idSesi: string;
}) {
  const { sibuk, buat, ubah, hapus, setAktif } = useMaster("/api/pengguna");
  const [cari, setCari] = useState("");
  const [formBuka, setFormBuka] = useState(false);
  const [sunting, setSunting] = useState<BarisPengguna | null>(null);
  const [resetUntuk, setResetUntuk] = useState<BarisPengguna | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi | null>(null);

  // Hanya owner yang boleh menentukan peran — admin sebatas menambah supir.
  const bolehAturPeran = peranSesi === "OWNER";

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NilaiForm>({
    resolver: zodResolver(skema),
    defaultValues: {
      mode: "buat",
      nama: "",
      hp: "",
      peran: "SUPIR",
      aktif: true,
      password: "",
    },
  });

  const formReset = useForm<{ password: string }>({
    resolver: zodResolver(skemaReset),
    defaultValues: { password: "" },
  });

  const terlihat = useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return daftar;
    return daftar.filter((p) =>
      [p.nama, p.hp, PERAN_LABEL[p.peran]].some((t) => t.toLowerCase().includes(kunci)),
    );
  }, [daftar, cari]);

  function bukaTambah() {
    setSunting(null);
    reset({ mode: "buat", nama: "", hp: "", peran: "SUPIR", aktif: true, password: "" });
    setFormBuka(true);
  }

  function bukaUbah(baris: BarisPengguna) {
    setSunting(baris);
    reset({
      mode: "ubah",
      nama: baris.nama,
      hp: baris.hp,
      peran: baris.peran,
      aktif: baris.aktif,
      password: "",
    });
    setFormBuka(true);
  }

  const simpan = handleSubmit(async (nilai) => {
    const dasar = {
      nama: nilai.nama,
      hp: nilai.hp,
      peran: nilai.peran,
      aktif: nilai.aktif,
    };
    const berhasil = sunting
      ? // Password kosong berarti dibiarkan apa adanya.
        await ubah(sunting.id, nilai.password ? { ...dasar, password: nilai.password } : dasar)
      : await buat({ ...dasar, password: nilai.password });
    if (berhasil) setFormBuka(false);
  });

  const kirimReset = formReset.handleSubmit(async (nilai) => {
    if (!resetUntuk) return;
    if (await ubah(resetUntuk.id, { password: nilai.password })) {
      setResetUntuk(null);
      formReset.reset({ password: "" });
    }
  });

  function aksiBaris(baris: BarisPengguna) {
    const diriSendiri = baris.id === idSesi;
    return [
      { label: "Ubah", ikon: <PencilIcon />, onPilih: () => bukaUbah(baris) },
      {
        label: "Reset password",
        ikon: <KeyRoundIcon />,
        onPilih: () => {
          formReset.reset({ password: "" });
          setResetUntuk(baris);
        },
      },
      // Akun sendiri sengaja tidak bisa dimatikan supaya tidak terkunci keluar.
      ...(diriSendiri
        ? []
        : [
            baris.aktif
              ? {
                  label: "Nonaktifkan",
                  ikon: <PowerOffIcon />,
                  onPilih: () =>
                    setKonfirmasi({
                      judul: `Nonaktifkan ${baris.nama}?`,
                      pesan:
                        baris.peran === "SUPIR"
                          ? "Supir tidak bisa login lagi dan tidak muncul saat alokasi rit."
                          : "Pengguna tidak bisa login lagi ke area kantor.",
                      labelAksi: "Nonaktifkan",
                      jalankan: () => setAktif(baris.id, false),
                    }),
                }
              : {
                  label: "Aktifkan",
                  ikon: <PowerIcon />,
                  onPilih: () => setAktif(baris.id, true),
                },
          ]),
      ...(!diriSendiri && !baris.punyaJejak
        ? [
            {
              label: "Hapus",
              ikon: <Trash2Icon />,
              destruktif: true,
              onPilih: () =>
                setKonfirmasi({
                  judul: `Hapus ${baris.nama}?`,
                  pesan: "Pengguna ini belum punya riwayat kerja, jadi bisa dihapus permanen.",
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
        deskripsi="Akun owner, admin kantor, dan supir. Login memakai nomor HP — akun yang dinonaktifkan langsung ditolak saat login."
        cari={cari}
        onCari={setCari}
        placeholderCari="Cari nama atau nomor HP"
        labelTambah="Tambah pengguna"
        onTambah={bukaTambah}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama</TableHead>
              <TableHead>Nomor HP</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="text-right">Rit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {terlihat.length === 0 ? (
              <KosongTabel
                kolom={6}
                judul={daftar.length === 0 ? "Belum ada pengguna" : "Tidak ada yang cocok"}
                pesan={
                  daftar.length === 0
                    ? "Buat akun supir dan admin supaya rit bisa ditugaskan."
                    : `Tidak ada pengguna yang cocok dengan "${cari}".`
                }
                aksi={
                  daftar.length === 0 ? (
                    <Button size="sm" onClick={bukaTambah}>
                      Tambah pengguna
                    </Button>
                  ) : null
                }
              />
            ) : (
              terlihat.map((baris) => (
                <TableRow key={baris.id} className="h-11">
                  <TableCell className="font-medium">
                    {baris.nama}
                    {baris.id === idSesi ? (
                      <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="angka text-muted-foreground">{baris.hp}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {PERAN_LABEL[baris.peran]}
                  </TableCell>
                  <TableCell className="angka text-right">
                    {baris.peran === "SUPIR" ? formatAngka(baris.jumlahRit) : "—"}
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
            <DialogTitle>{sunting ? "Ubah pengguna" : "Tambah pengguna"}</DialogTitle>
            <DialogDescription>
              {sunting
                ? "Kosongkan password kalau tidak ingin menggantinya."
                : "Nomor HP dipakai sebagai nama pengguna saat login."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={simpan} className="grid gap-3">
            <Bidang label="Nama lengkap" htmlFor="nama" galat={errors.nama?.message}>
              <Input id="nama" placeholder="Budi Santoso" autoFocus {...register("nama")} />
            </Bidang>

            <Bidang
              label="Nomor HP"
              htmlFor="hp"
              galat={errors.hp?.message}
              petunjuk="Dipakai untuk login. Harus unik."
            >
              <Input
                id="hp"
                inputMode="tel"
                placeholder="081311110001"
                className="angka"
                {...register("hp")}
              />
            </Bidang>

            <Controller
              control={control}
              name="peran"
              render={({ field }) => (
                <Bidang
                  label="Peran"
                  galat={errors.peran?.message}
                  petunjuk={bolehAturPeran ? undefined : "Hanya owner yang boleh mengubah peran."}
                >
                  <Select
                    items={PILIHAN_PERAN}
                    value={field.value}
                    onValueChange={(nilai) => field.onChange(nilai as Peran)}
                    disabled={!bolehAturPeran}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      {PILIHAN_PERAN.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Bidang>
              )}
            />

            <Bidang
              label={sunting ? "Password baru" : "Password"}
              htmlFor="password"
              galat={errors.password?.message}
              petunjuk={sunting ? "Biarkan kosong agar password lama tetap dipakai." : undefined}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={sunting ? "••••••" : "Minimal 6 karakter"}
                {...register("password")}
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
                    disabled={sunting?.id === idSesi}
                  />
                  <Label htmlFor="aktif" className="font-normal">
                    Aktif — boleh login
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

      <Dialog
        open={resetUntuk !== null}
        onOpenChange={(buka) => !buka && setResetUntuk(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Password baru untuk {resetUntuk?.nama}. Sampaikan langsung ke yang bersangkutan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={kirimReset} className="grid gap-3">
            <Bidang
              label="Password baru"
              htmlFor="password-reset"
              galat={formReset.formState.errors.password?.message}
            >
              <Input
                id="password-reset"
                type="password"
                autoComplete="new-password"
                autoFocus
                placeholder="Minimal 6 karakter"
                {...formReset.register("password")}
              />
            </Bidang>

            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={() => setResetUntuk(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={sibuk}>
                {sibuk ? "Menyimpan…" : "Simpan password"}
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
