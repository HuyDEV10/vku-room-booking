import React, { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStack } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { prepareNotifications, testNotification } from '../services/reminders';
import { Button, Field, Screen, showError, styles } from '../components/ui';
export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const api = useBookingStore((s) => s.apiUrl);
  const user = useBookingStore((s) => s.user);
  const busy = useBookingStore((s) => s.busy);
  const online = useBookingStore((s) => s.online);
  const notice = useBookingStore((s) => s.notice);
  const last = useBookingStore((s) => s.lastUpdated);
  const [value, setValue] = useState(api);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => setValue(api), [api]);
  async function act(fn: () => Promise<void>) {
    setWorking(true);
    try {
      await fn();
    } catch (e) {
      setMessage(showError(e));
    } finally {
      setWorking(false);
    }
  }
  function change() {
    const save = () =>
      void act(async () => {
        await useBookingStore.getState().setApi(value);
        setMessage(
          'Đã kiểm tra và lưu API. Phiên được giữ nếu máy chủ vẫn nhận token; nếu là máy chủ khác, cần tạo phiên mới.',
        );
      });
    if (user && value.replace(/\/$/, '') !== api) {
      if (Platform.OS === 'web') {
        if (
          window.confirm(
            'Đổi API: nếu máy chủ mới không nhận phiên, cache/phiên sẽ được xóa trên thiết bị. Lịch cũ không bị hủy. Tiếp tục?',
          )
        )
          save();
      } else
        Alert.alert(
          'Đổi máy chủ',
          'Nếu máy chủ mới không nhận phiên, cache/phiên sẽ được xóa. Lịch cũ không bị hủy. URL tunnel mới của cùng backend giữ phiên.',
          [
            { text: 'Quay lại', style: 'cancel' },
            { text: 'Đổi API', onPress: save },
          ],
        );
    } else save();
  }
  return (
    <Screen>
      <Text style={styles.title}>Cài đặt</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Máy chủ đặt phòng</Text>
        <Field
          label="URL gốc API"
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="https://...trycloudflare.com"
        />
        <Text style={styles.subtitle}>
          Nhập URL HTTPS của backend bạn quản lý. Không thêm /api/health. Điện
          thoại không dùng localhost của laptop.
        </Text>
        <Button
          title="Lưu địa chỉ API"
          disabled={busy || working}
          onPress={change}
        />
        <Button
          title="Kiểm tra kết nối"
          secondary
          disabled={busy || working}
          onPress={() =>
            void act(async () => {
              await useBookingStore.getState().refresh();
              setMessage(
                useBookingStore.getState().online
                  ? 'Kết nối PostgreSQL và API thành công.'
                  : useBookingStore.getState().error,
              );
            })
          }
        />
        <Text style={styles.subtitle}>
          {online ? 'Máy chủ đang kết nối' : 'Chưa xác nhận kết nối'}
          {last
            ? ` · cập nhật ${new Date(last).toLocaleTimeString('vi-VN')}`
            : ''}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Phiên người dùng</Text>
        <Text style={styles.subtitle}>
          {user
            ? `${user.fullName} · ${user.studentId}`
            : 'Chưa tạo phiên demo.'}
        </Text>
        {user ? (
          <>
            <Text style={styles.subtitle}>
              Thoát phiên không hủy lịch trên máy chủ. Hủy lịch không dùng trước
              khi thoát; phiên mới không khôi phục lịch cũ.
            </Text>
            <Button
              title="Thoát phiên trên thiết bị"
              secondary
              disabled={busy || working}
              onPress={() =>
                void act(async () => {
                  await useBookingStore.getState().signOut();
                  setMessage('Đã thoát phiên trên thiết bị.');
                })
              }
            />
          </>
        ) : (
          <Button
            title="Tạo phiên demo"
            onPress={() => nav.navigate('Session')}
          />
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Nhắc lịch trước 15 phút</Text>
        <Text style={styles.subtitle}>
          {notice || 'Cấp quyền để nhận lời nhắc trên thiết bị đặt phòng.'}
        </Text>
        <Button
          title="Cấp quyền & cập nhật nhắc lịch"
          secondary
          disabled={busy || working || Platform.OS === 'web'}
          onPress={() =>
            void act(async () => {
              const granted = await prepareNotifications();
              await useBookingStore.getState().updateReminders();
              setMessage(
                granted
                  ? 'Đã kiểm tra quyền và lịch nhắc.'
                  : 'Chưa được cấp quyền thông báo.',
              );
            })
          }
        />
        <Button
          title="Thử thông báo sau 10 giây"
          secondary
          disabled={busy || working || Platform.OS === 'web'}
          onPress={() =>
            void act(async () => {
              await testNotification();
              setMessage(
                'Đã lập thông báo thử. Đưa ứng dụng về nền để kiểm tra.',
              );
            })
          }
        />
      </View>
      {message && (
        <Text accessibilityRole="alert" style={styles.subtitle}>
          {message}
        </Text>
      )}
      <Text style={styles.subtitle}>
        VKU Room Booking · Mini-Project 2{'\n'}Dữ liệu phòng và ảnh minh họa
        dùng cho bài lab.
      </Text>
    </Screen>
  );
}
