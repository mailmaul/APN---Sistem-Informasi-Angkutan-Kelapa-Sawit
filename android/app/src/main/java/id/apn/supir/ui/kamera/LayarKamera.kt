package id.apn.supir.ui.kamera

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.NoPhotography
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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.LayarKosong
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolUtama
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Pengambil foto bukti.
 *
 * Galeri sengaja tidak pernah dibuka: bukti harus lahir dari kamera saat itu
 * juga. Stempel waktu dan lokasi dibubuhkan server, bukan di perangkat —
 * perangkat supir bisa diubah jamnya.
 *
 * @param depan true untuk selfie pendaftaran/pengajuan.
 * @param onHasil menerima path berkas JPEG di cache aplikasi.
 */
@Composable
fun LayarKamera(
    judul: String,
    petunjuk: String,
    depan: Boolean,
    onHasil: (String) -> Unit,
    onBatal: () -> Unit,
) {
    val context = LocalContext.current
    val pemilikDaurHidup = LocalLifecycleOwner.current

    var izinDiberi by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    var galat by remember { mutableStateOf<String?>(null) }
    var sedangAmbil by remember { mutableStateOf(false) }

    val pemintaIzin = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { diberi -> izinDiberi = diberi }

    LaunchedEffect(Unit) {
        if (!izinDiberi) pemintaIzin.launch(Manifest.permission.CAMERA)
    }

    val pengendali = remember {
        LifecycleCameraController(context).apply {
            setEnabledUseCases(LifecycleCameraController.IMAGE_CAPTURE)
            cameraSelector = if (depan) {
                CameraSelector.DEFAULT_FRONT_CAMERA
            } else {
                CameraSelector.DEFAULT_BACK_CAMERA
            }
        }
    }

    LaunchedEffect(izinDiberi) {
        if (izinDiberi) pengendali.bindToLifecycle(pemilikDaurHidup)
    }

    Scaffold(
        topBar = { BilahAtas(judul = judul, onKembali = onBatal) },
        bottomBar = {
            if (izinDiberi) {
                TombolAksiBawah {
                    galat?.let { PesanGalat(it) }
                    TombolUtama(
                        teks = "Ambil Foto",
                        ikon = Icons.Default.CameraAlt,
                        sedangJalan = sedangAmbil,
                        keterangan = petunjuk,
                    ) {
                        sedangAmbil = true
                        galat = null
                        ambilFoto(
                            context = context,
                            pengendali = pengendali,
                            onSukses = { path ->
                                sedangAmbil = false
                                onHasil(path)
                            },
                            onGagal = { pesan ->
                                sedangAmbil = false
                                galat = pesan
                            },
                        )
                    }
                }
            }
        },
    ) { isi ->
        if (!izinDiberi) {
            LayarKosong(
                ikon = Icons.Default.NoPhotography,
                judul = "Kamera belum diizinkan",
                pesan = "Bukti rit wajib difoto langsung, galeri tidak dipakai. " +
                    "Izinkan kamera untuk melanjutkan.",
                aksi = "Izinkan Kamera",
                onAksi = { pemintaIzin.launch(Manifest.permission.CAMERA) },
                modifier = Modifier.padding(isi),
            )
            return@Scaffold
        }

        Column(modifier = Modifier.padding(isi).fillMaxSize()) {
            Text(
                petunjuk,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        PreviewView(ctx).apply {
                            scaleType = PreviewView.ScaleType.FILL_CENTER
                            controller = pengendali
                        }
                    },
                )
            }
        }
    }
}

private fun ambilFoto(
    context: Context,
    pengendali: LifecycleCameraController,
    onSukses: (String) -> Unit,
    onGagal: (String) -> Unit,
) {
    val folder = File(context.cacheDir, "foto").apply { mkdirs() }
    val cap = SimpleDateFormat("yyyyMMdd-HHmmss", Locale("id")).format(Date())
    val berkas = File(folder, "apn-$cap.jpg")

    pengendali.takePicture(
        ImageCapture.OutputFileOptions.Builder(berkas).build(),
        ContextCompat.getMainExecutor(context),
        object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(hasil: ImageCapture.OutputFileResults) {
                onSukses(berkas.absolutePath)
            }

            override fun onError(galat: ImageCaptureException) {
                onGagal("Foto gagal diambil: ${galat.message ?: "kamera tidak merespons"}")
            }
        },
    )
}


