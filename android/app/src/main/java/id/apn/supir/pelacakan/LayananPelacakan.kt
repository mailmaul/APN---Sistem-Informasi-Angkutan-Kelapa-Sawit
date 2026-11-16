package id.apn.supir.pelacakan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import dagger.hilt.android.AndroidEntryPoint
import id.apn.supir.MainActivity
import id.apn.supir.R
import id.apn.supir.data.lokal.BolongPelacakanEntity
import id.apn.supir.data.lokal.TitikDao
import id.apn.supir.data.repo.RepoRit
import id.apn.supir.domain.TitikGps
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Pelacakan latar belakang selama leg perjalanan.
 *
 * Foreground service dengan notifikasi tetap: tanpa itu OEM (Xiaomi, Oppo,
 * Vivo) membunuh proses begitu layar mati. Titik tidak pernah dikirim langsung
 * dari sini — semuanya masuk antrian Room dulu, jadi sinyal putus tidak
 * menghilangkan jejak.
 *
 * Jeda antar titik yang jauh melebihi interval dicatat sebagai *bolong*
 * pelacakan, supaya service yang tetap dibunuh ketahuan dan bukan diam-diam
 * menghasilkan rute berlubang.
 */
@AndroidEntryPoint
class LayananPelacakan : LifecycleService() {

    @Inject lateinit var repoRit: RepoRit

    @Inject lateinit var titikDao: TitikDao

    @Inject lateinit var lokasi: FusedLocationProviderClient

    private var ritId: String? = null
    private var titikTerakhir: Long = 0L

    private val penerima = object : LocationCallback() {
        override fun onLocationResult(hasil: LocationResult) {
            val rit = ritId ?: return
            val lokasiTerbaru = hasil.lastLocation ?: return
            val sekarang = System.currentTimeMillis()

            lifecycleScope.launch {
                val sebelumnya = titikTerakhir
                if (sebelumnya != 0L && sekarang - sebelumnya > AMBANG_BOLONG_MS) {
                    titikDao.catatBolong(
                        BolongPelacakanEntity(ritId = rit, mulai = sebelumnya, selesai = sekarang),
                    )
                }
                titikTerakhir = sekarang

                repoRit.catatTitik(
                    rit,
                    TitikGps(
                        lat = lokasiTerbaru.latitude,
                        lng = lokasiTerbaru.longitude,
                        akurasi = lokasiTerbaru.accuracy,
                        waktu = sekarang,
                    ),
                )
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)

        val rit = intent?.getStringExtra(EKSTRA_RIT)
        val judul = intent?.getStringExtra(EKSTRA_JUDUL) ?: "Perjalanan sedang direkam"
        if (rit == null) {
            hentikanDiri()
            return START_NOT_STICKY
        }

        ritId = rit
        siapkanKanal()
        ServiceCompat.startForeground(
            this,
            ID_NOTIFIKASI,
            notifikasi(judul),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            } else {
                0
            },
        )

        mulaiMerekam()
        // START_REDELIVER_INTENT: kalau proses dibunuh, Android menghidupkan
        // ulang service dengan intent yang sama sehingga rit tetap terlacak.
        return START_REDELIVER_INTENT
    }

    private fun mulaiMerekam() {
        val permintaan = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(INTERVAL_MINIMUM_MS)
            .setMinUpdateDistanceMeters(JARAK_MINIMUM_M)
            .setWaitForAccurateLocation(false)
            .build()

        runCatching {
            lokasi.requestLocationUpdates(permintaan, penerima, mainLooper)
        }.onFailure {
            // Izin dicabut saat berjalan — layanan berhenti, layar rit yang
            // meminta izin lagi.
            hentikanDiri()
        }
    }

    private fun hentikanDiri() {
        runCatching { lokasi.removeLocationUpdates(penerima) }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        runCatching { lokasi.removeLocationUpdates(penerima) }
        super.onDestroy()
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }

    private fun siapkanKanal() {
        val pengelola = getSystemService(NotificationManager::class.java)
        if (pengelola.getNotificationChannel(KANAL) != null) return
        pengelola.createNotificationChannel(
            NotificationChannel(KANAL, getString(R.string.pelacakan_channel_nama), NotificationManager.IMPORTANCE_LOW)
                .apply { description = getString(R.string.pelacakan_channel_deskripsi) },
        )
    }

    private fun notifikasi(judul: String): Notification {
        val buka = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, KANAL)
            .setContentTitle(judul)
            .setContentText("GPS merekam perjalanan. Jangan tutup paksa aplikasi.")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(buka)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    companion object {
        private const val KANAL = "pelacakan-rit"
        private const val ID_NOTIFIKASI = 4177
        private const val EKSTRA_RIT = "ritId"
        private const val EKSTRA_JUDUL = "judul"

        /** Satu titik tiap 30 detik cukup untuk rute truk dan hemat baterai. */
        private const val INTERVAL_MS = 30_000L
        private const val INTERVAL_MINIMUM_MS = 15_000L
        private const val JARAK_MINIMUM_M = 25f

        /** Jeda di atas ini dianggap service sempat mati. */
        private const val AMBANG_BOLONG_MS = 5 * 60_000L

        fun mulai(context: Context, ritId: String, judul: String) {
            val intent = Intent(context, LayananPelacakan::class.java)
                .putExtra(EKSTRA_RIT, ritId)
                .putExtra(EKSTRA_JUDUL, judul)
            context.startForegroundService(intent)
        }

        fun hentikan(context: Context) {
            context.stopService(Intent(context, LayananPelacakan::class.java))
        }
    }
}
