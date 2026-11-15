import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, History } from "lucide-react";
import { db } from "@/lib/db";
import { ambilSesi } from "@/lib/session";
import { statusSebelumKendala } from "@/lib/kendala";
import { STATUS_RIT_BERJALAN, type JenisBarang, type StatusRit } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { KartuTugas } from "@/components/supir/KartuTugas";
import type { TugasSupir } from "@/components/supir/tipe";

// Layar utama supir: tugas yang sedang berjalan, tidak lebih.
// Kalau ada dua rit berjalan (jarang, tapi mungkin saat alokasi diperbaiki),
// yang ditampilkan adalah DO terbit paling awal — itu yang harus dikerjakan dulu.

export default async function HalamanTugasSupir() {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/login");

  const rit = await db.rit.findFirst({
    where: { supirId: sesi.sub, status: { in: STATUS_RIT_BERJALAN } },
    orderBy: [{ tanggalTerbit: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      noDo: true,
      status: true,
      tanggalTerbit: true,
      tibaMuat: true,
      selesaiMuat: true,
      tibaBongkar: true,
      selesaiBongkar: true,
      truk: { select: { nopol: true } },
      kontrak: {
        select: {
          noSpk: true,
          jenisBarang: true,
          shipper: { select: { nama: true } },
          lokasiAsal: { select: { nama: true, alamat: true } },
          lokasiTujuan: { select: { nama: true, alamat: true } },
        },
      },
      riwayatStatus: {
        where: { ke: "KENDALA" },
        orderBy: { waktu: "desc" },
        take: 1,
        select: { catatan: true },
      },
    },
  });

  if (!rit) {
    const selesai = await db.rit.count({ where: { supirId: sesi.sub, status: "SELESAI" } });
    return <TanpaTugas nama={sesi.nama} ritSelesai={selesai} />;
  }

  const tugas: TugasSupir = {
    id: rit.id,
    noDo: rit.noDo,
    status: rit.status as StatusRit,
    jenisBarang: rit.kontrak.jenisBarang as JenisBarang,
    nopol: rit.truk?.nopol ?? null,
    shipper: rit.kontrak.shipper.nama,
    noSpk: rit.kontrak.noSpk,
    asal: rit.kontrak.lokasiAsal.nama,
    asalAlamat: rit.kontrak.lokasiAsal.alamat,
    tujuan: rit.kontrak.lokasiTujuan.nama,
    tujuanAlamat: rit.kontrak.lokasiTujuan.alamat,
    tanggalTerbit: rit.tanggalTerbit.toISOString(),
    tibaMuat: rit.tibaMuat?.toISOString() ?? null,
    selesaiMuat: rit.selesaiMuat?.toISOString() ?? null,
    tibaBongkar: rit.tibaBongkar?.toISOString() ?? null,
    selesaiBongkar: rit.selesaiBongkar?.toISOString() ?? null,
    statusSebelumKendala:
      rit.status === "KENDALA" ? statusSebelumKendala(rit.riwayatStatus[0]?.catatan) : null,
  };

  return <KartuTugas tugas={tugas} />;
}

function TanpaTugas({ nama, ritSelesai }: { nama: string; ritSelesai: number }) {
  return (
    <div className="space-y-4 py-6 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sukses/10 text-sukses">
        <CheckCircle2 className="size-8" />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Belum ada tugas, {nama.split(" ")[0]}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Semua rit Anda sudah beres. Begitu kantor menugaskan DO baru, tugasnya langsung muncul di
          layar ini — biarkan pemberitahuan menyala supaya tidak terlewat.
        </p>
      </div>
      {ritSelesai > 0 ? (
        <p className="text-sm text-muted-foreground">
          Total rit selesai: <span className="angka font-semibold text-foreground">{ritSelesai}</span>
        </p>
      ) : null}
      <Button
        variant="outline"
        className="h-13 w-full rounded-[10px] text-base"
        render={<Link href="/supir/riwayat" />}
      >
        <History className="size-5" />
        Lihat Riwayat Rit
      </Button>
    </div>
  );
}
