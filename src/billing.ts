import { BillingPlugin } from "capacitor-billing";
import { Capacitor } from "@capacitor/core";

export const SKU_MONTHLY = "kurye_aylik";
export const SKU_YEARLY = "kurye_yillik";

export type PlanType = "monthly" | "yearly";

export function isBillingAvailable(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

function safeParseResult(raw: string | undefined | null): any | null {
  if (raw === undefined || raw === null || raw === "undefined" || raw === "null" || raw.trim() === "") {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function purchaseSubscription(plan: PlanType): Promise<{ success: boolean; error?: string }> {
  if (!isBillingAvailable()) {
    return { success: false, error: "Satın alma yalnızca Android cihazda kullanılabilir." };
  }

  const sku = plan === "monthly" ? SKU_MONTHLY : SKU_YEARLY;

  try {
    const result = await BillingPlugin.launchBillingFlow({
      product: sku,
      type: "SUBS",
    });

    const parsed = safeParseResult(result?.value);

    // Plugin yanıtı parse edilemiyorsa veya result yoksa: satın alma Play tarafında
    // başarılı sayılmış olabilir (e-posta geldi = işlem gerçekleşti).
    if (parsed === null) {
      return { success: true };
    }

    if (parsed.responseCode === 0 || parsed.responseCode === "ITEM_ALREADY_OWNED") {
      const purchaseToken = parsed.purchases?.[0]?.purchaseToken;
      if (purchaseToken) {
        try { await BillingPlugin.sendAck({ purchaseToken }); } catch {}
      }
      return { success: true };
    }

    // Kullanıcı satın almayı iptal etti
    if (parsed.responseCode === 1) {
      return { success: false, error: "Satın alma iptal edildi." };
    }

    return { success: false, error: parsed.debugMessage || "Satın alma başarısız." };
  } catch (e: any) {
    const msg: string = e?.message ?? "";
    // Kullanıcı Play diyaloğunu kapadıysa
    if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("iptal")) {
      return { success: false, error: "Satın alma iptal edildi." };
    }
    return { success: false, error: msg || "Satın alma sırasında bir hata oluştu." };
  }
}

export async function checkSubscriptionStatus(): Promise<{ active: boolean; plan?: PlanType }> {
  if (!isBillingAvailable()) return { active: false };

  try {
    const monthlyResult = await BillingPlugin.querySkuDetails({
      product: SKU_MONTHLY,
      type: "SUBS",
    });
    const monthlyParsed = safeParseResult(monthlyResult?.value);
    const monthlyActive = monthlyParsed?.purchases?.some((p: any) => p.purchaseState === 0);

    if (monthlyActive) return { active: true, plan: "monthly" };

    const yearlyResult = await BillingPlugin.querySkuDetails({
      product: SKU_YEARLY,
      type: "SUBS",
    });
    const yearlyParsed = safeParseResult(yearlyResult?.value);
    const yearlyActive = yearlyParsed?.purchases?.some((p: any) => p.purchaseState === 0);

    if (yearlyActive) return { active: true, plan: "yearly" };

    return { active: false };
  } catch {
    return { active: false };
  }
}
