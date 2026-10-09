import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useBookingStore } from './src/store/useBookingStore';
import { useRealtime } from './src/hooks/useRealtime';
import type { RootStack } from './src/types';
import { colors } from './src/components/ui';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { BookingsScreen } from './src/screens/BookingsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SessionScreen } from './src/screens/SessionScreen';

const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator();
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.white,
    text: colors.ink,
    border: colors.line,
  },
};
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 70, paddingBottom: 10, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerTitleStyle: { color: colors.ink },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Khám phá',
          headerTitle: 'VKU · Đặt phòng học',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>⌂</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          title: 'Lịch của tôi',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>▦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>⚙</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
export default function App() {
  const hydrated = useBookingStore((s) => s.hydrated);
  useRealtime();
  if (!hydrated)
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text>Đang khôi phục dữ liệu trên thiết bị…</Text>
        </View>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={theme}>
        <Stack.Navigator>
          <Stack.Screen
            name="Tabs"
            component={Tabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Room"
            component={RoomScreen}
            options={{ title: 'Chọn lịch đặt phòng' }}
          />
          <Stack.Screen
            name="Session"
            component={SessionScreen}
            options={{ title: 'Thông tin người dùng' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
