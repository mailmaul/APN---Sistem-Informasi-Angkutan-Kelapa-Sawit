-- AlterTable
ALTER TABLE "Kontrak" ADD COLUMN "unitDiminta" INTEGER;

-- CreateTable
CREATE TABLE "PengajuanDo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kontrakId" TEXT NOT NULL,
    "supirId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nopol" TEXT NOT NULL,
    "noSim" TEXT NOT NULL,
    "noHp" TEXT NOT NULL,
    "fotoSelfieUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DIAJUKAN',
    "alasanTolak" TEXT,
    "diputusOlehId" TEXT,
    "sumberPersetujuan" TEXT,
    "pesanTelegramId" TEXT,
    "diputusPada" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PengajuanDo_kontrakId_fkey" FOREIGN KEY ("kontrakId") REFERENCES "Kontrak" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanDo_supirId_fkey" FOREIGN KEY ("supirId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanDo_diputusOlehId_fkey" FOREIGN KEY ("diputusOlehId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "potonganSupir" INTEGER,
    "pemaafanPotongan" INTEGER NOT NULL DEFAULT 0,
    "alasanPemaafan" TEXT,
    "dimaafkanOlehId" TEXT,
    "dimaafkanPada" DATETIME,
    "ongkosSupir" INTEGER,
    "slipFisikDiterima" BOOLEAN NOT NULL DEFAULT false,
    "slipFisikTanggal" DATETIME,
    "pengajuanId" TEXT,
    "doPdfUrl" TEXT,
    "alasanBatal" TEXT,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rit_kontrakId_fkey" FOREIGN KEY ("kontrakId") REFERENCES "Kontrak" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rit_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "PengajuanDo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rit_trukId_fkey" FOREIGN KEY ("trukId") REFERENCES "Truk" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rit_supirId_fkey" FOREIGN KEY ("supirId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rit" ("alasanBatal", "alasanPemaafan", "catatan", "createdAt", "dimaafkanOlehId", "dimaafkanPada", "id", "kelebihanKg", "kontrakId", "nilaiSelisih", "noDo", "ongkosSupir", "ongkosSupirPerRitSnapshot", "pemaafanPotongan", "potonganSupir", "selesaiBongkar", "selesaiMuat", "selisihKg", "slipFisikDiterima", "slipFisikTanggal", "status", "supirId", "tagihanShipper", "tanggalTerbit", "tarifShipperPerKgSnapshot", "tibaBongkar", "tibaMuat", "trukId", "updatedAt") SELECT "alasanBatal", "alasanPemaafan", "catatan", "createdAt", "dimaafkanOlehId", "dimaafkanPada", "id", "kelebihanKg", "kontrakId", "nilaiSelisih", "noDo", "ongkosSupir", "ongkosSupirPerRitSnapshot", "pemaafanPotongan", "potonganSupir", "selesaiBongkar", "selesaiMuat", "selisihKg", "slipFisikDiterima", "slipFisikTanggal", "status", "supirId", "tagihanShipper", "tanggalTerbit", "tarifShipperPerKgSnapshot", "tibaBongkar", "tibaMuat", "trukId", "updatedAt" FROM "Rit";
DROP TABLE "Rit";
ALTER TABLE "new_Rit" RENAME TO "Rit";
CREATE UNIQUE INDEX "Rit_noDo_key" ON "Rit"("noDo");
CREATE UNIQUE INDEX "Rit_pengajuanId_key" ON "Rit"("pengajuanId");
CREATE INDEX "Rit_status_idx" ON "Rit"("status");
CREATE INDEX "Rit_supirId_status_idx" ON "Rit"("supirId", "status");
CREATE INDEX "Rit_kontrakId_idx" ON "Rit"("kontrakId");
CREATE INDEX "Rit_tanggalTerbit_idx" ON "Rit"("tanggalTerbit");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "username" TEXT,
    "hp" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "statusVerifikasi" TEXT NOT NULL DEFAULT 'TERVERIFIKASI',
    "alasanTolakVerifikasi" TEXT,
    "diverifikasiOlehId" TEXT,
    "diverifikasiPada" DATETIME,
    "noSim" TEXT,
    "nopolTerakhir" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("aktif", "createdAt", "hp", "id", "nama", "passwordHash", "peran", "username") SELECT "aktif", "createdAt", "hp", "id", "nama", "passwordHash", "peran", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_hp_key" ON "User"("hp");
CREATE INDEX "User_peran_aktif_idx" ON "User"("peran", "aktif");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PengajuanDo_status_idx" ON "PengajuanDo"("status");

-- CreateIndex
CREATE INDEX "PengajuanDo_supirId_status_idx" ON "PengajuanDo"("supirId", "status");

-- CreateIndex
CREATE INDEX "PengajuanDo_kontrakId_status_idx" ON "PengajuanDo"("kontrakId", "status");
