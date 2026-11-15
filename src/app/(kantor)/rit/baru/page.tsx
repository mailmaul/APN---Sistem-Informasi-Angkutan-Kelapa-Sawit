import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormTerbitDo } from "@/components/rit/form-terbit-do";

export const dynamic = "force-dynamic";

export default async function HalamanTerbitkanDo({
  searchParams,
}: {
  searchParams: Promise<{ kontrak?: string }>;
}) {
  const sp = await searchParams;

  const [kontrak, truk, supir] = await Promise.all([
    db.kontrak.findMany({
      where: { status: "AKTIF" },
      include: {
        shipper: { select: { nama: true } },
        lokasiAsal: { select: { nama: true } },
        lokasiTujuan: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.truk.findMany({ where: { aktif: true }, orderBy: { nopol: "asc" } }),
    db.user.findMany({
      where: { peran: "SUPIR", aktif: true },
      select: { id: true, nama: true, hp: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/rit" />}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke daftar rit
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Terbitkan DO</CardTitle>
          <CardDescription>
            Satu DO sama dengan satu rit dan satu truk. Tarif shipper dan ongkos supir disalin
            dari kontrak saat DO ini disimpan, lalu dibekukan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kontrak.length === 0 ? (
            <div className="space-y-2 rounded-md border border-peringatan/30 bg-peringatan/5 p-4 text-sm">
              <p className="font-medium text-peringatan">Belum ada kontrak aktif</p>
              <p className="text-muted-foreground">
                DO hanya bisa diterbitkan dari kontrak berstatus Aktif, karena tarifnya diambil
                dari sana.
              </p>
              <div className="pt-1">
                <Button variant="outline" size="sm" render={<Link href="/kontrak/baru" />}>
                  Buat kontrak
                </Button>
              </div>
            </div>
          ) : (
            <FormTerbitDo
              kontrakAwal={sp.kontrak}
              kontrak={kontrak.map((k) => ({
                id: k.id,
                noSpk: k.noSpk,
                shipper: k.shipper.nama,
                jenisBarang: k.jenisBarang,
                rute: `${k.lokasiAsal.nama} → ${k.lokasiTujuan.nama}`,
                totalTonase: k.totalTonase,
                tarifShipperPerKg: k.tarifShipperPerKg,
                ongkosSupirPerRit: k.ongkosSupirPerRit,
              }))}
              truk={truk.map((t) => ({
                id: t.id,
                label: t.nopol,
                keterangan: `tara baku ${formatKg(t.taraBaku)}`,
              }))}
              supir={supir.map((s) => ({ id: s.id, label: s.nama, keterangan: s.hp }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
