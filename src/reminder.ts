import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "kurye-defteri-reminder";

export async function ensureNotificationChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Kurye Defteri Hatırlatıcı",
      description: "Gün sonu kazanç ve KM girişi hatırlatıcıları",
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // Web platformunda veya kanal zaten varsa sessizce yoksay
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const permStatus = await LocalNotifications.checkPermissions();
    return permStatus.display === "granted";
  } catch {
    return false;
  }
}

export interface ReminderConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  days: number[];
}

function getNextOccurrence(dayOfWeek: number, hour: number, minute: number): Date {
  const now = new Date();
  const result = new Date();
  result.setHours(hour, minute, 0, 0);

  let diff = dayOfWeek - now.getDay();
  if (diff < 0) diff += 7;
  if (diff === 0 && result.getTime() <= now.getTime()) diff = 7;
  result.setDate(now.getDate() + diff);
  return result;
}

let clickListenerRegistered = false;

export function registerNotificationClickListener(): void {
  if (clickListenerRegistered) return;
  clickListenerRegistered = true;

  try {
    LocalNotifications.addListener("localNotificationActionPerformed", () => {
      // Android'de bildirime tıklandığında uygulama otomatik açılır
      // bu dinleyici ek loglama/geliştirme için
    });
  } catch {
    // Web platformunda yoksay
  }
}

export async function scheduleReminders(reminder: ReminderConfig): Promise<boolean> {
  await ensureNotificationChannel();
  registerNotificationClickListener();

  if (!reminder.enabled || reminder.days.length === 0) {
    await cancelAllReminders();
    return true;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return false;

  await cancelAllReminders();

  const notifications = reminder.days.map((dayId, idx) => {
    const fireDate = getNextOccurrence(dayId, reminder.hour, reminder.minute);
    return {
      id: 100 + idx,
      title: "Kurye Defteri",
      body: "Gün sonu kazanç ve KM girişini unutmayın!",
      channelId: CHANNEL_ID,
      schedule: {
        at: fireDate,
        repeats: true,
        every: "week" as const,
        allowWhileIdle: true,
      },
      smallIcon: "ic_launcher",
      largeIcon: "ic_launcher",
    };
  });

  try {
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      const ids = pending.notifications
        .filter((n) => n.id >= 100 && n.id < 200)
        .map((n) => n.id);
      if (ids.length > 0) {
        await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
      }
    }
  } catch {
    // sessizce yoksay
  }
}

export function isNativePlatform(): boolean {
  return (
    typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform?.() === true
  );
}
