# R8 / ProGuard kuralları — Kurye Defteri
# Not: minifyEnabled true ve shrinkResources true build.gradle'da tanımlı.
# R8 varsayılan olarak shrink + obfuscate yapar; bu dosyada sadece
# hangi sınıfların KORUNACAĞINI belirtiyoruz.

# Crash log'larında satır numaraları okunabilir kalsın
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- Capacitor çekirdek ---
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclasseswithmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}
-keepclasseswithmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}
-keepclasseswithmembers class * {
    @com.getcapacitor.annotation.ActivityResultCallback <methods>;
}

# --- Uygulama native plugin'i ---
-keep class com.kuryedefteri.app.tr.ExcelOpenerPlugin { *; }

# --- WebView JS köprüsü ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Google Play Billing ---
-keep class com.android.billingclient.** { *; }
-dontwarn com.android.billingclient.**
-keep class de.carstenklaffke.billing.** { *; }

# --- Google Play Services / Firebase ---
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**

# --- WebView uyumluluğu ---
-dontwarn android.webkit.WebViewRenderProcessClient
-dontwarn android.webkit.WebViewRenderProcess

# --- Parcelable ---
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

# --- Enum ---
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# --- R8 optimizasyon ---
-optimizationpasses 3
