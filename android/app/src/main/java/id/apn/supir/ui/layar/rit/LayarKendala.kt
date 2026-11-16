package id.apn.supir.ui.layar.rit

import android.Manifest
import android.content.pm.PackageManager
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import id.apn.supir.domain.JenisKendala
import id.apn.supir.ui.kamera.LayarKamera
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolSekunder
import id.apn.supir.ui.komponen.TombolUtama
import id.apn.supir.ui.tema.TinggiAksiMinimum
import java.io.File

@Composable
fun LayarKendala(
    onSelesai: () -> Unit,
    onBatal: () -> Unit,
    vm: VmKendala = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val izinLokasi = remember {
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
    }

    LaunchedEffect(keadaan.selesai) {
        if (keadaan.selesai) onSelesai()
    }

    if (keadaan.sedangMemotret) {
        LayarKamera(
            judul = "Foto Kendala",
            petunjuk = "Ambil foto keadaan di lapangan supaya kantor paham tanpa bertanya.",
            depan = false,
            onHasil = vm::simpanFoto,
            onBatal = vm::batalKamera,
        )
        return
    }

    Scaffold(
        topBar = { BilahAtas(judul = "Lapor Kendala", onKembali = onBatal) },
        bottomBar = {
            TombolAksiBawah {
                keadaan.galat?.let { PesanGalat(it, offline = keadaan.offline) }
                TombolUtama(
                    teks = "Kirim Laporan",
                    sedangJalan = keadaan.sedangKirim,
                    aktif = keadaan.catatanCukup && keadaan.rit != null,
                    keterangan = if (!keadaan.catatanCukup) "Tulis dulu ceritanya" else null,
                ) {
                    ambilLokasiLalu(context, izinLokasi) { vm.kirim(it) }
                }
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
            Text("Kendala apa yang terjadi?", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))

            JenisKendala.entries.forEach { jenis ->
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clip(MaterialTheme.shapes.small)
                        .selectable(
                            selected = keadaan.jenis == jenis,
                            onClick = { vm.pilihJenis(jenis) },
                        ),
                    color = if (keadaan.jenis == jenis) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surfaceVariant
                    },
                    shape = MaterialTheme.shapes.small,
                ) {
                    androidx.compose.foundation.layout.Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(TinggiAksiMinimum + 8.dp)
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = keadaan.jenis == jenis, onClick = { vm.pilihJenis(jenis) })
                        Spacer(Modifier.width(4.dp))
                        Text(jenis.label, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            OutlinedTextField(
                value = keadaan.catatan,
                onValueChange = vm::ubahCatatan,
                label = { Text("Ceritakan kendalanya") },
                minLines = 3,
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.small,
            )

            Spacer(Modifier.height(20.dp))
            val foto = keadaan.fotoPath
            if (foto == null) {
                TombolSekunder(
                    teks = "Ambil Foto (opsional)",
                    ikon = Icons.Default.CameraAlt,
                    onKlik = vm::bukaKamera,
                )
            } else {
                AsyncImage(
                    model = File(foto),
                    contentDescription = "Foto kendala",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(4f / 3f)
                        .clip(MaterialTheme.shapes.medium),
                )
                Spacer(Modifier.height(8.dp))
                TombolSekunder(teks = "Ulangi Foto", ikon = Icons.Default.CameraAlt, onKlik = vm::bukaKamera)
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
