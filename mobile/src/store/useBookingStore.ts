import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_FILTERS, normalizeApi } from '../domain';
import { request } from '../services/api';
import { reconcileReminders } from '../services/reminders';
import type {
  Booking,
  BookingInput,
  Filters,
  Room,
  Slot,
  User,
} from '../types';
let mutationRevision = 0;
interface State {
  user: User | null;
  token: string | null;
  apiUrl: string;
  filters: Filters;
  rooms: Room[];
  bookings: Booking[];
  hydrated: boolean;
  online: boolean;
  busy: boolean;
  revision: number;
  offset: number;
  lastUpdated: string | null;
  error: string | null;
  notice: string | null;
  setHydrated: () => void;
  setFilters: (f: Partial<Filters>) => void;
  setApi: (url: string) => Promise<void>;
  signIn: (name: string, student: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  getSlots: (roomId: number, date: string) => Promise<Slot[]>;
  book: (input: BookingInput) => Promise<Booking>;
  cancel: (id: string) => Promise<void>;
  checkIn: (b: Booking) => Promise<void>;
  updateReminders: () => Promise<void>;
}
export const useBookingStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
      filters: { ...DEFAULT_FILTERS },
      rooms: [],
      bookings: [],
      hydrated: false,
      online: false,
      busy: false,
      revision: 0,
      offset: 0,
      lastUpdated: null,
      error: null,
      notice: null,
      setHydrated: () => set({ hydrated: true }),
      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      setApi: async (value) => {
        if (get().busy) throw new Error('Đợi thao tác hiện tại hoàn tất.');
        const url = normalizeApi(value);
        if (url === get().apiUrl) return;
        set({ busy: true });
        mutationRevision++;
        try {
          await request(url, '/health', null);
          const { token, user } = get();
          let retained: Booking[] | null = null;
          if (token && user) {
            try {
              retained = await request<Booking[]>(url, '/bookings', token);
            } catch (e) {
              if (!(e instanceof Error && 'status' in e && e.status === 401))
                throw e;
            }
          }
          if (retained !== null)
            set({ apiUrl: url, bookings: retained, error: null });
          else {
            await reconcileReminders([], 'reset');
            set({
              apiUrl: url,
              user: null,
              token: null,
              rooms: [],
              bookings: [],
              lastUpdated: null,
              online: false,
              error: null,
            });
          }
        } finally {
          set({ busy: false });
        }
        await get().refresh();
      },
      signIn: async (fullName, studentId) => {
        if (!fullName.trim() || !/^[A-Za-z0-9_-]{3,30}$/.test(studentId.trim()))
          throw new Error('Nhập họ tên và MSSV từ 3–30 ký tự chữ/số.');
        if (get().busy) throw new Error('Đợi thao tác hiện tại hoàn tất.');
        set({ busy: true });
        try {
          const r = await request<{ user: User; token: string }>(
            get().apiUrl,
            '/sessions',
            null,
            { fullName: fullName.trim(), studentId: studentId.trim() },
          );
          mutationRevision++;
          set({ user: r.user, token: r.token, bookings: [], error: null });
        } finally {
          set({ busy: false });
        }
        await get().refresh();
      },
      signOut: async () => {
        if (get().busy) throw new Error('Đợi thao tác hiện tại hoàn tất.');
        await reconcileReminders([], 'reset');
        mutationRevision++;
        set({ user: null, token: null, bookings: [], notice: null });
      },
      refresh: async () => {
        const { apiUrl, token } = get();
        const revision = mutationRevision;
        if (!apiUrl) return;
        try {
          const [rooms, health, bookings] = await Promise.all([
            request<Room[]>(apiUrl, '/rooms', null),
            request<{ serverTime: string }>(apiUrl, '/health', null),
            token
              ? request<Booking[]>(apiUrl, '/bookings', token)
              : Promise.resolve([]),
          ]);
          if (get().apiUrl !== apiUrl || get().token !== token) return;
          if (mutationRevision !== revision) {
            await get().refresh();
            return;
          }
          set((s) => ({
            rooms,
            bookings,
            online: true,
            error: null,
            lastUpdated: new Date().toISOString(),
            offset: Date.parse(health.serverTime) - Date.now(),
            revision: s.revision + 1,
          }));
          await get().updateReminders();
        } catch (e) {
          if (get().apiUrl === apiUrl && get().token === token)
            set({
              online: false,
              error: e instanceof Error ? e.message : 'Không tải được dữ liệu.',
            });
        }
      },
      getSlots: (roomId, date) =>
        request(get().apiUrl, `/rooms/${roomId}/slots?date=${date}`, null),
      book: async (input) => {
        if (!get().token)
          throw new Error('Tạo phiên người dùng trước khi đặt phòng.');
        if (get().busy) throw new Error('Đợi thao tác hiện tại hoàn tất.');
        set({ busy: true });
        try {
          const b = await request<Booking>(
            get().apiUrl,
            '/bookings',
            get().token,
            input,
          );
          mutationRevision++;
          set((s) => ({
            bookings: [b, ...s.bookings.filter((x) => x.id !== b.id)],
            revision: s.revision + 1,
          }));
          await get().updateReminders();
          return b;
        } finally {
          set({ busy: false });
        }
      },
      cancel: async (id) => {
        if (get().busy) throw new Error('Đợi thao tác hiện tại hoàn tất.');
        set({ busy: true });
        try {
          const b = await request<Booking>(
            get().apiUrl,
            `/bookings/${id}/cancel`,
            get().token,
            {},
          );
          mutationRevision++;
          set((s) => ({
            bookings: s.bookings.map((x) => (x.id === id ? b : x)),
            revision: s.revision + 1,
          }));
          await get().updateReminders();
        } finally {
          set({ busy: false });
        }
        await get().refresh();
      },
      checkIn: async (b) => {
        if (get().busy) throw new Error('Đợi thao tác hiện tại hoàn tất.');
        set({ busy: true });
        try {
          const r = await request<Booking>(
            get().apiUrl,
            `/bookings/${b.id}/check-in`,
            get().token,
            { code: b.code },
          );
          mutationRevision++;
          set((s) => ({
            bookings: s.bookings.map((x) => (x.id === r.id ? r : x)),
            revision: s.revision + 1,
          }));
          await get().updateReminders();
        } finally {
          set({ busy: false });
        }
        await get().refresh();
      },
      updateReminders: async () => {
        const { bookings, user, offset } = get();
        try {
          set({
            notice: await reconcileReminders(
              bookings,
              user?.id || 'anonymous',
              offset,
            ),
          });
        } catch {
          set({
            notice:
              'Lịch đã lưu, nhưng chưa lập được thông báo. Kiểm tra quyền trong Cài đặt.',
          });
        }
      },
    }),
    {
      name: 'vku-booking-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        apiUrl: s.apiUrl,
        filters: s.filters,
        rooms: s.rooms,
        bookings: s.bookings,
        lastUpdated: s.lastUpdated,
      }),
      onRehydrateStorage: () => (s, error) => {
        if (s) s.setHydrated();
        else if (error)
          setTimeout(
            () =>
              useBookingStore.setState({
                hydrated: true,
                error:
                  'Không đọc được dữ liệu local. Kiểm tra quyền lưu trữ hoặc tạo lại phiên.',
              }),
            0,
          );
      },
    },
  ),
);
