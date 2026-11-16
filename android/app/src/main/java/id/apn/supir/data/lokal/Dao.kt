package id.apn.supir.data.lokal

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface AksiDao {
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun tambah(aksi: AksiTertundaEntity)

    @Query("SELECT * FROM aksi_tertunda ORDER BY dibuatPada ASC")
    suspend fun semua(): List<AksiTertundaEntity>

    @Query("SELECT * FROM aksi_tertunda ORDER BY dibuatPada ASC")
    fun alirkan(): Flow<List<AksiTertundaEntity>>

    @Query("SELECT COUNT(*) FROM aksi_tertunda")
    fun jumlah(): Flow<Int>

    @Query("DELETE FROM aksi_tertunda WHERE id = :id")
    suspend fun hapus(id: String)

    @Query("UPDATE aksi_tertunda SET percobaan = percobaan + 1, galatTerakhir = :galat WHERE id = :id")
    suspend fun tandaiGagal(id: String, galat: String?)
}

@Dao
interface RitDao {
    @Upsert
    suspend fun simpan(rit: RitAktifEntity)

    @Query("SELECT * FROM rit_aktif LIMIT 1")
    fun alirkan(): Flow<RitAktifEntity?>

    @Query("SELECT * FROM rit_aktif LIMIT 1")
    suspend fun ambil(): RitAktifEntity?

    @Query("UPDATE rit_aktif SET status = :status, diperbaruiPada = :waktu WHERE id = :id")
    suspend fun perbaruiStatus(id: String, status: String, waktu: Long)

    @Query("DELETE FROM rit_aktif")
    suspend fun kosongkan()
}

@Dao
interface TitikDao {
    @Insert
    suspend fun tambah(titik: TitikTertundaEntity)

    @Query("SELECT * FROM titik_tertunda WHERE ritId = :ritId ORDER BY waktu ASC LIMIT :batas")
    suspend fun tertunda(ritId: String, batas: Int = 200): List<TitikTertundaEntity>

    @Query("SELECT * FROM titik_tertunda ORDER BY waktu ASC LIMIT :batas")
    suspend fun semuaTertunda(batas: Int = 200): List<TitikTertundaEntity>

    @Query("DELETE FROM titik_tertunda WHERE id IN (:ids)")
    suspend fun hapus(ids: List<Long>)

    @Query("SELECT MAX(waktu) FROM titik_tertunda WHERE ritId = :ritId")
    suspend fun waktuTerakhir(ritId: String): Long?

    @Insert
    suspend fun catatBolong(bolong: BolongPelacakanEntity)

    @Query("SELECT * FROM bolong_pelacakan WHERE ritId = :ritId ORDER BY mulai DESC")
    fun bolong(ritId: String): Flow<List<BolongPelacakanEntity>>
}
