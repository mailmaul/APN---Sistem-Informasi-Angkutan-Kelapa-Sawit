import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { STATUS_RIT, type StatusRit } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FilterRit } from "@/components/rit/filter-rit";
import { TabelRit, type BarisRit } from "@/components/rit/tabel-rit";

export const dynamic = "force-dynamic";

type Filter = {
  status?: string;
  kontrakId?: string;
  supirId?: string;
  trukId?: string;
  dari?: string;
  sampai?: string;
  q?: string;
};

export default async function HalamanRit({ searchParams }: { searchParams: Promise<Filter> }) {
  const sp = await searchParams;
  const status = sp.status as StatusRit | undefined;
  const q = sp.q?.trim();

  const [rit, kontrak, supir, truk] = await Promise.all([
    db.rit.findMany({
      where: {
        ...(status && STATUS_RIT.includes(status) ? { status } : {}),
        ...(sp.kontrakId ? { kontrakId: sp.kontrakId } : {}),
        ...(sp.supirId ? { supirId: sp.supirId } : {}),
        ...(sp.trukId ? { trukId: sp.trukId } : {}),
        ...(q ? { noDo: { contains: q } } : {}),
        ...(sp.dari || sp.sampai
          ? {
              tanggalTerbit: {
                ...(sp.dari ? { gte: new Date(`${sp.dari}T00:00:00`) } : {}),
                ...(sp.sampai ? { lte: new Date(`${sp.sampai}T23:59:59.999`) } : {}),
              },
            }
          : {}),
      },
      include: {
        kontrak: { select: { id: true, noSpk: true, shipper: { select: { nama: true } } } },
        truk: { select: { nopol: true } },
        supir: { select: { nama: true } },
        penimbangan: { where: { jenis: "BONGKAR" }, select: { netto: true } },
      },
      orderBy: { tanggalTerbit: "desc" },
    }),
    db.kontrak.findMany({ select: { id: true, noSpk: true }, orderBy: { createdAt: "desc" } }),
    db.user.findMany({
      where: { peran: "SUPIR" },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
    db.truk.findMany({ select: { id: true, nopol: true }, orderBy: { nopol: "asc" } }),
  ]);

  const baris: BarisRit[] = rit.map((r) => ({
    id: r.id,
    noDo: r.noDo,
    tanggalTerbit: r.tanggalTerbit.toISOString(),
    noSpk: r.kontrak.noSpk,
    kontrakId: r.kontrak.id,
    shipper: r.kontrak.shipper.nama,
    truk: r.truk?.nopol ?? "",
    supir: r.supir?.nama ?? "",
    nettoBongkar: r.penimbangan.length > 0 ? r.penimbangan[0].netto : null,
    status: r.status as StatusRit,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <FilterRit
          kontrak={kontrak.map((k) => ({ id: k.id, label: k.noSpk }))}
          supir={supir.map((s) => ({ id: s.id, label: s.nama }))}
          truk={truk.map((t) => ({ id: t.id, label: t.nopol }))}
        />
        <Button size="lg" render={<Link href="/rit/baru" />}>
          <Plus data-icon="inline-start" />
          Terbitkan DO
        </Button>
      </div>

      <TabelRit data={baris} />
    </div>
  );
}
