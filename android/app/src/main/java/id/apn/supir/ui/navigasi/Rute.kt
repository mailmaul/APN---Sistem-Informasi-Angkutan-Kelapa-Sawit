package id.apn.supir.ui.navigasi

import kotlinx.serialization.Serializable

/**
 * Rute type-safe Navigation Compose. Nama properti menjadi kunci argumen di
 * `SavedStateHandle`, jadi `kontrakId`/`pengajuanId` di bawah harus sama persis
 * dengan yang dibaca ViewModel.
 */
@Serializable
data object RuteMasuk

@Serializable
data object RuteDaftar

@Serializable
data object RuteVerifikasi

@Serializable
data object RuteBeranda

@Serializable
data class RuteBuatDo(val kontrakId: String)

@Serializable
data class RuteMenunggu(val pengajuanId: String)

@Serializable
data object RuteRit

@Serializable
data object RuteKendala

@Serializable
data object RuteRiwayat

@Serializable
data object RutePengaturan
