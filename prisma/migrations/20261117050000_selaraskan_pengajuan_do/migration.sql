-- Menyelaraskan tabel pengajuan dengan kode yang berjalan.
--
-- Kaitan rit ↔ pengajuan dipindah ke sisi Rit: satu rit lahir dari satu
-- pengajuan, dan kolomnya ikut terbaca saat rit dimuat tanpa join tambahan.
-- Tabel pengajuan masih kosong, jadi perpindahan ini tidak memindahkan data.

ALTER TABLE "Rit" ADD COLUMN "pengajuanId" TEXT REFERENCES "PengajuanDo" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rit" ADD COLUMN "doPdfUrl" TEXT;
CREATE UNIQUE INDEX "Rit_pengajuanId_key" ON "Rit"("pengajuanId");

-- Nopol yang terakhir dibawa supir, untuk mengisi form Buat DO di aplikasi.
ALTER TABLE "User" ADD COLUMN "nopolTerakhir" TEXT;

-- SQLite menolak DROP COLUMN selama kolomnya dipakai definisi foreign key,
-- jadi tabelnya dibangun ulang tanpa "ritId". Isi lama tetap disalin walaupun
-- tabel ini masih kosong saat migrasi ditulis.
PRAGMA foreign_keys=OFF;

CREATE TABLE "PengajuanDo_baru" (
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

INSERT INTO "PengajuanDo_baru" (
    "id", "kontrakId", "supirId", "nama", "nopol", "noSim", "noHp", "fotoSelfieUrl",
    "status", "alasanTolak", "diputusOlehId", "sumberPersetujuan", "pesanTelegramId",
    "diputusPada", "createdAt", "updatedAt"
)
SELECT
    "id", "kontrakId", "supirId", "nama", "nopol", "noSim", "noHp", "fotoSelfieUrl",
    "status", "alasanTolak", "diputusOlehId", "sumberPersetujuan", "pesanTelegramId",
    "diputusPada", "createdAt", "updatedAt"
FROM "PengajuanDo";

DROP TABLE "PengajuanDo";
ALTER TABLE "PengajuanDo_baru" RENAME TO "PengajuanDo";

CREATE INDEX "PengajuanDo_status_idx" ON "PengajuanDo"("status");
CREATE INDEX "PengajuanDo_supirId_status_idx" ON "PengajuanDo"("supirId", "status");
CREATE INDEX "PengajuanDo_kontrakId_status_idx" ON "PengajuanDo"("kontrakId", "status");

PRAGMA foreign_keys=ON;
