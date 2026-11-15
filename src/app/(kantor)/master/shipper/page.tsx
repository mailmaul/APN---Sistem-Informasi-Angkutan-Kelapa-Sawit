import { db } from "@/lib/db";
import { ShipperKlien, type BarisShipper } from "@/components/master/ShipperKlien";

export const metadata = { title: "Shipper" };

// Master data selalu dibaca segar: daftar ini ikut berubah tiap kali admin
// menyimpan lewat dialog (router.refresh dari sisi klien).
export const dynamic = "force-dynamic";

export default async function HalamanShipper() {
  const shipper = await db.shipper.findMany({
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: { _count: { select: { kontrak: true } } },
  });

  const daftar: BarisShipper[] = shipper.map((s) => ({
    id: s.id,
    nama: s.nama,
    kontak: s.kontak,
    alamat: s.alamat,
    aktif: s.aktif,
    jumlahKontrak: s._count.kontrak,
  }));

  return <ShipperKlien daftar={daftar} />;
}
