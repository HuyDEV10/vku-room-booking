import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { dayLabel, nextDays } from '../domain';
import { EQUIPMENT, type Booking, type RootStack, type Slot } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { ApiError } from '../services/api';
import { prepareNotifications } from '../services/reminders';
import {
  Button,
  Chip,
  Field,
  Screen,
  showError,
  styles,
} from '../components/ui';
import { roomImages } from '../components/RoomCard';
import { BookingModal } from '../components/BookingModal';
export function RoomScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStack, 'Room'>) {
  const room = useBookingStore((s) =>
    s.rooms.find((r) => r.id === route.params.roomId),
  );
  const revision = useBookingStore((s) => s.revision);
  const user = useBookingStore((s) => s.user);
  const busy = useBookingStore((s) => s.busy);
  const offset = useBookingStore((s) => s.offset);
  const notice = useBookingStore((s) => s.notice);
  const [date, setDate] = useState(nextDays(Date.now() + offset)[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [people, setPeople] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Booking | null>(null);
  const [reload, setReload] = useState(0);
  const pending = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSlots([]);
    useBookingStore
      .getState()
      .getSlots(route.params.roomId, date)
      .then((items) => {
        if (active) {
          setSlots(items);
          setSelected((current) =>
            items.some((s) => s.index === current && !s.booked && !s.past)
              ? current
              : null,
          );
        }
      })
      .catch((e) => {
        if (active) setError(showError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [route.params.roomId, date, revision, reload]);
  async function book() {
    if (selected === null || !room) return;
    const size = Number(people);
    if (!/^\d+$/.test(people) || size < 2 || size > room.capacity) {
      setError(`Nhập số người từ 2 đến ${room.capacity}.`);
      return;
    }
    const key = `${room.id}/${date}/${selected}/${size}`;
    if (pending.current?.key !== key)
      pending.current = { key, id: Crypto.randomUUID() };
    try {
      await prepareNotifications().catch(() => false);
      const b = await useBookingStore
        .getState()
        .book({
          id: pending.current.id,
          roomId: room.id,
          date,
          slot: selected,
          partySize: size,
        });
      pending.current = null;
      setReceipt(b);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) pending.current = null;
      setError(showError(e));
      setReload((x) => x + 1);
    }
  }
  async function checkIn(b: Booking) {
    try {
      await useBookingStore.getState().checkIn(b);
      setReceipt(
        useBookingStore.getState().bookings.find((x) => x.id === b.id) || null,
      );
    } catch (e) {
      setError(showError(e));
      setReceipt(null);
    }
  }
  if (!room)
    return (
      <Screen>
        <Text style={styles.subtitle}>
          Phòng chưa có trong dữ liệu hiện tại. Quay lại danh sách và tải lại.
        </Text>
      </Screen>
    );
  return (
    <Screen>
      <Image
        source={roomImages[room.imageKey]}
        style={{ width: '100%', height: 200, borderRadius: 18 }}
      />
      <Text style={styles.title}>{room.name}</Text>
      <Text style={styles.subtitle}>
        Tòa {room.building} · Tầng {room.floor} · {room.capacity} chỗ
      </Text>
      <Text style={styles.subtitle}>
        {room.equipment.map((e) => EQUIPMENT[e]).join(' · ')}
      </Text>
      <Text style={styles.heading}>Chọn ngày</Text>
      <View style={styles.row}>
        {nextDays(Date.now() + offset).map((day) => (
          <Chip
            key={day}
            label={dayLabel(day)}
            selected={day === date}
            disabled={busy}
            onPress={() => {
              setDate(day);
              setSelected(null);
            }}
          />
        ))}
      </View>
      <Text style={styles.heading}>Khung giờ · 2 tiếng</Text>
      {loading && (
        <Text style={styles.subtitle}>Đang kiểm tra lịch phòng…</Text>
      )}
      <View style={styles.row}>
        {slots.map((slot) => (
          <Chip
            key={slot.index}
            label={`${slot.label}${slot.booked ? ' · Đã đặt' : slot.past ? ' · Đã qua' : ''}`}
            selected={selected === slot.index}
            disabled={slot.booked || slot.past || busy}
            onPress={() => setSelected(slot.index)}
          />
        ))}
      </View>
      <Field
        label="Số người tham gia"
        value={people}
        onChangeText={setPeople}
        keyboardType="number-pad"
        maxLength={2}
        editable={!busy}
      />
      <Text style={styles.subtitle}>
        Giờ Việt Nam (UTC+7). Chỉ xác nhận khi máy chủ lưu thành công; khung có
        thể được người khác đặt trong lúc bạn chọn.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {notice && <Text style={styles.subtitle}>{notice}</Text>}
      {user ? (
        <Button
          title="Xác nhận đặt phòng"
          busy={busy}
          disabled={selected === null || loading}
          onPress={() => void book()}
        />
      ) : (
        <Button
          title="Tạo phiên để đặt phòng"
          onPress={() => navigation.navigate('Session')}
        />
      )}
      <Button
        title="Kiểm tra lại khung giờ"
        secondary
        disabled={busy || loading}
        onPress={() => setReload((x) => x + 1)}
      />
      <Button
        title="Về danh sách phòng"
        secondary
        onPress={() => navigation.goBack()}
      />
      <BookingModal
        booking={receipt}
        onClose={() => setReceipt(null)}
        onCheckIn={(b) => void checkIn(b)}
      />
    </Screen>
  );
}
