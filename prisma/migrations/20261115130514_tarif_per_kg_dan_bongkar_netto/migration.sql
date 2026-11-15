/*
  Warnings:

  - You are about to drop the column `tarifShipperPerTon` on the `Kontrak` table. All the data in the column will be lost.
  - You are about to drop the column `tarifShipperPerTonSnapshot` on the `Rit` table. All the data in the column will be lost.
  - Added the required column `tarifShipperPerKg` to the `Kontrak` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tarifShipperPerKgSnapshot` to the `Rit` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kontrak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noSpk" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "jenisBarang" TEXT NOT NULL,
    "lokasiAsalId" TEXT NOT NULL,
    "lokasiTujuanId" TEXT NOT NULL,
    "totalTonase" REAL NOT NULL,
    "periodeMulai" DATETIME NOT NULL,
    "periodeSelesai" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "tarifShipperPerKg" INTEGER NOT NULL,
    "ongkosSupirPerRit" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Kontrak_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kontrak_lokasiAsalId_fkey" FOREIGN KEY ("lokasiAsalId") REFERENCES "Lokasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kontrak_lokasiTujuanId_fkey" FOREIGN KEY ("lokasiTujuanId") REFERENCES "Lokasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kontrak_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Kontrak" ("createdAt", "createdById", "id", "jenisBarang", "lokasiAsalId", "lokasiTujuanId", "noSpk", "ongkosSupirPerRit", "periodeMulai", "periodeSelesai", "shipperId", "status", "totalTonase", "updatedAt") SELECT "createdAt", "createdById", "id", "jenisBarang", "lokasiAsalId", "lokasiTujuanId", "noSpk", "ongkosSupirPerRit", "periodeMulai", "periodeSelesai", "shipperId", "status", "totalTonase", "updatedAt" FROM "Kontrak";
DROP TABLE "Kontrak";
ALTER TABLE "new_Kontrak" RENAME TO "Kontrak";
CREATE UNIQUE INDEX "Kontrak_noSpk_key" ON "Kontrak"("noSpk");
CREATE INDEX "Kontrak_status_idx" ON "Kontrak"("status");
CREATE INDEX "Kontrak_shipperId_idx" ON "Kontrak"("shipperId");
CREATE TABLE "new_Penimbangan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "noTiket" TEXT,
    "bruto" INTEGER,
    "tara" INTEGER,
    "netto" INTEGER NOT NULL,
    "namaTimbangan" TEXT,
    "sumberAngka" TEXT NOT NULL DEFAULT 'SLIP',
    "catatan" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Penimbangan_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Penimbangan_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Penimbangan" ("bruto", "catatan", "createdAt", "dibuatOlehId", "id", "jenis", "namaTimbangan", "netto", "noTiket", "ritId", "sumberAngka", "tanggal", "tara") SELECT "bruto", "catatan", "createdAt", "dibuatOlehId", "id", "jenis", "namaTimbangan", "netto", "noTiket", "ritId", "sumberAngka", "tanggal", "tara" FROM "Penimbangan";
DROP TABLE "Penimbangan";
ALTER TABLE "new_Penimbangan" RENAME TO "Penimbangan";
CREATE UNIQUE INDEX "Penimbangan_ritId_jenis_key" ON "Penimbangan"("ritId", "jenis");
CREATE TABLE "new_Rit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noDo" TEXT NOT NULL,
    "kontrakId" TEXT NOT NULL,
    "trukId" TEXT,
    "supirId" TEXT,
    "tanggalTerbit" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DITERBITKAN',
    "tarifShipperPerKgSnapshot" INTEGER NOT NULL,
    "ongkosSupirPerRitSnapshot" INTEGER NOT NULL,
    "tibaMuat" DATETIME,
    "selesaiMuat" DATETIME,
    "tibaBongkar" DATETIME,
    "selesaiBongkar" DATETIME,
    "selisihKg" INTEGER,
    "kelebihanKg" INTEGER,
    "nilaiSelisih" INTEGER,
    "tagihanShipper" INTEGER,
    "ongkosSupir" INTEGER,
    "slipFisikDiterima" BOOLEAN NOT NULL DEFAULT false,
    "slipFisikTanggal" DATETIME,
    "alasanBatal" TEXT,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rit_kontrakId_fkey" FOREIGN KEY ("kontrakId") REFERENCES "Kontrak" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rit_trukId_fkey" FOREIGN KEY ("trukId") REFERENCES "Truk" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rit_supirId_fkey" FOREIGN KEY ("supirId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rit" ("alasanBatal", "catatan", "createdAt", "id", "kelebihanKg", "kontrakId", "nilaiSelisih", "noDo", "ongkosSupir", "ongkosSupirPerRitSnapshot", "selesaiBongkar", "selesaiMuat", "selisihKg", "slipFisikDiterima", "slipFisikTanggal", "status", "supirId", "tagihanShipper", "tanggalTerbit", "tibaBongkar", "tibaMuat", "trukId", "updatedAt") SELECT "alasanBatal", "catatan", "createdAt", "id", "kelebihanKg", "kontrakId", "nilaiSelisih", "noDo", "ongkosSupir", "ongkosSupirPerRitSnapshot", "selesaiBongkar", "selesaiMuat", "selisihKg", "slipFisikDiterima", "slipFisikTanggal", "status", "supirId", "tagihanShipper", "tanggalTerbit", "tibaBongkar", "tibaMuat", "trukId", "updatedAt" FROM "Rit";
DROP TABLE "Rit";
ALTER TABLE "new_Rit" RENAME TO "Rit";
CREATE UNIQUE INDEX "Rit_noDo_key" ON "Rit"("noDo");
CREATE INDEX "Rit_status_idx" ON "Rit"("status");
CREATE INDEX "Rit_supirId_status_idx" ON "Rit"("supirId", "status");
CREATE INDEX "Rit_kontrakId_idx" ON "Rit"("kontrakId");
CREATE INDEX "Rit_tanggalTerbit_idx" ON "Rit"("tanggalTerbit");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
