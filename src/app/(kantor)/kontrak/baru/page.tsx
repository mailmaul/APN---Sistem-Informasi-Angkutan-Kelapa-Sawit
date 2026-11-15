import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormKontrak } from "@/components/kontrak/form-kontrak";

export const dynamic = "force-dynamic";

export default async function HalamanKontrakBaru() {
  const [shipper, lokasi] = await Promise.all([
    db.shipper.findMany({ where: { aktif: true }, select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    db.lokasi.findMany({
      where: { aktif: true },
      select: { id: true, nama: true, jenis: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/kontrak" />}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke daftar kontrak
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Kontrak baru</CardTitle>
          <CardDescription>
            Isi tarif dengan teliti: angka ini akan disalin ke setiap DO yang terbit dari kontrak
            ini dan tidak bisa diubah lagi dari rit yang sudah berjalan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipper.length === 0 || lokasi.length === 0 ? (
            <div className="space-y-2 rounded-md border border-peringatan/30 bg-peringatan/5 p-4 text-sm">
              <p className="font-medium text-peringatan">Master data belum lengkap</p>
              <p className="text-muted-foreground">
                Kontrak butuh minimal satu shipper dan satu lokasi. Lengkapi master data dulu:
              </p>
              <div className="flex gap-2 pt-1">
                {shipper.length === 0 && (
                  <Button variant="outline" size="sm" render={<Link href="/master/shipper" />}>
                    Tambah shipper
                  </Button>
                )}
                {lokasi.length === 0 && (
                  <Button variant="outline" size="sm" render={<Link href="/master/lokasi" />}>
                    Tambah lokasi
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <FormKontrak shipper={shipper} lokasi={lokasi} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
