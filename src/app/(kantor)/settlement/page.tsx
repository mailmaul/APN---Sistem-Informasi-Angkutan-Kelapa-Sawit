import { SettlementKlien, type BarisRingkas } from "@/components/kantor/SettlementKlien";
import { bulanValid, susunSettlementBulan } from "@/lib/settlement";
import { kunciBulan } from "@/lib/statistik";

// Rekap settlement bulanan. Angka dihitung ulang tiap kali halaman dibuka,
// jadi draft yang sudah basi langsung ketahuan.

export const dynamic = "force-dynamic";

export default async function HalamanSettlement({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const param = await searchParams;
  const bulan = param.bulan && bulanValid(param.bulan) ? param.bulan : kunciBulan(new Date());
  const baris = await susunSettlementBulan(bulan);

  // Rincian rit tidak perlu ikut ke klien pada halaman daftar.
  const ringkas: BarisRingkas[] = baris.map((b) => ({
    supirId: b.supirId,
    nama: b.nama,
    hp: b.hp,
    jumlahRit: b.jumlahRit,
    totalOngkos: b.totalOngkos,
    totalPotongan: b.totalPotongan,
    totalBayar: b.totalBayar,
    tersimpan: b.tersimpan,
    selaras: b.selaras,
  }));

  return <SettlementKlien bulan={bulan} baris={ringkas} />;
}
