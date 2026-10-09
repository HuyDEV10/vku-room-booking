import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.WEB_URL || 'http://localhost:8082';
const api = process.env.API_URL || 'http://localhost:8081';
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const screenshotDir = path.resolve('../docs/screenshots');
await mkdir(screenshotDir, { recursive: true });
const tomorrow = new Date(Date.now() + 86400000);
const date = tomorrow.toLocaleDateString('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
});
const dateLabel = tomorrow.toLocaleDateString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});
const errors = [];
const contexts = [];
async function configure() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByText('Tìm chỗ học phù hợp', { exact: true }).waitFor();
  await page.getByRole('tab', { name: /Cài đặt/ }).click();
  await page.getByLabel('URL gốc API', { exact: true }).fill(api);
  await page
    .getByRole('button', { name: 'Lưu địa chỉ API', exact: true })
    .click();
  await page.getByText('Máy chủ đang kết nối', { exact: false }).waitFor();
  return { page, context };
}
try {
  const first = await configure();
  const p = first.page;
  await p.getByRole('button', { name: 'Tạo phiên demo', exact: true }).click();
  await p.getByLabel('Họ và tên', { exact: true }).fill('Sinh viên kiểm thử');
  await p.getByLabel('Mã sinh viên', { exact: true }).fill('23TEST01');
  await p.getByRole('button', { name: 'Tạo phiên demo', exact: true }).click();
  await p.getByText('Sinh viên kiểm thử · 23TEST01', { exact: true }).waitFor();
  await p.getByRole('tab', { name: /Khám phá/ }).click();
  await p.getByText('12 phòng phù hợp', { exact: true }).waitFor();
  await p.screenshot({ path: path.join(screenshotDir, '01-explore-web.png') });
  await p.getByRole('button', { name: 'Tòa A', exact: true }).click();
  await p.getByText('3 phòng phù hợp', { exact: true }).waitFor();
  await p.getByLabel('Tìm phòng', { exact: true }).fill('A101');
  await p.getByText('1 phòng phù hợp', { exact: true }).waitFor();
  await p.getByRole('button', { name: 'Xem Phòng A101', exact: true }).click();
  await p.getByRole('button', { name: dateLabel, exact: true }).click();
  await p.getByRole('button', { name: '07:30–09:30', exact: true }).waitFor();
  await p.screenshot({ path: path.join(screenshotDir, '02-slots-web.png') });
  const second = await configure();
  const q = second.page;
  await q.getByRole('tab', { name: /Khám phá/ }).click();
  await q.getByRole('button', { name: 'Xem Phòng A101', exact: true }).click();
  await q.getByRole('button', { name: dateLabel, exact: true }).click();
  await q.getByRole('button', { name: '07:30–09:30', exact: true }).waitFor();
  await p.getByRole('button', { name: '07:30–09:30', exact: true }).click();
  await p
    .getByRole('button', { name: 'Xác nhận đặt phòng', exact: true })
    .click();
  await p.getByText('Mã nhận phòng', { exact: true }).waitFor();
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(screenshotDir, '03-qr-web.png') });
  await q
    .getByRole('button', { name: '07:30–09:30 · Đã đặt', exact: true })
    .waitFor();
  assert.equal(
    await q
      .getByRole('button', { name: '07:30–09:30 · Đã đặt', exact: true })
      .isDisabled(),
    true,
  );
  await p.getByRole('button', { name: 'Đóng', exact: true }).click();
  await p
    .getByRole('button', { name: 'Về danh sách phòng', exact: true })
    .click();
  await p.getByRole('tab', { name: /Lịch của tôi/ }).click();
  await p.getByText('2 người · Đã xác nhận', { exact: true }).waitFor();
  await p.screenshot({ path: path.join(screenshotDir, '04-bookings-web.png') });
  const cached = await p.evaluate(() =>
    JSON.parse(localStorage.getItem('vku-booking-v1')),
  );
  assert.equal(cached.state.bookings.length, 1);
  assert.equal(cached.state.user.studentId, '23TEST01');
  const savedId = cached.state.bookings[0].id;
  await p.reload();
  await p.getByRole('tab', { name: /Lịch của tôi/ }).click();
  await p.getByText('2 người · Đã xác nhận', { exact: true }).waitFor();
  assert.equal(
    await p.evaluate(
      () =>
        JSON.parse(localStorage.getItem('vku-booking-v1')).state.bookings[0].id,
    ),
    savedId,
  );
  p.once('dialog', (dialog) => dialog.accept());
  await p.getByRole('button', { name: 'Hủy lịch', exact: true }).click();
  await p.getByText('2 người · Đã hủy', { exact: true }).waitFor();
  await q.getByRole('button', { name: '07:30–09:30', exact: true }).waitFor();
  assert.equal(
    await q
      .getByRole('button', { name: '07:30–09:30', exact: true })
      .isDisabled(),
    false,
  );
  await first.context.setOffline(true);
  await p.getByRole('tab', { name: /Cài đặt/ }).click();
  await p
    .getByRole('button', { name: 'Kiểm tra kết nối', exact: true })
    .click();
  await p.getByText('Chưa xác nhận kết nối', { exact: false }).waitFor();
  await p.getByRole('tab', { name: /Lịch của tôi/ }).click();
  await p.getByText('2 người · Đã hủy', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'E2E đạt: lọc, đặt thật, QR, WebSocket hai phiên, phục hồi phiên/lịch, hủy giải phóng khung và dữ liệu cache khi mất mạng.',
  );
} catch (e) {
  for (const context of contexts)
    for (const page of context.pages()) {
      console.log((await page.locator('body').innerText()).slice(0, 4500));
      await page
        .screenshot({ path: path.join(screenshotDir, 'debug-web.png') })
        .catch(() => {});
    }
  throw e;
} finally {
  await browser.close();
}
