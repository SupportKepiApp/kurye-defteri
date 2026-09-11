#!/usr/bin/env node
// Billing 8.1.0 uyumluluğu için capacitor-billing eklentisine yama uygula.
// node_modules her npm install sonrası sıfırlanır; bu script yamayı otomatik geri yükler.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "patches", "capacitor-billing-BillingPlugin.java");
const dest = join(
  root,
  "node_modules",
  "capacitor-billing",
  "android",
  "src",
  "main",
  "java",
  "de",
  "carstenklaffke",
  "billing",
  "BillingPlugin.java",
);

if (!existsSync(src)) {
  console.warn(`[patches] ${src} bulunamadı, atlanıyor.`);
  process.exit(0);
}

const destDir = dirname(dest);
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

try {
  copyFileSync(src, dest);
  console.log(`[patches] capacitor-billing BillingPlugin.java güncellendi (billing 8.1.0 uyumlu).`);
} catch (e) {
  console.warn(`[patches] Yama uygulanamadı: ${e.message}`);
}
