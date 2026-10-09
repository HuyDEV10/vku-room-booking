import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useBookingStore } from '../store/useBookingStore';
export function useRealtime() {
  const url = useBookingStore((s) => s.apiUrl);
  const hydrated = useBookingStore((s) => s.hydrated);
  const token = useBookingStore((s) => s.token);
  useEffect(() => {
    if (!hydrated || !url) return;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let foreground = AppState.currentState !== 'background';
    let updating = false;
    let again = false;
    async function refresh() {
      if (stopped || !foreground) return;
      if (updating) {
        again = true;
        return;
      }
      updating = true;
      do {
        again = false;
        await useBookingStore.getState().refresh();
      } while (again && !stopped && foreground);
      updating = false;
    }
    function connect() {
      if (stopped || !foreground) return;
      socket = new WebSocket(`${url.replace(/^http/, 'ws')}/ws/rooms`);
      socket.onopen = () => void refresh();
      socket.onmessage = (e) => {
        try {
          if (JSON.parse(e.data).type === 'ROOM_CHANGED') void refresh();
        } catch {}
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (!stopped && foreground) retry = setTimeout(connect, 3000);
      };
    }
    void refresh();
    connect();
    const interval = setInterval(() => void refresh(), 30000);
    const subscription = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      if (retry) clearTimeout(retry);
      if (!foreground) socket?.close();
      else {
        void refresh();
        if (!socket || socket.readyState > 1) connect();
      }
    });
    return () => {
      stopped = true;
      clearInterval(interval);
      if (retry) clearTimeout(retry);
      subscription.remove();
      socket?.close();
    };
  }, [url, hydrated, token]);
}
