package id.apn.supir.data.lokal

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Jenis aksi yang boleh menunggu di antrian offline. Urutan pengiriman
 * mengikuti waktu pembuatan supaya status tidak pernah melompat.
 */
enum class JenisAksi { STATUS, KENDALA, TITIK }

/**
 * Satu aksi supir yang belum sampai ke server.
 *
 * `id` dibuat di perangkat (UUID) sehingga percobaan ulang tidak pernah
 * menghasilkan dua catatan: baris dihapus hanya setelah server menerima.
 */
@Entity(tableName = "aksi_tertunda")
data class AksiTertundaEntity(
    @PrimaryKey val id: String,
    val ritId: String,
    val jenis: JenisAksi,
    /** Badan permintaan dalam JSON, sesuai DTO masing-masing endpoint. */
    val muatanJson: String,
    /** Foto lokal yang harus diunggah lebih dulu; url hasilnya disisipkan ke muatan. */
    val fotoPath: String? = null,
    val dibuatPada: Long,
    val percobaan: Int = 0,
    val galatTerakhir: String? = null,
)

/**
 * Cache rit aktif. Room adalah sumber kebenaran layar: tanpa sinyal, supir
 * tetap melihat tugasnya.
 */
@Entity(tableName = "rit_aktif")
data class RitAktifEntity(
    @PrimaryKey val id: String,
    val noDo: String,
    val status: String,
    val nopol: String,
    val jenisBarang: String,
    val lokasiMuat: String,
    val alamatMuat: String?,
    val lokasiBongkar: String,
    val alamatBongkar: String?,
    val shipper: String,
    val doPdfUrl: String?,
    val tibaMuat: Long?,
    val selesaiMuat: Long?,
    val tibaBongkar: Long?,
    val selesaiBongkar: Long?,
    val fotoSlipMuatUrl: String?,
    val fotoSlipBongkarUrl: String?,
    val diperbaruiPada: Long,
)

/**
 * Jejak GPS yang belum terkirim. Dipisah dari [AksiTertundaEntity] karena
 * jumlahnya ribuan dan boleh dikirim berkelompok/diputihkan saat sudah lama.
 */
@Entity(tableName = "titik_tertunda")
data class TitikTertundaEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val ritId: String,
    val lat: Double,
    val lng: Double,
    val akurasi: Float?,
    val waktu: Long,
)

/**
 * Bolong pelacakan: selisih antar titik yang jauh melebihi interval normal.
 * Direkam supaya service yang dibunuh OEM ketahuan, bukan diam-diam hilang.
 */
@Entity(tableName = "bolong_pelacakan")
data class BolongPelacakanEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val ritId: String,
    val mulai: Long,
    val selesai: Long,
) {
    val durasiDetik: Long get() = (selesai - mulai) / 1000
}
