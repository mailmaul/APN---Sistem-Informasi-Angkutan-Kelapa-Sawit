-- DO terbitan perusahaan: "Semua kesusutan yang melebihi toleransi 0,2%
-- di tanggung oleh driver atau pemilik kendaraan". Susut sekarang dipotong
-- dari bayaran supir, dengan wewenang owner memaafkan per kasus.

-- Tarif selisih boleh ditimpa per kontrak; kosong = default per jenis barang.
ALTER TABLE "Kontrak" ADD COLUMN "tarifSelisihPerKg" INTEGER;

-- Potongan dibekukan saat rit diselesaikan, sama seperti angka beku lainnya.
ALTER TABLE "Rit" ADD COLUMN "potonganSupir" INTEGER;
ALTER TABLE "Rit" ADD COLUMN "pemaafanPotongan" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Rit" ADD COLUMN "alasanPemaafan" TEXT;
ALTER TABLE "Rit" ADD COLUMN "dimaafkanOlehId" TEXT;
ALTER TABLE "Rit" ADD COLUMN "dimaafkanPada" DATETIME;

-- Rekap bulanan memisahkan borongan kotor dan potongan supaya slip bayaran
-- bisa menunjukkan keduanya, bukan hanya angka bersih.
ALTER TABLE "Settlement" ADD COLUMN "totalPotongan" INTEGER NOT NULL DEFAULT 0;
