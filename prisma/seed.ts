import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Seed idempoten: aman dijalankan ulang. Memakai upsert pada kolom unik
// supaya tidak menggandakan data saat dipanggil dua kali.

const db = new PrismaClient();

const NOPOL = [
  "BK 8821 AA", "BK 9043 AB", "BK 7712 AC", "BK 6650 AD",
  "BK 5538 AE", "BK 4426 AF", "BK 3314 AG", "BK 2202 AH",
  "BK 1190 AI", "BK 9988 AJ", "BK 8876 AK", "BK 7764 AL",
  "BK 6652 AM", "BK 5540 AN", "BK 4438 AO", "BK 3326 AP",
];

async function main() {
  const hash = await bcrypt.hash("admin123", 10);

  // Staf kantor masuk dengan username; supir cukup nomor HP.
  const owner = await db.user.upsert({
    where: { hp: "081200000000" },
    update: {},
    create: {
      nama: "Owner APN",
      username: "apn",
      hp: "081200000000",
      passwordHash: await bcrypt.hash("apn123", 10),
      peran: "OWNER",
    },
  });

  for (const a of [
    { nama: "Lilis", username: "lilis", hp: "081200000001", password: "lilis123" },
    { nama: "Devi", username: "devi", hp: "081200000002", password: "devi123" },
  ]) {
    await db.user.upsert({
      where: { hp: a.hp },
      update: {},
      create: {
        nama: a.nama,
        username: a.username,
        hp: a.hp,
        passwordHash: await bcrypt.hash(a.password, 10),
        peran: "ADMIN",
      },
    });
  }

  for (let i = 0; i < NOPOL.length; i++) {
    await db.truk.upsert({
      where: { nopol: NOPOL[i] },
      update: {},
      // Tara & kapasitas angka wajar untuk tronton angkutan curah; admin
      // menyesuaikan lewat master armada setelah ditimbang sungguhan.
      create: { nopol: NOPOL[i], taraBaku: 13800 + i * 40, kapasitas: 30000 },
    });
  }

  const supir = [
    { nama: "Budi Santoso", hp: "081311110001" },
    { nama: "Joko Prasetyo", hp: "081311110002" },
    { nama: "Andi Wijaya", hp: "081311110003" },
  ];
  for (const s of supir) {
    await db.user.upsert({
      where: { hp: s.hp },
      update: {},
      create: { nama: s.nama, hp: s.hp, passwordHash: hash, peran: "SUPIR" },
    });
  }

  const lokasi = [
    { nama: "PKS Sei Mangkei", jenis: "ASAL", lat: 3.0167, lng: 99.35 },
    { nama: "PKS Torgamba", jenis: "ASAL", lat: 1.8167, lng: 100.2 },
    { nama: "Gudang Belawan", jenis: "TUJUAN", lat: 3.7833, lng: 98.6833 },
    { nama: "Pelabuhan Kuala Tanjung", jenis: "TUJUAN", lat: 3.3667, lng: 99.45 },
  ];
  for (const l of lokasi) {
    const ada = await db.lokasi.findFirst({ where: { nama: l.nama } });
    if (!ada) await db.lokasi.create({ data: l });
  }

  const shipper = [{ nama: "PT Sawit Nusantara" }, { nama: "PT Kernel Jaya Abadi" }];
  for (const s of shipper) {
    const ada = await db.shipper.findFirst({ where: { nama: s.nama } });
    if (!ada) await db.shipper.create({ data: s });
  }

  console.log("Seed selesai.");
  console.log(`  Owner : apn / apn123 (${owner.nama})`);
  console.log("  Admin : lilis / lilis123 · devi / devi123");
  console.log("  Supir : 081311110001-3 / admin123");
  console.log(`  ${NOPOL.length} truk, ${lokasi.length} lokasi, ${shipper.length} shipper`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
