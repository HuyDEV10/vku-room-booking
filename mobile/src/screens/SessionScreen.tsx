import React, { useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStack } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { Button, Field, Screen, showError, styles } from '../components/ui';
export function SessionScreen({
  navigation,
}: NativeStackScreenProps<RootStack, 'Session'>) {
  const [name, setName] = useState('');
  const [student, setStudent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = useBookingStore((s) => s.busy);
  async function submit() {
    try {
      await useBookingStore.getState().signIn(name, student);
      navigation.goBack();
    } catch (e) {
      setError(showError(e));
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Bắt đầu đặt phòng</Text>
      <Text style={styles.subtitle}>
        Nhập thông tin để tạo phiên demo. Đây không phải tài khoản đăng nhập của
        trường; lịch được gắn với phiên trên thiết bị này.
      </Text>
      <Field
        label="Họ và tên"
        value={name}
        onChangeText={setName}
        maxLength={100}
        autoCapitalize="words"
      />
      <Field
        label="Mã sinh viên"
        value={student}
        onChangeText={setStudent}
        maxLength={30}
        autoCapitalize="characters"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        title="Tạo phiên demo"
        busy={busy}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
