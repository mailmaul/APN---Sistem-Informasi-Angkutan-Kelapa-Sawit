package id.apn.supir.data.lokal

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters

class KonverterAksi {
    @TypeConverter
    fun keTeks(jenis: JenisAksi): String = jenis.name

    @TypeConverter
    fun dariTeks(teks: String): JenisAksi = JenisAksi.valueOf(teks)
}

@Database(
    entities = [
        AksiTertundaEntity::class,
        RitAktifEntity::class,
        TitikTertundaEntity::class,
        BolongPelacakanEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
@TypeConverters(KonverterAksi::class)
abstract class BasisDataApn : RoomDatabase() {
    abstract fun aksiDao(): AksiDao
    abstract fun ritDao(): RitDao
    abstract fun titikDao(): TitikDao
}
