package id.apn.supir.ui.layar.pengajuan

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import id.apn.supir.data.jaringan.Hasil
import id.apn.supir.data.repo.RepoPengajuan
import id.apn.supir.domain.FormPengajuan
import id.apn.supir.domain.PoAktif
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KeadaanBuatDo(
    val po: PoAktif? = null,
    val nama: String = "",
    val nopol: String = "",
    val noSim: String = "",
    val noHp: String = "",
    /** Kolom yang terisi dari data supir lama; ditandai di layar. */
    val terisiOtomatis: Set<String> = emptySet(),
    val fotoSelfie: String? = null,
    val sedangMemotret: Boolean = false,
    val sedangMuat: Boolean = true,
    val sedangKirim: Boolean = false,
    val galat: String? = null,
    val offline: Boolean = false,
    val idTerkirim: String? = null,
) {
    /** Syarat yang belum dipenuhi, dipakai sebagai keterangan tombol kirim. */
    val syaratKurang: String?
        get() = when {
            nama.isBlank() -> "Nama belum diisi"
            nopol.isBlank() -> "Nopol truk belum diisi"
            noSim.isBlank() -> "Nomor SIM belum diisi"
            noHp.isBlank() -> "Nomor HP belum diisi"
            fotoSelfie == null -> "Selfie wajib diambil dulu"
            else -> null
        }
}

@HiltViewModel
class VmBuatDo @Inject constructor(
    private val repo: RepoPengajuan,
    simpanan: SavedStateHandle,
) : ViewModel() {

    private val kontrakId: String = checkNotNull(simpanan["kontrakId"])

    private val _keadaan = MutableStateFlow(KeadaanBuatDo())
    val keadaan = _keadaan.asStateFlow()

    init {
        muat()
    }

    fun muat() {
        _keadaan.value = _keadaan.value.copy(sedangMuat = true, galat = null, offline = false)
        viewModelScope.launch {
            _keadaan.value = when (val hasil = repo.muatPo()) {
                is Hasil.Sukses -> {
                    val supir = hasil.data.supir
                    val po = hasil.data.po.firstOrNull { it.id == kontrakId }
                    // Supir tetap tinggal memeriksa; supir lepas mengubah seperlunya.
                    val otomatis = buildSet {
                        if (supir.nama.isNotBlank()) add("nama")
                        if (supir.hp.isNotBlank()) add("noHp")
                        if (!supir.noSim.isNullOrBlank()) add("noSim")
                        if (!supir.nopolTerakhir.isNullOrBlank()) add("nopol")
                    }
                    _keadaan.value.copy(
                        sedangMuat = false,
                        po = po,
                        nama = _keadaan.value.nama.ifBlank { supir.nama },
                        noHp = _keadaan.value.noHp.ifBlank { supir.hp },
                        noSim = _keadaan.value.noSim.ifBlank { supir.noSim.orEmpty() },
                        nopol = _keadaan.value.nopol.ifBlank { supir.nopolTerakhir.orEmpty() },
                        terisiOtomatis = otomatis,
                        galat = if (po == null) "PO ini sudah tidak ada di daftar aktif" else null,
                    )
                }

                is Hasil.Galat -> _keadaan.value.copy(sedangMuat = false, galat = hasil.pesan)
                Hasil.Offline -> _keadaan.value.copy(
                    sedangMuat = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Pengajuan DO butuh jaringan.",
                )
            }
        }
    }

    fun ubahNama(v: String) = ubah { it.copy(nama = v, terisiOtomatis = it.terisiOtomatis - "nama") }
    fun ubahNopol(v: String) =
        ubah { it.copy(nopol = v.uppercase(), terisiOtomatis = it.terisiOtomatis - "nopol") }

    fun ubahSim(v: String) = ubah { it.copy(noSim = v, terisiOtomatis = it.terisiOtomatis - "noSim") }
    fun ubahHp(v: String) = ubah { it.copy(noHp = v, terisiOtomatis = it.terisiOtomatis - "noHp") }

    private fun ubah(blok: (KeadaanBuatDo) -> KeadaanBuatDo) {
        _keadaan.value = blok(_keadaan.value).copy(galat = null)
    }

    fun bukaKamera() {
        _keadaan.value = _keadaan.value.copy(sedangMemotret = true)
    }

    fun batalKamera() {
        _keadaan.value = _keadaan.value.copy(sedangMemotret = false)
    }

    fun simpanFoto(path: String) {
        _keadaan.value = _keadaan.value.copy(fotoSelfie = path, sedangMemotret = false)
    }

    fun kirim() {
        val k = _keadaan.value
        if (k.syaratKurang != null || k.fotoSelfie == null) return

        _keadaan.value = k.copy(sedangKirim = true, galat = null, offline = false)
        viewModelScope.launch {
            val hasil = repo.ajukan(
                FormPengajuan(
                    kontrakId = kontrakId,
                    nama = k.nama.trim(),
                    nopol = k.nopol.trim(),
                    noSim = k.noSim.trim(),
                    noHp = k.noHp.trim(),
                    fotoSelfiePath = k.fotoSelfie,
                ),
            )
            _keadaan.value = when (hasil) {
                is Hasil.Sukses -> _keadaan.value.copy(sedangKirim = false, idTerkirim = hasil.data.id)
                is Hasil.Galat -> _keadaan.value.copy(sedangKirim = false, galat = hasil.pesan)
                Hasil.Offline -> _keadaan.value.copy(
                    sedangKirim = false,
                    offline = true,
                    galat = "Tidak ada sinyal. Pengajuan harus terkirim langsung supaya " +
                        "kuota PO bisa dikunci kantor — cari titik bersinyal lalu kirim lagi.",
                )
            }
        }
    }
}
