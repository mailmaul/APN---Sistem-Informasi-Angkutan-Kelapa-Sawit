import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ambilSesi } from "@/lib/session";
import { PenggunaKlien, type BarisPengguna } from "@/components/master/PenggunaKlien";
import type { Peran } from "@/lib/constants";

export const metadata = { title: "Pengguna" };

export const dynamic = "force-dynamic";

export default async function HalamanPengguna() {
  const sesi = await ambilSesi();
  if (!sesi) redirect("/login");

  const pengguna = await db.user.findMany({
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: {
      _count: {
        select: {
          ritSebagaiSupir: true,
          kontrakDibuat: true,
          penimbangan: true,
          fotoDiupload: true,
          riwayatStatus: true,
          settlement: true,
        },
      },
    },
  });

  const daftar: BarisPengguna[] = pengguna.map((p) => ({
    id: p.id,
    nama: p.nama,
    username: p.username,
    hp: p.hp,
    peran: p.peran as Peran,
    aktif: p.aktif,
    jumlahRit: p._count.ritSebagaiSupir,
    // Sekali punya jejak kerja, akun hanya boleh dinonaktifkan supaya
    // riwayat rit dan audit tidak kehilangan pemiliknya.
    punyaJejak: Object.values(p._count).some((n) => n > 0),
  }));

  return <PenggunaKlien daftar={daftar} peranSesi={sesi.peran} idSesi={sesi.sub} />;
}
