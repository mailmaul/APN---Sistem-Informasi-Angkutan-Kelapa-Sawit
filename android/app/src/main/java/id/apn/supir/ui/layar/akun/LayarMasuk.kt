package id.apn.supir.ui.layar.akun

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.ui.komponen.KolomIsian
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TautanTeks
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolUtama

@Composable
fun LayarMasuk(
    onBerhasil: () -> Unit,
    onDaftar: () -> Unit,
    vm: VmMasuk = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()

    LaunchedEffect(keadaan.berhasil) {
        if (keadaan.berhasil) onBerhasil()
    }

    Scaffold(
        bottomBar = {
            TombolAksiBawah {
                keadaan.galat?.let { PesanGalat(it, offline = keadaan.offline) }
                TombolUtama(
                    teks = "Masuk",
                    ikon = Icons.AutoMirrored.Filled.Login,
                    sedangJalan = keadaan.sedangKirim,
                    onKlik = vm::masuk,
                )
                TautanTeks(
                    teks = "Belum punya akun? Daftar",
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    onKlik = onDaftar,
                )
            }
        },
    ) { isi ->
        Column(
            modifier = Modifier
                .padding(isi)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("APN Supir", style = MaterialTheme.typography.displaySmall)
            Spacer(Modifier.height(8.dp))
            Text(
                "Aplikasi supir Adila Paris Nusantara. Ajukan DO, jalankan rit, " +
                    "dan laporkan bukti dari satu layar.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(32.dp))

            KolomIsian(
                nilai = keadaan.identitas,
                label = "Username atau nomor HP",
                onUbah = vm::ubahIdentitas,
                aktif = !keadaan.sedangKirim,
                bantuan = "Supir memakai nomor HP, staf kantor memakai username",
                galat = keadaan.galatIdentitas,
            )
            Spacer(Modifier.height(16.dp))
            KolomIsian(
                nilai = keadaan.password,
                label = "Password",
                onUbah = vm::ubahPassword,
                rahasia = true,
                aktif = !keadaan.sedangKirim,
                jenisPapanKetik = KeyboardType.Password,
                galat = keadaan.galatPassword,
            )
        }
    }
}
