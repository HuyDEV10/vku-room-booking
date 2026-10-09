import type { Booking, Filters, Room } from './types';
export const DEFAULT_FILTERS: Filters = {
  query: '',
  building: '',
  capacity: 2,
  equipment: [],
};
export function vietnamDate(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function nextDays(now = Date.now()): string[] {
  const start = Date.parse(`${vietnamDate(now)}T12:00:00+07:00`);
  return Array.from({ length: 7 }, (_, i) => vietnamDate(start + i * 86400000));
}
export function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00+07:00`).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}
export function timeLabel(instant: string): string {
  return new Date(instant).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export function filterRooms(rooms: Room[], filters: Filters): Room[] {
  const query = filters.query.trim().toLocaleLowerCase('vi-VN');
  return rooms.filter(
    (r) =>
      (!query ||
        `${r.name} ${r.building}`.toLocaleLowerCase('vi-VN').includes(query)) &&
      (!filters.building || r.building === filters.building) &&
      r.capacity >= filters.capacity &&
      filters.equipment.every((e) => r.equipment.includes(e)),
  );
}
export function reminderTime(b: Booking, now = Date.now()): Date | null {
  const t = Date.parse(b.startsAt) - 15 * 60000;
  return b.status === 'CONFIRMED' && t > now ? new Date(t) : null;
}
export function normalizeApi(value: string): string {
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw new Error('Nhập URL gốc API, không thêm /api hoặc /api/health.');
  return url.origin;
}
export function qrPayload(b: Booking): string {
  return `vku-booking:${b.code}`;
}
export function canCheckIn(b: Booking, now = Date.now()): boolean {
  return (
    b.status === 'CONFIRMED' &&
    now >= Date.parse(b.startsAt) - 15 * 60000 &&
    now < Date.parse(b.endsAt)
  );
}
