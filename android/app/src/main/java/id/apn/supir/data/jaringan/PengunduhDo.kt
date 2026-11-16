package id.apn.supir.data.jaringan

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Mengunduh DO PDF memakai sesi aplikasi, lalu menyimpannya sebagai berkas.
 *
 * DO tidak boleh dibuka dengan melempar URL ke browser: browser tidak membawa
 * sesi `apn_session` sehingga yang muncul justru `{"error":"Belum login"}`.
 * Berkas hasil unduhan dibagikan lewat FileProvider — aplikasi pembaca PDF dan
 * WhatsApp menerima berkasnya sendiri, bukan tautan yang butuh login.
 */
@Singleton
class PengunduhDo @Inject constructor(private val klien: OkHttpClient) {

    private val jsonLonggar = Json { ignoreUnknownKeys = true }

    suspend fun unduh(url: String, tujuan: File): Hasil<File> = withContext(Dispatchers.IO) {
        try {
            klien.newCall(Request.Builder().url(url).build()).execute().use { respons ->
                val badan = respons.body
                if (!respons.isSuccessful || badan == null) {
                    return@withContext Hasil.Galat(pesanGalat(respons.code, badan?.string()), respons.code)
                }

                val tipe = respons.header("Content-Type").orEmpty()
                val isi = badan.bytes()
                // Server yang menolak sesi membalas JSON dengan status 200 di
                // beberapa jalur proxy; periksa isinya, bukan hanya kodenya.
                if (!tipe.contains("pdf") && !isi.copyOfRange(0, minOf(4, isi.size)).contentEquals(TANDA_PDF)) {
                    return@withContext Hasil.Galat(
                        pesanGalat(respons.code, String(isi.copyOfRange(0, minOf(isi.size, 500)))),
                        respons.code,
                    )
                }

                tujuan.parentFile?.mkdirs()
                tujuan.writeBytes(isi)
                Hasil.Sukses(tujuan)
            }
        } catch (_: IOException) {
            Hasil.Offline
        }
    }

    private fun pesanGalat(kode: Int, badan: String?): String {
        val dariServer = badan
            ?.let { runCatching { jsonLonggar.decodeFromString<GalatDto>(it).error }.getOrNull() }
            ?.takeIf { it.isNotBlank() }
        return dariServer ?: when (kode) {
            401, 403 -> "Sesi berakhir, masuk lagi lalu buka DO sekali lagi"
            404 -> "DO belum terbit di server"
            else -> "DO gagal diunduh ($kode)"
        }
    }

    private companion object {
        val TANDA_PDF = byteArrayOf(0x25, 0x50, 0x44, 0x46) // "%PDF"
    }
}
