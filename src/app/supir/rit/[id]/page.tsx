import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ambilSesi } from "@/lib/session";
import { catatanTerbaca, statusSebelumKendala } from "@/lib/kendala";
import { withBasePath } from "@/lib/base-path";
import {
  JENIS_FOTO_LABEL,
  STATUS_RIT_BERJALAN,
  STATUS_RIT_LABEL,
  type JenisBarang,
  type JenisFoto,
  type StatusRit,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { KartuTugas } from "@/components/supir/KartuTugas";
import { formatTanggalJam } from "@/components/supir/waktu";
import type { TugasSupir } from "@/components/supir/tipe";

// Detail rit untuk supir: kartu tugas yang sama, ditambah jejak langkah dan
// foto slip yang sudah terkirim. Dipakai untuk memeriksa rit lama dari riwayat.

export default async function HalamanDetailRitSupir({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/login");

  const { id } = await params;
  const rit = await db.rit.findFirst({
    where: { id, supirId: sesi.sub },
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
        orderBy: { waktu: "asc" },
        select: { id: true, ke: true, waktu: true, catatan: true },
      },
      foto: {
        orderBy: { waktu: "asc" },
        select: { id: true, jenis: true, url: true, waktu: true },
      },
    },
  });

  if (!rit) notFound();

  const status = rit.status as StatusRit;
  const kendalaTerakhir = [...rit.riwayatStatus].reverse().find((r) => r.ke === "KENDALA");

  const tugas: TugasSupir = {
    id: rit.id,
    noDo: rit.noDo,
    status,
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
      status === "KENDALA" ? statusSebelumKendala(kendalaTerakhir?.catatan) : null,
  };

  const masihJalan = STATUS_RIT_BERJALAN.includes(status);

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 text-muted-foreground"
        render={<Link href="/supir/riwayat" />}
      >
        <ChevronLeft className="size-4" />
        Riwayat rit
      </Button>

      <KartuTugas tugas={tugas} aksi={masihJalan} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Jejak Langkah</h2>
        <ol className="space-y-3 border-l pl-4">
          {rit.riwayatStatus.map((jejak) => {
            const catatan = catatanTerbaca(jejak.catatan);
            return (
              <li key={jejak.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">
                  {STATUS_RIT_LABEL[jejak.ke as StatusRit] ?? jejak.ke}
                </p>
                <p className="angka text-xs text-muted-foreground">
                  {formatTanggalJam(jejak.waktu)}
                </p>
                {catatan ? <p className="text-xs text-muted-foreground">{catatan}</p> : null}
              </li>
            );
          })}
          {rit.riwayatStatus.length === 0 ? (
            <li className="text-sm text-muted-foreground">Belum ada langkah yang tercatat.</li>
          ) : null}
        </ol>
      </section>

      {rit.foto.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Foto Terkirim</h2>
          <div className="grid grid-cols-2 gap-3">
            {rit.foto.map((f) => (
              <a
                key={f.id}
                href={withBasePath(f.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="space-y-1"
              >
                <img
                  src={withBasePath(f.url)}
                  alt={JENIS_FOTO_LABEL[f.jenis as JenisFoto] ?? "Foto"}
                  className="aspect-square w-full rounded-lg border object-cover"
                />
                <p className="text-xs text-muted-foreground">
                  {JENIS_FOTO_LABEL[f.jenis as JenisFoto] ?? "Foto"}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
