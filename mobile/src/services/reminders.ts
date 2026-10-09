import { Platform } from 'react-native';
import type { Booking } from '../types';
import { reminderTime } from '../domain';
const APP = 'vku-room-booking';
let queue: Promise<unknown> = Promise.resolve();
async function module() {
  const n = await import('expo-notifications');
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  return n;
}
export async function prepareNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const n = await module();
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android')
    await n.setNotificationChannelAsync('booking-reminders', {
      name: 'Nhắc lịch đặt phòng',
      importance: n.AndroidImportance.HIGH,
      sound: 'default',
    });
  let p = await n.getPermissionsAsync();
  if (!p.granted) p = await n.requestPermissionsAsync();
  return p.granted;
}
export function reconcileReminders(
  bookings: Booking[],
  scope: string,
  offset = 0,
): Promise<string> {
  const job = queue
    .catch(() => undefined)
    .then(async () => {
      if (Platform.OS === 'web')
        return 'Nhắc lịch chỉ hoạt động trên Android/iOS.';
      const n = await module();
      const old = (await n.getAllScheduledNotificationsAsync()).filter(
        (item) =>
          item.content.data?.app === APP && item.content.data?.scope !== 'test',
      );
      const desired = new Map(
        bookings.flatMap((b) => {
          const date = reminderTime(b, Date.now() + offset);
          return date ? [[b.id, { booking: b, date }] as const] : [];
        }),
      );
      for (const item of old)
        if (
          item.content.data?.scope !== scope ||
          !desired.has(String(item.content.data?.bookingId))
        )
          await n.cancelScheduledNotificationAsync(item.identifier);
      if (!(await n.getPermissionsAsync()).granted)
        return 'Chưa cấp quyền thông báo. Lịch đặt vẫn được lưu trên máy chủ.';
      for (const [id, { booking: b, date }] of desired) {
        if (
          old.some(
            (item) =>
              item.content.data?.scope === scope &&
              item.content.data?.bookingId === id,
          )
        )
          continue;
        await n.scheduleNotificationAsync({
          content: {
            title: 'Sắp đến giờ nhận phòng',
            body: `${b.roomName} bắt đầu sau 15 phút. Mã ${b.code}.`,
            sound: 'default',
            data: { app: APP, scope, bookingId: id },
          },
          trigger: {
            type: n.SchedulableTriggerInputTypes.DATE,
            date: new Date(date.getTime() - offset),
            channelId: 'booking-reminders',
          },
        });
      }
      return desired.size
        ? `Đã kiểm tra ${desired.size} lịch nhắc trước 15 phút.`
        : 'Không có lịch nhắc tương lai; lịch gần giờ bắt đầu có thể đã qua mốc nhắc.';
    });
  queue = job;
  return job;
}
export async function testNotification(): Promise<void> {
  if (!(await prepareNotifications()))
    throw new Error('Cần cấp quyền thông báo trên điện thoại.');
  const n = await module();
  await n.scheduleNotificationAsync({
    content: {
      title: 'Kiểm tra thông báo',
      body: 'Thông báo thử của VKU Room Booking; không phải nhắc lịch đặt phòng.',
      data: { app: APP, scope: 'test' },
      sound: 'default',
    },
    trigger: {
      type: n.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
      channelId: 'booking-reminders',
    },
  });
}
