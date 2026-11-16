package id.apn.supir.ui.layar.pengajuan

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import id.apn.supir.ui.kamera.LayarKamera
import id.apn.supir.ui.komponen.BarisData
import id.apn.supir.ui.komponen.BilahAtas
import id.apn.supir.ui.komponen.KartuApn
import id.apn.supir.ui.komponen.KolomIsian
import id.apn.supir.ui.komponen.Memuat
import id.apn.supir.ui.komponen.PesanGalat
import id.apn.supir.ui.komponen.TombolAksiBawah
import id.apn.supir.ui.komponen.TombolSekunder
import id.apn.supir.ui.komponen.TombolUtama
import java.io.File

private const val PENANDA_OTOMATIS = "Terisi otomatis — periksa, ubah bila truk lain"

@Composable
fun LayarBuatDo(
    onBatal: () -> Unit,
    onTerkirim: (String) -> Unit,
    vm: VmBuatDo = hiltViewModel(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()

    LaunchedEffect(keadaan.idTerkirim) {
        keadaan.idTerkirim?.let(onTerkirim)
    }

    if (keadaan.sedangMemotret) {
        LayarKamera(
            judul = "Selfie Pengajuan",
            petunjuk = "Wajah terlihat jelas, tidak memakai helm. Foto ini jadi bukti " +
                "siapa yang membawa DO.",
            depan = true,
            onHasil = vm::simpanFoto,
            onBatal = vm::batalKamera,
        )
        return
    }

    Scaffold(
        topBar = { BilahAtas(judul = "Buat DO", onKembali = onBatal) },
        bottomBar = {
            TombolAksiBawah {
                keadaan.galat?.let { PesanGalat(it, offline = keadaan.offline) }
                TombolUtama(
                    teks = "Kirim Pengajuan",
                    ikon = Icons.Default.Send,
                    aktif = keadaan.syaratKurang == null && keadaan.po != null,
                    sedangJalan = keadaan.sedangKirim,
                    keterangan = keadaan.syaratKurang
                        ?: "Kantor memutuskan lewat Telegram atau web admin",
                    onKlik = vm::kirim,
                )
            }
        },
    ) { isi ->
        if (keadaan.sedangMuat) {
            Memuat(Modifier.padding(isi))
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .padding(isi)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            keadaan.po?.let { po ->
                KartuApn {
                    Text(po.noSpk, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    BarisData("Shipper", po.shipper)
                    BarisData("Barang", po.jenisBarang.label)
                    BarisData("Muat", po.lokasiAsal)
                    BarisData("Bongkar", po.lokasiTujuan)
                    BarisData("Sisa kuota", "${po.sisaKuota} unit")
                }
            }

            Spacer(Modifier.height(20.dp))
            Text("Data pembawa DO", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))

            KolomIsian(
                nilai = keadaan.nama,
                label = "Nama supir",
                onUbah = vm::ubahNama,
                aktif = !keadaan.sedangKirim,
                bantuan = PENANDA_OTOMATIS.takeIf { "nama" in keadaan.terisiOtomatis },
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.nopol,
                label = "Nopol truk",
                onUbah = vm::ubahNopol,
                aktif = !keadaan.sedangKirim,
                bantuan = PENANDA_OTOMATIS.takeIf { "nopol" in keadaan.terisiOtomatis },
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.noSim,
                label = "Nomor SIM",
                onUbah = vm::ubahSim,
                aktif = !keadaan.sedangKirim,
                bantuan = PENANDA_OTOMATIS.takeIf { "noSim" in keadaan.terisiOtomatis },
            )
            Spacer(Modifier.height(14.dp))
            KolomIsian(
                nilai = keadaan.noHp,
                label = "Nomor HP",
                onUbah = vm::ubahHp,
                jenisPapanKetik = KeyboardType.Phone,
                aktif = !keadaan.sedangKirim,
                bantuan = PENANDA_OTOMATIS.takeIf { "noHp" in keadaan.terisiOtomatis },
            )

            Spacer(Modifier.height(20.dp))
            Text("Selfie di depan truk", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(
                "Wajib diambil langsung dari kamera; galeri tidak dipakai supaya bukti tidak bisa dipinjam.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))

            val foto = keadaan.fotoSelfie
            if (foto == null) {
                TombolSekunder(teks = "Ambil Selfie", ikon = Icons.Default.CameraAlt, onKlik = vm::bukaKamera)
            } else {
                AsyncImage(
                    model = File(foto),
                    contentDescription = "Selfie pengajuan",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(3f / 4f)
                        .clip(MaterialTheme.shapes.medium),
                )
                Spacer(Modifier.height(10.dp))
                TombolSekunder(teks = "Ulangi Foto", ikon = Icons.Default.CameraAlt, onKlik = vm::bukaKamera)
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
