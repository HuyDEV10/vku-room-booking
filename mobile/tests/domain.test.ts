import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCheckIn,
  DEFAULT_FILTERS,
  filterRooms,
  nextDays,
  normalizeApi,
  qrPayload,
  reminderTime,
  vietnamDate,
} from '../src/domain';
import type { Booking, Room } from '../src/types';
const room: Room = {
  id: 1,
  name: 'Phòng A101',
  building: 'A',
  floor: 1,
  capacity: 6,
  equipment: ['PROJECTOR', 'WHITEBOARD'],
  imageKey: 'study',
  occupiedNow: false,
};
const booking: Booking = {
  id: 'id',
  roomId: 1,
  roomName: room.name,
  date: '2026-10-10',
  slot: 0,
  partySize: 2,
  startsAt: '2026-10-10T00:30:00Z',
  endsAt: '2026-10-10T02:30:00Z',
  status: 'CONFIRMED',
  code: 'VKU-123456',
};
test('ngày Việt Nam đúng khi UTC còn ở ngày trước', () =>
  assert.equal(vietnamDate(Date.parse('2026-10-09T18:00:00Z')), '2026-10-10'));
test('bảy ngày liên tiếp qua cuối tháng', () =>
  assert.deepEqual(nextDays(Date.parse('2026-10-29T00:00:00Z')), [
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
  ]));
test('lọc kết hợp tòa, sức chứa, thiết bị và tìm kiếm', () => {
  assert.equal(
    filterRooms([room], {
      ...DEFAULT_FILTERS,
      query: 'a101',
      building: 'A',
      capacity: 6,
      equipment: ['PROJECTOR', 'WHITEBOARD'],
    }).length,
    1,
  );
  assert.equal(
    filterRooms([room], { ...DEFAULT_FILTERS, equipment: ['COMPUTER'] }).length,
    0,
  );
  assert.equal(
    filterRooms([room], { ...DEFAULT_FILTERS, capacity: 7 }).length,
    0,
  );
});
test('nhắc trước đúng 15 phút, không nhắc lịch hủy hay quá hạn', () => {
  const now = Date.parse('2026-10-09T00:00:00Z');
  assert.equal(
    reminderTime(booking, now)?.toISOString(),
    '2026-10-10T00:15:00.000Z',
  );
  assert.equal(reminderTime({ ...booking, status: 'CANCELLED' }, now), null);
  assert.equal(reminderTime(booking, Date.parse('2026-10-10T00:15:00Z')), null);
});
test('check-in đúng biên 15 phút đến trước kết thúc', () => {
  assert.equal(canCheckIn(booking, Date.parse('2026-10-10T00:14:59Z')), false);
  assert.equal(canCheckIn(booking, Date.parse('2026-10-10T00:15:00Z')), true);
  assert.equal(canCheckIn(booking, Date.parse(booking.endsAt)), false);
});
test('QR chỉ chứa mã đặt chỗ', () =>
  assert.equal(qrPayload(booking), 'vku-booking:VKU-123456'));
test('chuẩn hóa URL và từ chối đường dẫn hoặc thông tin đăng nhập', () => {
  assert.equal(normalizeApi(' https://api.example/ '), 'https://api.example');
  for (const url of [
    'https://api.example/api/health',
    'https://user:pass@api.example',
    'ftp://api.example',
    'https://api.example?x=1',
  ])
    assert.throws(() => normalizeApi(url));
});
