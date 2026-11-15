import { notFound } from "next/navigation";
import { RincianSettlement } from "@/components/kantor/RincianSettlement";
import { bulanValid, susunSettlementBulan } from "@/lib/settlement";

// Rincian rit penyusun settlement satu bulan, dikelompokkan per supir.

export const dynamic = "force-dynamic";

export default async function HalamanRincianSettlement({
  params,
}: {
  params: Promise<{ bulan: string }>;
}) {
  const { bulan } = await params;
  if (!bulanValid(bulan)) notFound();

  const baris = await susunSettlementBulan(bulan);
  return <RincianSettlement bulan={bulan} baris={baris} />;
}
