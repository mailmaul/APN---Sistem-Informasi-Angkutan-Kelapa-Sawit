import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { hitungBayaranRit, hitungNetto, hitungPotonganSupir, hitungSelisih, hitungTagihanShipper } from "@/lib/perhitungan";
import type { JenisBarang, StatusRit } from "@/lib/constants";
import { skemaTimbang } from "@/components/rit/skema";

// Input angka timbang oleh admin kantor, dibaca dari foto slip kiriman supir.
// Netto SELALU dihitung di sini — angka netto dari klien sengaja diabaikan.

type Konteks = { params: Promise<{ id: string }> };

/** Hanya dua status ini yang menunggu angka timbangan. */
const STATUS_BOLEH_TIMBANG: StatusRit[] = ["SELESAI_BONGKAR", "MENUNGGU_INPUT"];

export async function POST(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const parsed = skemaTimbang.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { muat, bongkar, selesaikan } = parsed.data;

  if (!muat && !bongkar && !selesaikan) return galat("Tidak ada data timbangan yang dikirim");

  const rit = await db.rit.findUnique({
    where: { id },
    include: {
      kontrak: { select: { jenisBarang: true, tarifSelisihPerKg: true } },
      penimbangan: true,
    },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (!STATUS_BOLEH_TIMBANG.includes(rit.status as StatusRit)) {
    return galat(
      rit.status === "SELESAI"
        ? "Rit sudah diselesaikan, angkanya terkunci"
        : "Rit belum selesai bongkar, angka timbangan belum bisa diinput",
      409,
    );
  }

  // Sisi muat: netto selalu dihitung dari bruto − tara, angka netto dari
  // klien sengaja diabaikan. Sisi bongkar: kalau bruto & tara ada netto tetap
  // dihitung; kalau tanda terima hanya memuat netto, angka netto itu dipakai.
  if (muat) {
    const netto = hitungNetto(muat.bruto, muat.tara);
    await db.penimbangan.upsert({
      where: { ritId_jenis: { ritId: id, jenis: "MUAT" } },
      create: { ...muat, netto, jenis: "MUAT", ritId: id, dibuatOlehId: sesi.sub },
      update: { ...muat, netto, dibuatOlehId: sesi.sub },
    });
  }

  if (bongkar) {
    const { netto: nettoDiinput, ...sisa } = bongkar;
    const netto =
      sisa.bruto != null && sisa.tara != null ? hitungNetto(sisa.bruto, sisa.tara) : nettoDiinput;
    if (netto == null) return galat("Netto bongkar tidak bisa ditentukan");

    await db.penimbangan.upsert({
      where: { ritId_jenis: { ritId: id, jenis: "BONGKAR" } },
      create: { ...sisa, netto, jenis: "BONGKAR", ritId: id, dibuatOlehId: sesi.sub },
      update: { ...sisa, netto, dibuatOlehId: sesi.sub },
    });
  }

  // Baca ulang supaya pasangan muat/bongkar yang dipakai menghitung selalu
  // angka yang benar-benar tersimpan, bukan campuran body dan data lama.
  const tersimpan = await db.penimbangan.findMany({ where: { ritId: id } });
  const barisMuat = tersimpan.find((p) => p.jenis === "MUAT");
  const barisBongkar = tersimpan.find((p) => p.jenis === "BONGKAR");

  if (!selesaikan) {
    // Admin baru menyimpan sebagian; rit masuk antrian input kalau belum.
    if (rit.status === "SELESAI_BONGKAR") {
      await db.rit.update({
        where: { id },
        data: {
          status: "MENUNGGU_INPUT",
          riwayatStatus: {
            create: { dari: rit.status, ke: "MENUNGGU_INPUT", olehId: sesi.sub, catatan: "Angka timbangan mulai diinput" },
          },
        },
      });
    }
    return NextResponse.json({ ok: true, muat: barisMuat ?? null, bongkar: barisBongkar ?? null });
  }

  if (!barisMuat || !barisBongkar) {
    return galat("Timbangan muat dan bongkar harus lengkap sebelum rit diselesaikan");
  }

  const selisih = hitungSelisih(
    barisMuat.netto,
    barisBongkar.netto,
    rit.kontrak.jenisBarang as JenisBarang,
    rit.kontrak.tarifSelisihPerKg,
  );
  // Tagihan memakai netto MUAT: invoice ke shipper menagih tonase yang
  // dimuat di PKS, sedangkan susut di jalan diselesaikan lewat potongan/klaim.
  const tagihanShipper = hitungTagihanShipper(barisMuat.netto, rit.tarifShipperPerKgSnapshot);

  // Susut di luar toleransi ditanggung supir (catatan kaki DO). Pemaafan yang
  // sudah diberikan sebelum rit ditutup ikut diperhitungkan di sini.
  const potongan = hitungPotonganSupir(selisih, rit.pemaafanPotongan);

  const final = await db.rit.update({
    where: { id },
    data: {
      selisihKg: selisih.selisihKg,
      kelebihanKg: selisih.kelebihanKg,
      nilaiSelisih: selisih.nilaiSelisih,
      tagihanShipper,
      potonganSupir: potongan,
      ongkosSupir: hitungBayaranRit(rit.ongkosSupirPerRitSnapshot, potongan),
      status: "SELESAI",
      riwayatStatus: {
        create: {
          dari: rit.status,
          ke: "SELESAI",
          olehId: sesi.sub,
          catatan: `Netto muat ${barisMuat.netto} kg, netto bongkar ${barisBongkar.netto} kg`,
        },
      },
    },
  });

  return NextResponse.json({ rit: final, muat: barisMuat, bongkar: barisBongkar, selisih });
}
