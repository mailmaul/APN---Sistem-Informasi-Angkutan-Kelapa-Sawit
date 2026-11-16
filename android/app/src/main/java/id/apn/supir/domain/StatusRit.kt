package id.apn.supir.domain

/**
 * Cerminan `src/lib/constants.ts` di backend. Mesin status rit TIDAK boleh
 * ditebak di perangkat: enum ini hanya untuk menampilkan label dan menentukan
 * tombol berikutnya. Server tetap pemutus — balasan 409 berarti layar basi.
 */
enum class StatusRit(val label: String, val warna: WarnaStatus) {
    DITERBITKAN("Diterbitkan", WarnaStatus.NETRAL),
    DITUGASKAN("Ditugaskan", WarnaStatus.INFO),
    MENUJU_MUAT("Menuju Lokasi Muat", WarnaStatus.AKSEN),
    TIBA_MUAT("Tiba di Lokasi Muat", WarnaStatus.PERINGATAN),
    SELESAI_MUAT("Selesai Muat", WarnaStatus.AKSEN),
    MENUJU_BONGKAR("Menuju Lokasi Bongkar", WarnaStatus.AKSEN),
    TIBA_BONGKAR("Tiba di Lokasi Bongkar", WarnaStatus.PERINGATAN),
    SELESAI_BONGKAR("Selesai Bongkar", WarnaStatus.AKSEN),
    MENUNGGU_INPUT("Menunggu Input Timbangan", WarnaStatus.ORANYE),
    SELESAI("Selesai", WarnaStatus.SUKSES),
    KENDALA("Ada Kendala", WarnaStatus.BAHAYA),
    DIBATALKAN("Dibatalkan", WarnaStatus.NETRAL);

    companion object {
        fun dari(nama: String?): StatusRit? = entries.firstOrNull { it.name == nama }
    }
}

enum class WarnaStatus { NETRAL, INFO, AKSEN, PERINGATAN, ORANYE, SUKSES, BAHAYA }

enum class JenisFoto { SLIP_MUAT, SLIP_BONGKAR, KENDALA, LAIN }

enum class JenisKendala(val label: String) {
    MOGOK("Truk mogok"),
    KECELAKAAN("Kecelakaan"),
    ANTRIAN("Antrian panjang"),
    SLIP_BERMASALAH("Slip hilang / tidak terbaca"),
    LAIN("Lainnya"),
}

enum class LegGps { MENUJU_MUAT, MENUJU_BONGKAR }

/**
 * Satu langkah maju pada alur supir.
 *
 * @param wajibFoto foto yang harus sudah terunggah sebelum langkah ini sah.
 */
data class Transisi(
    val dari: StatusRit,
    val ke: StatusRit,
    val aksi: String,
    val wajibFoto: JenisFoto? = null,
)

/** Alur normal enam langkah, identik dengan `ALUR_SUPIR` di backend. */
val ALUR_SUPIR: List<Transisi> = listOf(
    Transisi(StatusRit.DITUGASKAN, StatusRit.MENUJU_MUAT, "Berangkat ke Lokasi Muat"),
    Transisi(StatusRit.MENUJU_MUAT, StatusRit.TIBA_MUAT, "Tiba di Lokasi Muat"),
    Transisi(StatusRit.TIBA_MUAT, StatusRit.SELESAI_MUAT, "Selesai Muat", JenisFoto.SLIP_MUAT),
    Transisi(StatusRit.SELESAI_MUAT, StatusRit.MENUJU_BONGKAR, "Berangkat ke Tujuan"),
    Transisi(StatusRit.MENUJU_BONGKAR, StatusRit.TIBA_BONGKAR, "Tiba di Lokasi Bongkar"),
    Transisi(StatusRit.TIBA_BONGKAR, StatusRit.SELESAI_BONGKAR, "Selesai Bongkar", JenisFoto.SLIP_BONGKAR),
)

/** Jalan pintas saat truk sudah standby di lokasi muat. */
val TRANSISI_SUDAH_DI_LOKASI = Transisi(
    dari = StatusRit.DITUGASKAN,
    ke = StatusRit.TIBA_MUAT,
    aksi = "Saya Sudah di Lokasi Muat",
)

fun transisiBerikutnya(status: StatusRit): Transisi? = ALUR_SUPIR.firstOrNull { it.dari == status }

fun legUntukStatus(status: StatusRit): LegGps? = when (status) {
    StatusRit.MENUJU_MUAT -> LegGps.MENUJU_MUAT
    StatusRit.MENUJU_BONGKAR -> LegGps.MENUJU_BONGKAR
    else -> null
}

val STATUS_BOLEH_KENDALA = setOf(
    StatusRit.MENUJU_MUAT,
    StatusRit.TIBA_MUAT,
    StatusRit.MENUJU_BONGKAR,
    StatusRit.TIBA_BONGKAR,
)

/** Urutan enam langkah yang dilihat supir sebagai indikator "langkah N dari 6". */
val LANGKAH_SUPIR: List<StatusRit> = listOf(
    StatusRit.MENUJU_MUAT,
    StatusRit.TIBA_MUAT,
    StatusRit.SELESAI_MUAT,
    StatusRit.MENUJU_BONGKAR,
    StatusRit.TIBA_BONGKAR,
    StatusRit.SELESAI_BONGKAR,
)
