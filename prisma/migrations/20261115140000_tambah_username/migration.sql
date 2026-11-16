-- Login menerima username ATAU nomor HP.
-- Kolom dibuat nullable: supir tetap login dengan nomor HP saja.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- SQLite memperlakukan NULL sebagai nilai berbeda satu sama lain, jadi indeks
-- unik ini tidak menghalangi banyak baris tanpa username.
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
