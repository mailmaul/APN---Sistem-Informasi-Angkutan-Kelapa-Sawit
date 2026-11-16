package id.apn.supir.data.antrian

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.jaringan.KendalaReq
import id.apn.supir.data.jaringan.StatusReq
import id.apn.supir.data.jaringan.TrackReq
import id.apn.supir.data.keIso
import id.apn.supir.data.lokal.AksiDao
import id.apn.supir.data.lokal.AksiTertundaEntity
import id.apn.supir.data.lokal.JenisAksi
import id.apn.supir.data.lokal.TitikDao
import id.apn.supir.data.repo.RepoRit
import id.apn.supir.data.sumber.SumberMobile
import kotlinx.serialization.json.Json
import java.io.File

/**
 * Mengirim seluruh aksi tertunda berurutan, lalu jejak GPS.
 *
 * Aturan main:
 * - 409 berarti server sudah berada di status itu (aksi terkirim dua kali atau
 *   layar basi): baris dibuang, bukan diulang selamanya.
 * - Galat jaringan → [Result.retry] dengan backoff; baris tetap tersimpan.
 * - Galat validasi lain → baris dibuang setelah dicatat, supaya antrian tidak
 *   macet oleh satu aksi yang tidak akan pernah diterima.
 */
@HiltWorker
class PengirimAksiWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val aksiDao: AksiDao,
    private val titikDao: TitikDao,
    private val sumber: SumberMobile,
    private val repoRit: RepoRit,
) : CoroutineWorker(context, params) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override suspend fun doWork(): Result {
        var perluUlang = false

        for (aksi in aksiDao.semua()) {
            when (kirim(aksi)) {
                Keluaran.SELESAI -> aksiDao.hapus(aksi.id)
                Keluaran.ULANG -> perluUlang = true
                Keluaran.BUANG -> aksiDao.hapus(aksi.id)
            }
            if (perluUlang) break
        }

        if (!perluUlang) perluUlang = !kirimTitik()

        // Status rit disegarkan dari server, bukan ditebak dari aksi yang terkirim.
        repoRit.segarkan()

        return if (perluUlang) Result.retry() else Result.success()
    }

    private suspend fun kirim(aksi: AksiTertundaEntity): Keluaran {
        val fotoUrl = aksi.fotoPath?.let { path ->
            val berkas = File(path)
            if (!berkas.exists()) return@let null
            when (val hasil = sumber.unggahFoto(berkas)) {
                is Hasil.Sukses -> hasil.data.url
                Hasil.Offline -> return Keluaran.ULANG
                is Hasil.Galat -> {
                    aksiDao.tandaiGagal(aksi.id, hasil.pesan)
                    return if (hasil.kode >= 500) Keluaran.ULANG else Keluaran.BUANG
                }
            }
        }

        val hasil = when (aksi.jenis) {
            JenisAksi.STATUS -> {
                val req = json.decodeFromString<StatusReq>(aksi.muatanJson)
                sumber.majukanStatus(aksi.ritId, req.copy(fotoUrl = fotoUrl ?: req.fotoUrl))
            }

            JenisAksi.KENDALA -> {
                val req = json.decodeFromString<KendalaReq>(aksi.muatanJson)
                sumber.laporKendala(aksi.ritId, req.copy(fotoUrl = fotoUrl ?: req.fotoUrl))
            }

            JenisAksi.TITIK -> {
                val req = json.decodeFromString<TrackReq>(aksi.muatanJson)
                sumber.kirimTitik(aksi.ritId, req)
            }
        }

        return when (hasil) {
            is Hasil.Sukses -> Keluaran.SELESAI
            Hasil.Offline -> Keluaran.ULANG
            is Hasil.Galat -> {
                aksiDao.tandaiGagal(aksi.id, hasil.pesan)
                when {
                    // Server sudah di status tujuan — aksi ini memang sudah sampai.
                    hasil.kode == 409 -> Keluaran.BUANG
                    hasil.kode >= 500 -> Keluaran.ULANG
                    else -> Keluaran.BUANG
                }
            }
        }
    }

    /** @return false bila perlu diulang. */
    private suspend fun kirimTitik(): Boolean {
        val titik = titikDao.semuaTertunda()
        if (titik.isEmpty()) return true

        val terkirim = mutableListOf<Long>()
        for (t in titik) {
            val hasil = sumber.kirimTitik(
                t.ritId,
                TrackReq(lat = t.lat, lng = t.lng, akurasi = t.akurasi, waktu = t.waktu.keIso()),
            )
            when (hasil) {
                is Hasil.Sukses -> terkirim += t.id
                // 409 = rit sedang tidak di leg perjalanan; titik ini tidak akan
                // pernah diterima, buang supaya antrian tidak tersumbat.
                is Hasil.Galat -> if (hasil.kode < 500) terkirim += t.id else break
                Hasil.Offline -> break
            }
        }
        if (terkirim.isNotEmpty()) titikDao.hapus(terkirim)
        return terkirim.size == titik.size
    }

    private enum class Keluaran { SELESAI, ULANG, BUANG }
}
