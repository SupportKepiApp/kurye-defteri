import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kuryedefteri.app.tr',
  appName: 'Kurye Defteri',
  webDir: 'dist',
  server: {
    // Android WebView'de HTTPS yerine HTTP scheme kullan (Supabase CORS uyumluluğu için)
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    BillingPlugin: {},
  },
};

export default config;
