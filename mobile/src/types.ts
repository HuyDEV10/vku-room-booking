export type Equipment =
  'PROJECTOR' | 'WHITEBOARD' | 'COMPUTER' | 'AIR_CONDITIONER';
export interface User {
  id: string;
  fullName: string;
  studentId: string;
}
export interface Room {
  id: number;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  equipment: Equipment[];
  imageKey: string;
  occupiedNow: boolean;
}
export interface Slot {
  index: number;
  label: string;
  startsAt: string;
  endsAt: string;
  booked: boolean;
  past: boolean;
}
export interface Booking {
  id: string;
  roomId: number;
  roomName: string;
  date: string;
  slot: number;
  partySize: number;
  startsAt: string;
  endsAt: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED';
  code: string;
}
export interface BookingInput {
  id: string;
  roomId: number;
  date: string;
  slot: number;
  partySize: number;
}
export interface Filters {
  query: string;
  building: string;
  capacity: number;
  equipment: Equipment[];
}
export type RootStack = {
  Tabs: undefined;
  Room: { roomId: number };
  Session: undefined;
};
export const EQUIPMENT: Record<Equipment, string> = {
  PROJECTOR: 'Máy chiếu',
  WHITEBOARD: 'Bảng trắng',
  COMPUTER: 'Máy tính cấu hình cao',
  AIR_CONDITIONER: 'Điều hòa',
};
