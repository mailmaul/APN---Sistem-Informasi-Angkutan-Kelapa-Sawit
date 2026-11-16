package id.apn.supir.ui.layar.akun

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.PersonOff
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.domain.StatusVerifikasi
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.LayarKosong
import id.apn.supir.ui.komponen.Memuat
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TautanTeks
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolUtama

@Composable
fun LayarVerifikasi(
    onLanjut: () -> Unit,
    onKeluar: () -> Unit,
    vm: VmVerifikasi = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()

    // Pindah layar dipicu dari state, bukan dari composition: supaya tidak
    // berpindah dua kali saat layar digambar ulang.
    LaunchedEffect(keadaan.status) {
        if (keadaan.status == StatusVerifikasi.TERVERIFIKASI) onLanjut()
    }

    Scaffold(
        bottomBar = {
            TombolAksiBawah {
                keadaan.galat?.let { PesanGalat(it, offline = keadaan.offline) }
                TombolUtama(
                    teks = "Periksa Lagi",
                    sedangJalan = keadaan.sedangMuat,
                    onKlik = vm::muat,
                )
                TautanTeks(
                    teks = "Keluar",
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    onKlik = onKeluar,
                )
            }
        },
    ) { isi ->
        Box(modifier = Modifier.padding(isi).fillMaxSize()) {
            when {
                keadaan.status == null && keadaan.sedangMuat -> Memuat()

                keadaan.status == StatusVerifikasi.DITOLAK -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
                ) {
                    LayarKosong(
                        ikon = Icons.Default.PersonOff,
                        judul = "Pendaftaran ditolak",
                        pesan = "Perbaiki data Anda, lalu daftar ulang. Kalau alasannya kurang jelas, " +
                            "hubungi kantor.",
                        modifier = Modifier.weight(1f),
                    )
                    KartuApn {
                        Text("Alasan dari kantor", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            keadaan.alasanTolak ?: "Tidak ada catatan dari kantor.",
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }

                else -> LayarKosong(
                    ikon = Icons.Default.HourglassTop,
                    judul = "Menunggu verifikasi kantor",
                    pesan = "Akun Anda sudah masuk daftar kantor. Begitu diverifikasi, " +
                        "layar ini berpindah sendiri ke daftar PO.",
                )
            }
        }
    }
}
