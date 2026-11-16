package id.apn.supir.ui.layar.pengajuan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoAuth
import id.apn.supir.data.repo.RepoRit
import id.apn.supir.data.repo.RepoPengajuan
import id.apn.supir.domain.PoAktif
import id.apn.supir.domain.RitAktif
import id.apn.supir.domain.StatusVerifikasi
import id.apn.supir.domain.Supir
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanBeranda(
    val po: List<PoAktif> = emptyList(),
    val supir: Supir? = null,
    val ritAktif: RitAktif? = null,
    val sedangMuat: Boolean = true,
    val galat: String? = null,
    val offline: Boolean = false,
) {
    val bolehAjukan: Boolean
        get() = supir?.statusVerifikasi == StatusVerifikasi.TERVERIFIKASI && ritAktif == null

    /** Alasan tombol Ajukan mati, ditulis untuk dibaca supir. */
    fun alasanTidakBolehAjukan(po: PoAktif): String? = when {
        po.penuh -> "Kuota PO ini sudah penuh"
        ritAktif != null -> "Selesaikan dulu rit yang berjalan"
        supir?.statusVerifikasi == StatusVerifikasi.MENUNGGU_VERIFIKASI ->
            "Akun Anda masih menunggu verifikasi kantor"

        supir?.statusVerifikasi == StatusVerifikasi.DITOLAK -> "Pendaftaran Anda ditolak kantor"
        else -> null
    }
}

@HiltViewModel
class VmBeranda @Inject constructor(
    private val repoPengajuan: RepoPengajuan,
    private val repoRit: RepoRit,
    repoAuth: RepoAuth,
) : ViewModel() {

    private val _keadaan = MutableStateFlow(KeadaanBeranda())
    val keadaan = _keadaan.asStateFlow()

    val namaSupir: String = repoAuth.nama ?: "Supir"

    init {
        viewModelScope.launch {
            repoRit.ritAktif.collect { rit ->
                _keadaan.value = _keadaan.value.copy(ritAktif = rit)
            }
        }
        muat()
    }

    fun muat() {
        _keadaan.value = _keadaan.value.copy(sedangMuat = true, galat = null, offline = false)
        viewModelScope.launch {
            // Rit disegarkan juga: kartu "rit berjalan" harus benar sebelum
            // supir memutuskan mengajukan DO baru.
            repoRit.segarkan()
            _keadaan.value = when (val hasil = repoPengajuan.muatPo()) {
                is Hasil.Sukses -> _keadaan.value.copy(
                    sedangMuat = false,
                    po = hasil.data.po,
                    supir = hasil.data.supir,
                )

                is Hasil.Galat -> _keadaan.value.copy(sedangMuat = false, galat = hasil.pesan)
                Hasil.Offline -> _keadaan.value.copy(
                    sedangMuat = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Daftar PO yang tampil mungkin belum yang terbaru.",
                )
            }
        }
    }
}
