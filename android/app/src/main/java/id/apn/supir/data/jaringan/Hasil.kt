package id.apn.supir.data.jaringan

import kotlinx.serialization.json.Json
import retrofit2.Response
import java.io.IOException

/**
 * Hasil pemanggilan jaringan.
 *
 * [Offline] dibedakan dari [Galat] karena penanganannya berbeda: aksi offline
 * masuk antrian, galat server ditampilkan ke supir.
 */
sealed interface Hasil<out T> {
    data class Sukses<T>(val data: T) : Hasil<T>
    data class Galat(val pesan: String, val kode: Int) : Hasil<Nothing>
    data object Offline : Hasil<Nothing>
}

private val jsonLonggar = Json { ignoreUnknownKeys = true }

/** Pesan galat untuk kode status yang tidak menyertakan badan JSON. */
private fun pesanBawaan(kode: Int): String = when (kode) {
    401 -> "Sesi berakhir, silakan masuk lagi"
    403 -> "Anda tidak berhak melakukan ini"
    404 -> "Data tidak ditemukan di server"
    409 -> "Data di layar sudah tidak sesuai, muat ulang dulu"
    413 -> "Foto terlalu besar"
    in 500..599 -> "Server sedang bermasalah, coba lagi sebentar lagi"
    else -> "Gagal menghubungi server ($kode)"
}

/**
 * Menjalankan satu panggilan dan menerjemahkan balasan menjadi [Hasil].
 * Pesan galat server diteruskan apa adanya — sudah ditulis untuk dibaca supir.
 */
suspend fun <T> panggil(blok: suspend () -> Response<T>): Hasil<T> = try {
    val respons = blok()
    val badan = respons.body()
    when {
        respons.isSuccessful && badan != null -> Hasil.Sukses(badan)
        respons.isSuccessful -> @Suppress("UNCHECKED_CAST") (Hasil.Sukses(Unit as T))
        else -> Hasil.Galat(bacaPesanGalat(respons), respons.code())
    }
} catch (_: IOException) {
    Hasil.Offline
}

private fun bacaPesanGalat(respons: Response<*>): String {
    val mentah = runCatching { respons.errorBody()?.string() }.getOrNull()
    if (mentah.isNullOrBlank()) return pesanBawaan(respons.code())
    return runCatching { jsonLonggar.decodeFromString<GalatDto>(mentah).error }
        .getOrNull()
        ?.takeIf { it.isNotBlank() }
        ?: pesanBawaan(respons.code())
}
