import React, { memo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { EQUIPMENT, type Room } from '../types';
import { colors, styles } from './ui';
export const roomImages: Record<string, ReturnType<typeof require>> = {
  study: require('../../assets/room-study.jpg'),
  computer: require('../../assets/room-computer.jpg'),
  classroom: require('../../assets/room-classroom.jpg'),
};
export const RoomCard = memo(function RoomCard({
  room,
  onOpen,
}: {
  room: Room;
  onOpen: (id: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem ${room.name}`}
      onPress={() => onOpen(room.id)}
      style={[
        styles.card,
        { padding: 0, overflow: 'hidden', marginBottom: 16 },
      ]}
    >
      <Image
        source={roomImages[room.imageKey]}
        style={{ width: '100%', height: 158 }}
        resizeMode="cover"
        accessibilityLabel="Ảnh minh họa không gian học tập"
      />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={styles.heading}>{room.name}</Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: room.occupiedNow ? '#A65624' : colors.primary,
              backgroundColor: room.occupiedNow ? '#FFF1E2' : colors.pale,
              padding: 7,
              borderRadius: 7,
            }}
          >
            {room.occupiedNow ? 'Occupied' : 'Available Now'}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          Tòa {room.building} · Tầng {room.floor} · {room.capacity} chỗ
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}
        >
          {room.equipment.map((e) => EQUIPMENT[e]).join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
});
