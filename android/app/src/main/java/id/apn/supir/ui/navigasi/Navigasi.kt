package id.apn.supir.ui.navigasi

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import id.apn.supir.ui.layar.akun.LayarDaftar
import id.apn.supir.ui.layar.akun.LayarMasuk
import id.apn.supir.ui.layar.akun.LayarVerifikasi
import id.apn.supir.ui.layar.pengajuan.LayarBeranda
import id.apn.supir.ui.layar.pengajuan.LayarBuatDo
import id.apn.supir.ui.layar.pengajuan.LayarMenunggu
import id.apn.supir.ui.layar.rit.LayarKendala
import id.apn.supir.ui.layar.rit.LayarPengaturan
import id.apn.supir.ui.layar.rit.LayarRit
import id.apn.supir.ui.layar.rit.LayarRiwayat

/**
 * Satu NavHost untuk seluruh aplikasi. Tidak ada bottom navigation: supir
 * mengerjakan alur, bukan menjelajah menu.
 */
@Composable
fun NavigasiApn(
    vm: VmAplikasi = hiltViewModel(),
    navController: NavHostController = rememberNavController(),
) {
    val keadaan by vm.keadaan.collectAsStateWithLifecycle()
    if (!keadaan.siap) return

    val awal: Any = when {
        !keadaan.sudahMasuk -> RuteMasuk
        keadaan.pengajuanTertunda != null -> RuteMenunggu(keadaan.pengajuanTertunda!!)
        else -> RuteBeranda
    }

    NavHost(navController = navController, startDestination = awal) {

        composable<RuteMasuk> {
            LayarMasuk(
                onBerhasil = {
                    navController.navigate(RuteBeranda) {
                        popUpTo<RuteMasuk> { inclusive = true }
                    }
                },
                onDaftar = { navController.navigate(RuteDaftar) },
            )
        }

        composable<RuteDaftar> {
            LayarDaftar(
                onKembali = { navController.popBackStack() },
                onTerkirim = {
                    navController.navigate(RuteVerifikasi) {
                        popUpTo<RuteMasuk> { inclusive = false }
                    }
                },
            )
        }

        composable<RuteVerifikasi> {
            LayarVerifikasi(
                onLanjut = {
                    navController.navigate(RuteBeranda) {
                        popUpTo<RuteVerifikasi> { inclusive = true }
                    }
                },
                onKeluar = {
                    navController.navigate(RuteMasuk) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                },
            )
        }

        composable<RuteBeranda> {
            LayarBeranda(
                onBuatDo = { kontrakId -> navController.navigate(RuteBuatDo(kontrakId)) },
                onRitBerjalan = { navController.navigate(RuteRit) },
                onRiwayat = { navController.navigate(RuteRiwayat) },
                onPengaturan = { navController.navigate(RutePengaturan) },
            )
        }

        composable<RuteBuatDo> {
            LayarBuatDo(
                onBatal = { navController.popBackStack() },
                onTerkirim = { pengajuanId ->
                    navController.navigate(RuteMenunggu(pengajuanId)) {
                        popUpTo<RuteBeranda> { inclusive = false }
                    }
                },
            )
        }

        composable<RuteMenunggu> {
            LayarMenunggu(
                onDisetujui = {
                    navController.navigate(RuteRit) {
                        popUpTo<RuteBeranda> { inclusive = false }
                    }
                },
                onKembali = {
                    navController.navigate(RuteBeranda) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                },
            )
        }

        composable<RuteRit> {
            LayarRit(
                onKendala = { navController.navigate(RuteKendala) },
                onRiwayat = { navController.navigate(RuteRiwayat) },
                onPengaturan = { navController.navigate(RutePengaturan) },
                onTidakAdaRit = {
                    navController.navigate(RuteBeranda) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                },
            )
        }

        composable<RuteKendala> {
            LayarKendala(
                onSelesai = { navController.popBackStack() },
                onBatal = { navController.popBackStack() },
            )
        }

        composable<RuteRiwayat> {
            LayarRiwayat(onKembali = { navController.popBackStack() })
        }

        composable<RutePengaturan> {
            LayarPengaturan(
                onKembali = { navController.popBackStack() },
                onKeluar = {
                    navController.navigate(RuteMasuk) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                },
            )
        }
    }
}
