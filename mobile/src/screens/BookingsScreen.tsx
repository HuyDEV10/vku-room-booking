import React, { useState } from 'react';
import { Alert, FlatList, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dayLabel, timeLabel } from '../domain';
import type { Booking, RootStack } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { Button, showError, styles } from '../components/ui';
import { BookingModal } from '../components/BookingModal';
export function BookingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const bookings = useBookingStore((s) => s.bookings);
  const user = useBookingStore((s) => s.user);
  const busy = useBookingStore((s) => s.busy);
  const offset = useBookingStore((s) => s.offset);
  const online = useBookingStore((s) => s.online);
  const [opened, setOpened] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const selected = bookings.find((b) => b.id === opened) || null;
  async function action(fn: () => Promise<void>) {
    try {
      setError(null);
      await fn();
    } catch (e) {
      setError(showError(e));
    }
  }
  function cancel(b: Booking) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Hủy lịch ${b.roomName}?`))
        void action(() => useBookingStore.getState().cancel(b.id));
    } else
      Alert.alert(
        'Hủy đặt phòng',
        `${b.roomName} · ${dayLabel(b.date)}. Khung giờ sẽ được giải phóng.`,
        [
          { text: 'Giữ lịch', style: 'cancel' },
          {
            text: 'Hủy lịch',
            style: 'destructive',
            onPress: () =>
              void action(() => useBookingStore.getState().cancel(b.id)),
          },
        ],
      );
  }
  async function refresh() {
    setRefreshing(true);
    await useBookingStore.getState().refresh();
    setRefreshing(false);
  }
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 10 }}>
            <Text style={styles.title}>Lịch của tôi</Text>
            <Text style={styles.subtitle}>
              {user
                ? `${user.fullName} · ${user.studentId}`
                : 'Tạo phiên demo để giữ chỗ và xem lịch của bạn.'}
            </Text>
            {!online && (
              <Text style={styles.subtitle}>
                Dữ liệu local chưa cập nhật. Đặt, hủy và check-in cần kết nối
                API.
              </Text>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        renderItem={({ item: b }) => (
          <View style={[styles.card, { marginBottom: 14 }]}>
            <Text style={styles.heading}>{b.roomName}</Text>
            <Text style={styles.subtitle}>
              {dayLabel(b.date)} · {timeLabel(b.startsAt)}–{timeLabel(b.endsAt)}
            </Text>
            <Text style={styles.subtitle}>
              {b.partySize} người ·{' '}
              {b.status === 'CANCELLED'
                ? 'Đã hủy'
                : b.status === 'CHECKED_IN'
                  ? 'Đã check-in'
                  : Date.parse(b.endsAt) <= Date.now() + offset
                    ? 'Đã kết thúc'
                    : 'Đã xác nhận'}
            </Text>
            <Text selectable style={styles.label}>
              {b.code}
            </Text>
            <Button
              title={b.status === 'CANCELLED' ? 'Xem thông tin' : 'Xem mã QR'}
              secondary
              onPress={() => setOpened(b.id)}
            />
            {b.status === 'CONFIRMED' &&
              Date.parse(b.startsAt) > Date.now() + offset && (
                <Button
                  title="Hủy lịch"
                  secondary
                  disabled={busy}
                  onPress={() => cancel(b)}
                />
              )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.subtitle}>
              Chưa có lịch đặt phòng trong phiên này.
            </Text>
            {!user && (
              <Button
                title="Tạo phiên demo"
                onPress={() => nav.navigate('Session')}
              />
            )}
          </View>
        }
      />
      <BookingModal
        booking={selected}
        onClose={() => setOpened(null)}
        onCheckIn={(b) =>
          void action(() => useBookingStore.getState().checkIn(b))
        }
      />
    </SafeAreaView>
  );
}
