import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { canCheckIn, dayLabel, qrPayload, timeLabel } from '../domain';
import type { Booking } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { Button, colors, styles } from './ui';
export function BookingModal({
  booking: b,
  onClose,
  onCheckIn,
}: {
  booking: Booking | null;
  onClose: () => void;
  onCheckIn: (b: Booking) => void;
}) {
  const busy = useBookingStore((s) => s.busy);
  const offset = useBookingStore((s) => s.offset);
  if (!b) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: '#10251FCC',
          padding: 22,
        }}
      >
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={[
            styles.card,
            { alignItems: 'center', gap: 18 },
          ]}
        >
          <Text style={styles.heading}>
            {b.status === 'CANCELLED'
              ? 'Lịch đã hủy'
              : b.status === 'CHECKED_IN'
                ? 'Đã check-in'
                : 'Mã nhận phòng'}
          </Text>
          <Text style={styles.subtitle}>
            {b.roomName} · {dayLabel(b.date)}
          </Text>
          <Text style={styles.subtitle}>
            {timeLabel(b.startsAt)}–{timeLabel(b.endsAt)} · {b.partySize} người
          </Text>
          {b.status !== 'CANCELLED' && (
            <View style={{ padding: 15, backgroundColor: colors.white }}>
              <QRCode value={qrPayload(b)} size={200} />
            </View>
          )}
          <Text
            selectable
            style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}
          >
            {b.code}
          </Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            Check-in từ 15 phút trước giờ bắt đầu. Mã này thuộc phiên demo đang
            dùng.
          </Text>
          {b.status === 'CONFIRMED' && (
            <Button
              title="Check-in bằng mã này"
              onPress={() => onCheckIn(b)}
              disabled={!canCheckIn(b, Date.now() + offset)}
              busy={busy}
            />
          )}
          <Button title="Đóng" secondary onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
