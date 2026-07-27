package com.kuryedefteri.app.tr;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import de.carstenklaffke.billing.BillingPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExcelOpenerPlugin.class);
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);

        // Eski Android / WebView sürümlerinde (Huawei P20 Lite vb.)
        // WebViewRenderProcessClient sınıfı yoksa çökmeyi önle.
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Sınıf mevcut mu güvenli kontrol
                Class.forName("android.webkit.WebViewRenderProcessClient");
            }
        } catch (ClassNotFoundException e) {
            // Sınıf yoksa sessizce yoksay - WebView normal çalışmaya devam eder
        } catch (Throwable e) {
            // Beklenmedik hataları da güvenli yut
        }

        // SystemBars / windowInsets entegrasyonunu güvenli çağır
        try {
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(
                getWindow(), getWindow().getDecorView());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        } catch (Throwable e) {
            // Eski cihazlarda SystemBars API yoksa yoksay
        }
    }
}
