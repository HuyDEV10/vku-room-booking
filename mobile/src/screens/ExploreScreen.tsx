import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DEFAULT_FILTERS, filterRooms } from '../domain';
import { EQUIPMENT, type Equipment, type Room, type RootStack } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { Button, Chip, Field, styles } from '../components/ui';
import { RoomCard } from '../components/RoomCard';
export function ExploreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStack>>();
  const rooms = useBookingStore((s) => s.rooms);
  const filters = useBookingStore((s) => s.filters);
  const setFilters = useBookingStore((s) => s.setFilters);
  const online = useBookingStore((s) => s.online);
  const error = useBookingStore((s) => s.error);
  const updated = useBookingStore((s) => s.lastUpdated);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const data = useMemo(() => filterRooms(rooms, filters), [rooms, filters]);
  const open = useCallback(
    (roomId: number) => nav.navigate('Room', { roomId }),
    [nav],
  );
  const render = useCallback(
    ({ item }: { item: Room }) => <RoomCard room={item} onOpen={open} />,
    [open],
  );
  async function refresh() {
    setRefreshing(true);
    try {
      await useBookingStore.getState().refresh();
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={data}
        renderItem={render}
        keyExtractor={(r) => String(r.id)}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 8 }}>
            <Text style={styles.title}>Tìm chỗ học phù hợp</Text>
            <Text style={styles.subtitle}>
              Chọn phòng, giữ chỗ và nhận nhắc lịch trước buổi học.
            </Text>
            <Text style={styles.subtitle}>
              {online
                ? 'Đã kết nối máy chủ'
                : updated
                  ? 'Dữ liệu đã lưu · chưa cập nhật'
                  : 'Chưa kết nối · cấu hình API trong Cài đặt'}
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <Field
              label="Tìm phòng"
              placeholder="Ví dụ: A202"
              value={filters.query}
              onChangeText={(query) => setFilters({ query })}
            />
            <View style={styles.row}>
              {['', 'A', 'B', 'C', 'V'].map((building) => (
                <Chip
                  key={building}
                  label={building ? `Tòa ${building}` : 'Tất cả'}
                  selected={filters.building === building}
                  onPress={() => setFilters({ building })}
                />
              ))}
            </View>
            <Button
              title={expanded ? 'Thu gọn bộ lọc' : 'Sức chứa & thiết bị'}
              secondary
              onPress={() => setExpanded(!expanded)}
            />
            {expanded && (
              <View style={styles.card}>
                <Text style={styles.label}>
                  Số chỗ tối thiểu: {filters.capacity}
                </Text>
                <View style={styles.row}>
                  <Button
                    title="−"
                    secondary
                    disabled={filters.capacity <= 2}
                    onPress={() =>
                      setFilters({ capacity: filters.capacity - 1 })
                    }
                  />
                  <Button
                    title="+"
                    secondary
                    disabled={filters.capacity >= 20}
                    onPress={() =>
                      setFilters({ capacity: filters.capacity + 1 })
                    }
                  />
                </View>
                <View style={styles.row}>
                  {(Object.keys(EQUIPMENT) as Equipment[]).map((e) => (
                    <Chip
                      key={e}
                      label={EQUIPMENT[e]}
                      selected={filters.equipment.includes(e)}
                      onPress={() =>
                        setFilters({
                          equipment: filters.equipment.includes(e)
                            ? filters.equipment.filter((x) => x !== e)
                            : [...filters.equipment, e],
                        })
                      }
                    />
                  ))}
                </View>
                <Button
                  title="Xóa bộ lọc"
                  secondary
                  onPress={() => setFilters({ ...DEFAULT_FILTERS })}
                />
              </View>
            )}
            <Text style={styles.heading}>{data.length} phòng phù hợp</Text>
            <Text style={[styles.subtitle, { fontSize: 12 }]}>
              Danh mục và ảnh minh họa phục vụ bài lab. Trạng thái hiện tại dựa
              trên lịch đặt trên máy chủ.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.subtitle}>
              {rooms.length
                ? 'Không có phòng khớp bộ lọc.'
                : 'Chưa có danh sách phòng. Kiểm tra API và tải lại.'}
            </Text>
            <Button title="Tải lại" secondary onPress={() => void refresh()} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
