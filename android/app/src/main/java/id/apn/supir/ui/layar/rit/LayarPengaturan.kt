package id.apn.supir.ui.layar.rit

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.BatteryAlert
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.BuildConfig
import id.apn.supir.ui.komponen.BarisData
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolSekunder
import id.apn.supir.ui.komponen.TombolUtama

@Composable
fun LayarPengaturan(
    onKembali: () -> Unit,
    onKeluar: () -> Unit,
    vm: VmPengaturan = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()
    val context = LocalContext.current

    fun punyaIzin(izin: String) =
        ContextCompat.checkSelfPermission(context, izin) == PackageManager.PERMISSION_GRANTED

    var izinLokasi by remember { mutableStateOf(punyaIzin(Manifest.permission.ACCESS_FINE_LOCATION)) }
    var izinLatar by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
                punyaIzin(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
        )
    }
    var izinNotifikasi by remember {
        mutableStateOf(
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                punyaIzin(Manifest.permission.POST_NOTIFICATIONS),
        )
    }

    val peminta = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        izinLokasi = punyaIzin(Manifest.permission.ACCESS_FINE_LOCATION)
        izinLatar = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            punyaIzin(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        izinNotifikasi = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            punyaIzin(Manifest.permission.POST_NOTIFICATIONS)
    }

    LaunchedEffect(keadaan.sudahKeluar) {
        if (keadaan.sudahKeluar) onKeluar()
    }

    Scaffold(
        topBar = { BilahAtas(judul = "Pengaturan", onKembali = onKembali) },
        bottomBar = {
            TombolAksiBawah {
                TombolUtama(
                    teks = "Keluar",
                    ikon = Icons.AutoMirrored.Filled.Logout,
                    keterangan = if (keadaan.jumlahTertunda > 0) {
                        "Masih ada ${keadaan.jumlahTertunda} aksi belum terkirim — " +
                            "keluar akan membuangnya"
                    } else {
                        null
                    },
                    onKlik = vm::keluar,
                )
            }
        },
    ) { isi ->
        Column(
            modifier = Modifier
                .padding(isi)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            KartuApn {
                Text("Akun", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                BarisData("Supir", keadaan.nama)
                BarisData("Aksi menunggu terkirim", keadaan.jumlahTertunda.toString())
                BarisData("Versi aplikasi", BuildConfig.VERSION_NAME)
            }

            Spacer(Modifier.height(12.dp))
            KartuApn {
                Text("Izin yang dibutuhkan", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Pelacakan hanya jalan bila ketiganya hidup. Tanpa itu, jejak perjalanan " +
                        "bolong dan kantor tidak bisa membuktikan rit Anda.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                BarisData("Lokasi", if (izinLokasi) "Diizinkan" else "Belum")
                BarisData("Lokasi saat layar mati", if (izinLatar) "Diizinkan" else "Belum")
                BarisData("Notifikasi", if (izinNotifikasi) "Diizinkan" else "Belum")

                Spacer(Modifier.height(12.dp))
                if (!izinLokasi) {
                    TombolSekunder(teks = "Izinkan Lokasi") {
                        peminta.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                    }
                    Spacer(Modifier.height(8.dp))
                }
                if (izinLokasi && !izinLatar && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Android meminta izin latar hanya lewat halaman pengaturan,
                    // bukan lewat dialog biasa.
                    TombolSekunder(teks = "Izinkan Lokasi Saat Layar Mati") {
                        bukaPengaturanAplikasi(context)
                    }
                    Spacer(Modifier.height(8.dp))
                }
                if (!izinNotifikasi && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    TombolSekunder(teks = "Izinkan Notifikasi") {
                        peminta.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                    Spacer(Modifier.height(8.dp))
                }
                TombolSekunder(teks = "Buka Pengaturan Aplikasi") { bukaPengaturanAplikasi(context) }
            }

            Spacer(Modifier.height(12.dp))
            KartuApn {
                Text("Baterai", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Text(
                    "Banyak HP mematikan aplikasi latar belakang untuk menghemat baterai. " +
                        "Matikan penghematan untuk APN Supir supaya pelacakan tidak putus di tengah jalan.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                TombolSekunder(teks = "Matikan Optimasi Baterai", ikon = Icons.Default.BatteryAlert) {
                    runCatching {
                        context.startActivity(
                            Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                        )
                    }.onFailure { bukaPengaturanAplikasi(context) }
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

private fun bukaPengaturanAplikasi(context: android.content.Context) {
    context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
        },
    )
}
