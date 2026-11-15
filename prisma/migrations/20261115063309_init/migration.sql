-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "hp" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "peran" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Truk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nopol" TEXT NOT NULL,
    "taraBaku" INTEGER NOT NULL,
    "kapasitas" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Shipper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "kontak" TEXT,
    "alamat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Lokasi" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "lat" REAL,
    "lng" REAL,
    "jenis" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Kontrak" (
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
    "tarifShipperPerTon" INTEGER NOT NULL,
    "ongkosSupirPerRit" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Kontrak_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kontrak_lokasiAsalId_fkey" FOREIGN KEY ("lokasiAsalId") REFERENCES "Lokasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kontrak_lokasiTujuanId_fkey" FOREIGN KEY ("lokasiTujuanId") REFERENCES "Lokasi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Kontrak_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noDo" TEXT NOT NULL,
    "kontrakId" TEXT NOT NULL,
    "trukId" TEXT,
    "supirId" TEXT,
    "tanggalTerbit" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DITERBITKAN',
    "tarifShipperPerTonSnapshot" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "Penimbangan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL,
    "noTiket" TEXT,
    "bruto" INTEGER NOT NULL,
    "tara" INTEGER NOT NULL,
    "netto" INTEGER NOT NULL,
    "namaTimbangan" TEXT,
    "sumberAngka" TEXT NOT NULL DEFAULT 'SLIP',
    "catatan" TEXT,
    "dibuatOlehId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Penimbangan_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Penimbangan_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diuploadOlehId" TEXT NOT NULL,
    CONSTRAINT "Foto_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Foto_diuploadOlehId_fkey" FOREIGN KEY ("diuploadOlehId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TitikGps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leg" TEXT NOT NULL,
    "akurasi" REAL,
    CONSTRAINT "TitikGps_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiwayatStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "dari" TEXT,
    "ke" TEXT NOT NULL,
    "olehId" TEXT NOT NULL,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" REAL,
    "lng" REAL,
    "catatan" TEXT,
    CONSTRAINT "RiwayatStatus_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RiwayatStatus_olehId_fkey" FOREIGN KEY ("olehId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Biaya" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    CONSTRAINT "Biaya_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Kendala" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "waktu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" REAL,
    "lng" REAL,
    "catatan" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "penyelesaian" TEXT,
    "selesaiPada" DATETIME,
    CONSTRAINT "Kendala_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Klaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ritId" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DIAJUKAN',
    "catatan" TEXT,
    CONSTRAINT "Klaim_ritId_fkey" FOREIGN KEY ("ritId") REFERENCES "Rit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supirId" TEXT NOT NULL,
    "bulan" TEXT NOT NULL,
    "jumlahRit" INTEGER NOT NULL,
    "totalOngkos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dibayarPada" DATETIME,
    "catatan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settlement_supirId_fkey" FOREIGN KEY ("supirId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_hp_key" ON "User"("hp");

-- CreateIndex
CREATE INDEX "User_peran_aktif_idx" ON "User"("peran", "aktif");

-- CreateIndex
CREATE UNIQUE INDEX "Truk_nopol_key" ON "Truk"("nopol");

-- CreateIndex
CREATE UNIQUE INDEX "Kontrak_noSpk_key" ON "Kontrak"("noSpk");

-- CreateIndex
CREATE INDEX "Kontrak_status_idx" ON "Kontrak"("status");

-- CreateIndex
CREATE INDEX "Kontrak_shipperId_idx" ON "Kontrak"("shipperId");

-- CreateIndex
CREATE UNIQUE INDEX "Rit_noDo_key" ON "Rit"("noDo");

-- CreateIndex
CREATE INDEX "Rit_status_idx" ON "Rit"("status");

-- CreateIndex
CREATE INDEX "Rit_supirId_status_idx" ON "Rit"("supirId", "status");

-- CreateIndex
CREATE INDEX "Rit_kontrakId_idx" ON "Rit"("kontrakId");

-- CreateIndex
CREATE INDEX "Rit_tanggalTerbit_idx" ON "Rit"("tanggalTerbit");

-- CreateIndex
CREATE UNIQUE INDEX "Penimbangan_ritId_jenis_key" ON "Penimbangan"("ritId", "jenis");

-- CreateIndex
CREATE INDEX "Foto_ritId_jenis_idx" ON "Foto"("ritId", "jenis");

-- CreateIndex
CREATE INDEX "TitikGps_ritId_waktu_idx" ON "TitikGps"("ritId", "waktu");

-- CreateIndex
CREATE INDEX "RiwayatStatus_ritId_waktu_idx" ON "RiwayatStatus"("ritId", "waktu");

-- CreateIndex
CREATE INDEX "Biaya_ritId_idx" ON "Biaya"("ritId");

-- CreateIndex
CREATE INDEX "Kendala_ritId_idx" ON "Kendala"("ritId");

-- CreateIndex
CREATE UNIQUE INDEX "Klaim_ritId_key" ON "Klaim"("ritId");

-- CreateIndex
CREATE INDEX "Settlement_bulan_idx" ON "Settlement"("bulan");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_supirId_bulan_key" ON "Settlement"("supirId", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
