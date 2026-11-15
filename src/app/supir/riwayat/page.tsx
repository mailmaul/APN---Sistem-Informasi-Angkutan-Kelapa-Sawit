import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { ambilSesi } from "@/lib/session";
import { JENIS_BARANG_LABEL, type JenisBarang, type StatusRit } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatTanggalJam } from "@/components/supir/waktu";

// Riwayat rit supir. Tanpa angka rupiah — bayaran dibahas di settlement
// bulanan oleh kantor, bukan di aplikasi supir.

const BATAS = 50;

export default async function HalamanRiwayatSupir() {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/login");

  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);

  const [daftar, selesaiBulanIni] = await Promise.all([
    db.rit.findMany({
      where: { supirId: sesi.sub },
      orderBy: { tanggalTerbit: "desc" },
      take: BATAS,
      select: {
        id: true,
        noDo: true,
        status: true,
        tanggalTerbit: true,
        selesaiBongkar: true,
        truk: { select: { nopol: true } },
        kontrak: {
          select: {
            jenisBarang: true,
            lokasiAsal: { select: { nama: true } },
            lokasiTujuan: { select: { nama: true } },
          },
        },
      },
    }),
    db.rit.count({
      where: { supirId: sesi.sub, status: "SELESAI", selesaiBongkar: { gte: awalBulan } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-lg font-semibold">Riwayat Rit</h1>
        <p className="text-xs text-muted-foreground">
          Selesai bulan ini:{" "}
          <span className="angka font-semibold text-foreground">{selesaiBulanIni}</span>
        </p>
      </div>

      {daftar.length === 0 ? (
        <div className="space-y-4 py-8 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-8" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Belum ada rit atas nama Anda. Begitu kantor menugaskan DO pertama, rit itu akan tercatat
            di sini lengkap dengan jam muat dan bongkarnya.
          </p>
          <Button
            variant="outline"
            className="h-13 w-full rounded-[10px] text-base"
            render={<Link href="/supir" />}
          >
            Kembali ke Tugas
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {daftar.map((rit) => (
            <li key={rit.id}>
              <Link
                href={`/supir/rit/${rit.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="angka truncate text-sm font-semibold">{rit.noDo}</span>
                    <StatusBadge status={rit.status as StatusRit} />
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {rit.kontrak.lokasiAsal.nama} → {rit.kontrak.lokasiTujuan.nama}
                  </p>
                  <p className="angka text-xs text-muted-foreground">
                    {JENIS_BARANG_LABEL[rit.kontrak.jenisBarang as JenisBarang]}
                    {rit.truk ? ` · ${rit.truk.nopol}` : ""} ·{" "}
                    {formatTanggalJam(rit.selesaiBongkar ?? rit.tanggalTerbit)}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
