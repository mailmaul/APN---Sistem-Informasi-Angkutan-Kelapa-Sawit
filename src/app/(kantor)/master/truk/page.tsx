import { db } from "@/lib/db";
import { TrukKlien, type BarisTruk } from "@/components/master/TrukKlien";

export const metadata = { title: "Armada" };

export const dynamic = "force-dynamic";

export default async function HalamanTruk() {
  const truk = await db.truk.findMany({
    orderBy: [{ aktif: "desc" }, { nopol: "asc" }],
    include: { _count: { select: { rit: true } } },
  });

  const daftar: BarisTruk[] = truk.map((t) => ({
    id: t.id,
    nopol: t.nopol,
    taraBaku: t.taraBaku,
    kapasitas: t.kapasitas,
    aktif: t.aktif,
    catatan: t.catatan,
    jumlahRit: t._count.rit,
  }));

  return <TrukKlien daftar={daftar} />;
}
