package id.apn.supir.ui.layar.akun

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.KolomIsian
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolUtama

@Composable
fun LayarDaftar(
    onKembali: () -> Unit,
    onTerkirim: () -> Unit,
    vm: VmDaftar = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()

    LaunchedEffect(keadaan.terkirim) {
        if (keadaan.terkirim) onTerkirim()
    }

    Scaffold(
        topBar = { BilahAtas(judul = "Daftar Supir", onKembali = onKembali) },
        bottomBar = {
            TombolAksiBawah {
                keadaan.galat?.let { PesanGalat(it, offline = keadaan.offline) }
                TombolUtama(
                    teks = "Kirim Pendaftaran",
                    sedangJalan = keadaan.sedangKirim,
                    keterangan = "Kantor memeriksa dulu sebelum Anda bisa mengajukan DO",
                    onKlik = vm::kirim,
                )
            }
        },
    ) { isi ->
        Column(
            modifier = Modifier
                .padding(isi)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            KartuApn {
                Text("Sebelum mendaftar", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Isi data sesuai SIM. Setelah dikirim, kantor memverifikasi akun Anda. " +
                        "Selama belum diverifikasi, daftar PO tetap bisa dilihat tetapi tombol " +
                        "Ajukan DO masih mati.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(20.dp))

            KolomIsian(
                nilai = keadaan.nama,
                label = "Nama lengkap",
                onUbah = vm::ubahNama,
                aktif = !keadaan.sedangKirim,
                galat = keadaan.galatNama,
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.hp,
                label = "Nomor HP",
                onUbah = vm::ubahHp,
                jenisPapanKetik = KeyboardType.Phone,
                aktif = !keadaan.sedangKirim,
                bantuan = "Nomor ini juga dipakai untuk masuk",
                galat = keadaan.galatHp,
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.password,
                label = "Password",
                onUbah = vm::ubahPassword,
                rahasia = true,
                jenisPapanKetik = KeyboardType.Password,
                aktif = !keadaan.sedangKirim,
                bantuan = "Minimal 6 karakter",
                galat = keadaan.galatPassword,
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.noSim,
                label = "Nomor SIM",
                onUbah = vm::ubahSim,
                aktif = !keadaan.sedangKirim,
                galat = keadaan.galatSim,
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.nopol,
                label = "Nopol truk (opsional)",
                onUbah = vm::ubahNopol,
                aktif = !keadaan.sedangKirim,
                bantuan = "Kosongkan kalau belum tahu truk yang akan dibawa",
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}
