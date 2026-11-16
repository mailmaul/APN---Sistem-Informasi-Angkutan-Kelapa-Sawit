package id.apn.supir.di

import android.content.Context
import androidx.room.Room
import androidx.work.WorkManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import id.apn.supir.BuildConfig
import id.apn.supir.data.jaringan.ApiApn
import id.apn.supir.data.jaringan.InterceptorSesi
import id.apn.supir.data.lokal.AksiDao
import id.apn.supir.data.lokal.BasisDataApn
import id.apn.supir.data.lokal.RitDao
import id.apn.supir.data.lokal.TitikDao
import id.apn.supir.data.sumber.SumberMobile
import id.apn.supir.data.sumber.SumberMobileJaringan
import id.apn.supir.data.sumber.SumberMobilePalsu
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ModulAplikasi {

    @Provides
    @Singleton
    fun json(): Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun okHttp(interceptorSesi: InterceptorSesi): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(interceptorSesi)
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))
            }
        }
        // Jaringan di rute sawit sering lambat, bukan mati: timeout dilonggarkan
        // supaya aksi tidak buru-buru jatuh ke antrian.
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    @Provides
    @Singleton
    fun retrofit(klien: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(klien)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun api(retrofit: Retrofit): ApiApn = retrofit.create(ApiApn::class.java)

    /**
     * Selama `api/mobile/…` belum ada di server, seluruh alur supir dilayani
     * sumber palsu. Satu sakelar, tidak ada cabang di lapisan atas.
     */
    @Provides
    @Singleton
    fun sumberMobile(
        jaringan: SumberMobileJaringan,
        palsu: SumberMobilePalsu,
    ): SumberMobile = if (BuildConfig.MOBILE_API_SIAP) jaringan else palsu

    @Provides
    @Singleton
    fun basisData(@ApplicationContext context: Context): BasisDataApn =
        Room.databaseBuilder(context, BasisDataApn::class.java, "apn-supir.db").build()

    @Provides
    fun aksiDao(db: BasisDataApn): AksiDao = db.aksiDao()

    @Provides
    fun ritDao(db: BasisDataApn): RitDao = db.ritDao()

    @Provides
    fun titikDao(db: BasisDataApn): TitikDao = db.titikDao()

    @Provides
    @Singleton
    fun workManager(@ApplicationContext context: Context): WorkManager =
        WorkManager.getInstance(context)

    @Provides
    @Singleton
    fun lokasi(@ApplicationContext context: Context): FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)
}
