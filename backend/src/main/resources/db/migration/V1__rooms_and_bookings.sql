CREATE TABLE rooms (
  id INTEGER PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  building VARCHAR(1) NOT NULL CHECK (building IN ('A','B','C','V')),
  floor INTEGER NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 2 AND 20),
  equipment TEXT[] NOT NULL,
  image_key VARCHAR(20) NOT NULL
);
CREATE TABLE demo_sessions (
  id UUID PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  student_id VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES demo_sessions(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  booking_date DATE NOT NULL,
  slot INTEGER NOT NULL CHECK (slot BETWEEN 0 AND 3),
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 2 AND 20),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CHECKED_IN','CANCELLED')),
  code VARCHAR(24) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE UNIQUE INDEX bookings_active_slot ON bookings(room_id, booking_date, slot)
WHERE status IN ('CONFIRMED','CHECKED_IN');
CREATE INDEX bookings_session_date ON bookings(session_id, starts_at);
INSERT INTO rooms VALUES
(1,'Phòng A101','A',1,6,ARRAY['PROJECTOR','WHITEBOARD','AIR_CONDITIONER'],'study'),
(2,'Phòng A202','A',2,12,ARRAY['PROJECTOR','WHITEBOARD','COMPUTER','AIR_CONDITIONER'],'computer'),
(3,'Phòng A303','A',3,20,ARRAY['PROJECTOR','WHITEBOARD','AIR_CONDITIONER'],'classroom'),
(4,'Phòng B101','B',1,4,ARRAY['WHITEBOARD','AIR_CONDITIONER'],'study'),
(5,'Phòng B202','B',2,10,ARRAY['PROJECTOR','COMPUTER','AIR_CONDITIONER'],'computer'),
(6,'Phòng B301','B',3,16,ARRAY['PROJECTOR','WHITEBOARD'],'classroom'),
(7,'Phòng C102','C',1,2,ARRAY['WHITEBOARD'],'study'),
(8,'Phòng C203','C',2,8,ARRAY['PROJECTOR','WHITEBOARD','AIR_CONDITIONER'],'study'),
(9,'Phòng C302','C',3,20,ARRAY['COMPUTER','PROJECTOR','AIR_CONDITIONER'],'computer'),
(10,'Phòng V101','V',1,6,ARRAY['WHITEBOARD','AIR_CONDITIONER'],'study'),
(11,'Phòng V202','V',2,12,ARRAY['PROJECTOR','WHITEBOARD','COMPUTER','AIR_CONDITIONER'],'computer'),
(12,'Phòng V301','V',3,18,ARRAY['PROJECTOR','WHITEBOARD','AIR_CONDITIONER'],'classroom');
