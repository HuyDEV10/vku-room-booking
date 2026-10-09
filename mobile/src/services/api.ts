export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export async function request<T>(
  base: string,
  path: string,
  token: string | null,
  body?: unknown,
): Promise<T> {
  if (!base)
    throw new ApiError(
      'Chưa cấu hình API. Mở Cài đặt để nhập địa chỉ máy chủ.',
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(`${base}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new ApiError(
        data.message || `Máy chủ trả lỗi ${r.status}.`,
        r.status,
      );
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      'Không kết nối được API. Kiểm tra mạng, Spring Boot, tunnel và CORS. Yêu cầu đặt có thể đã được nhận; thử lại cùng lựa chọn để kiểm tra.',
    );
  } finally {
    clearTimeout(timer);
  }
}
