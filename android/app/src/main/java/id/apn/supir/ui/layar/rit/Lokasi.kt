package id.apn.supir.ui.layar.rit

import android.content.Context
import android.location.Location
import com.google.android.gms.location.LocationServices
import id.apn.supir.domain.TitikGps

/**
 * Membaca lokasi sekali, tepat saat tombol ditekan.
 *
 * Checkpoint wajib bercap tempat, tetapi membaca GPS terus-menerus pada layar
 * yang diam hanya memboroskan baterai — pelacakan rute sudah ditangani
 * foreground service. Bila izin belum ada atau GPS gagal, aksi tetap jalan
 * tanpa koordinat: menahan langkah supir di lapangan lebih merugikan.
 */
internal fun ambilLokasiLalu(context: Context, izin: Boolean, lanjut: (TitikGps?) -> Unit) {
    if (!izin) {
        lanjut(null)
        return
    }
    val klien = LocationServices.getFusedLocationProviderClient(context)
    runCatching {
        klien.lastLocation
            .addOnSuccessListener { lokasi: Location? ->
                lanjut(
                    lokasi?.let {
                        TitikGps(it.latitude, it.longitude, it.accuracy, System.currentTimeMillis())
                    },
                )
            }
            .addOnFailureListener { lanjut(null) }
    }.onFailure { lanjut(null) }
}
