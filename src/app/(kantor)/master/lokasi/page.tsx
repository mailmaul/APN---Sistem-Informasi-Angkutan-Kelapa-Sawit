import { db } from "@/lib/db";
import { LokasiKlien, type BarisLokasi } from "@/components/master/LokasiKlien";
import type { JenisLokasi } from "@/lib/constants";

export const metadata = { title: "Lokasi" };

export const dynamic = "force-dynamic";

export default async function HalamanLokasi() {
  const lokasi = await db.lokasi.findMany({
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: { _count: { select: { kontrakAsal: true, kontrakTujuan: true } } },
  });

  const daftar: BarisLokasi[] = lokasi.map((l) => ({
    id: l.id,
    nama: l.nama,
    alamat: l.alamat,
    lat: l.lat,
    lng: l.lng,
    // SQLite menyimpan "enum" sebagai String; nilainya dikunci oleh validasi API.
    jenis: l.jenis as JenisLokasi,
    aktif: l.aktif,
    jumlahKontrak: l._count.kontrakAsal + l._count.kontrakTujuan,
  }));

  return <LokasiKlien daftar={daftar} />;
}
