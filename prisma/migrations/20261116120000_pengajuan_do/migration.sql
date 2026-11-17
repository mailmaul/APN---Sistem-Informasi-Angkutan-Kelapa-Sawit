-- Aplikasi Android: supir mendaftar sendiri lalu mengajukan DO atas PO yang
-- masih punya kuota; kantor menyetujui lewat Telegram atau web.

-- Supir lama (dibuat admin) tetap dianggap terverifikasi; hanya pendaftar baru
-- yang masuk antrian verifikasi.
ALTER TABLE "User" ADD COLUMN "statusVerifikasi" TEXT NOT NULL DEFAULT 'TERVERIFIKASI';
ALTER TABLE "User" ADD COLUMN "noSim" TEXT;
ALTER TABLE "User" ADD COLUMN "fotoSimUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "alasanTolakVerifikasi" TEXT;
ALTER TABLE "User" ADD COLUMN "diverifikasiOlehId" TEXT;
ALTER TABLE "User" ADD COLUMN "diverifikasiPada" DATETIME;
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN "fcmToken" TEXT;

-- Kuota unit angkutan per PO. 0 = belum diisi, diperlakukan sebagai tanpa batas
-- supaya kontrak lama tidak mendadak menolak pengajuan.
ALTER TABLE "Kontrak" ADD COLUMN "unitDiminta" INTEGER NOT NULL DEFAULT 0;

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
    "diputusPada" DATETIME,
    "pesanTelegramId" TEXT,
    "ritId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PengajuanDo_kontrakId_fkey" FOREIGN KEY ("kontrakId") REFERENCES "Kontrak" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanDo_supirId_fkey" FOREIGN KEY ("supirId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PengajuanDo_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PengajuanDo_ritId_key" ON "PengajuanDo"("ritId");
CREATE INDEX "PengajuanDo_status_idx" ON "PengajuanDo"("status");
CREATE INDEX "PengajuanDo_supirId_status_idx" ON "PengajuanDo"("supirId", "status");
CREATE INDEX "PengajuanDo_kontrakId_status_idx" ON "PengajuanDo"("kontrakId", "status");
