package vn.edu.vku.booking;

import static vn.edu.vku.booking.Models.*;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingService {

  public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final LocalTime[] START = {
    LocalTime.of(7, 30),
    LocalTime.of(9, 30),
    LocalTime.of(13, 0),
    LocalTime.of(15, 0),
  };
  private final JdbcTemplate db;
  private final Clock clock;
  private final ApplicationEventPublisher events;
  private final SecureRandom random = new SecureRandom();

  public BookingService(
    JdbcTemplate db,
    Clock clock,
    ApplicationEventPublisher events
  ) {
    this.db = db;
    this.clock = clock;
    this.events = events;
  }

  public Instant now() {
    return clock.instant();
  }

  private static ResponseStatusException fail(
    HttpStatus status,
    String message
  ) {
    return new ResponseStatusException(status, message);
  }

  private static String hash(String text) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(
          text.getBytes(StandardCharsets.UTF_8)
        )
      );
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  public SessionReceipt createSession(SessionRequest request) {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String token = Base64.getUrlEncoder()
      .withoutPadding()
      .encodeToString(bytes);
    UUID id = UUID.randomUUID();
    db.update(
      "INSERT INTO demo_sessions(id,token_hash,full_name,student_id) VALUES (?,?,?,?)",
      id,
      hash(token),
      request.fullName().trim(),
      request.studentId().trim()
    );
    return new SessionReceipt(
      new Session(id, request.fullName().trim(), request.studentId().trim()),
      token
    );
  }

  public UUID owner(String authorization) {
    if (
      authorization == null ||
      !authorization.startsWith("Bearer ") ||
      authorization.length() > 200
    ) throw fail(
      HttpStatus.UNAUTHORIZED,
      "Phiên demo không hợp lệ. Hãy tạo lại phiên."
    );
    var ids = db.query(
      "SELECT id FROM demo_sessions WHERE token_hash=?",
      (rs, n) -> rs.getObject(1, UUID.class),
      hash(authorization.substring(7))
    );
    if (ids.isEmpty()) throw fail(
      HttpStatus.UNAUTHORIZED,
      "Phiên demo không còn tồn tại trên máy chủ."
    );
    return ids.getFirst();
  }

  public List<Room> rooms() {
    return db.query(
      """
      SELECT r.*, EXISTS(SELECT 1 FROM bookings b WHERE b.room_id=r.id
      AND b.status IN ('CONFIRMED','CHECKED_IN') AND b.starts_at<=? AND b.ends_at>?) AS occupied
      FROM rooms r ORDER BY r.building,r.floor,r.id
      """,
      (rs, n) ->
        new Room(
          rs.getInt("id"),
          rs.getString("name"),
          rs.getString("building"),
          rs.getInt("floor"),
          rs.getInt("capacity"),
          Arrays.asList((String[]) rs.getArray("equipment").getArray()),
          rs.getString("image_key"),
          rs.getBoolean("occupied")
        ),
      Timestamp.from(now()),
      Timestamp.from(now())
    );
  }

  private Room room(int id) {
    return rooms()
      .stream()
      .filter(r -> r.id() == id)
      .findFirst()
      .orElseThrow(() -> fail(HttpStatus.NOT_FOUND, "Không tìm thấy phòng."));
  }

  private void dateRange(LocalDate date) {
    LocalDate today = LocalDate.ofInstant(now(), ZONE);
    if (date.isBefore(today) || date.isAfter(today.plusDays(6))) throw fail(
      HttpStatus.BAD_REQUEST,
      "Chỉ được đặt trong 7 ngày tính từ hôm nay."
    );
  }

  private Instant start(LocalDate date, int slot) {
    return date.atTime(START[slot]).atZone(ZONE).toInstant();
  }

  public List<Slot> slots(int roomId, LocalDate date) {
    room(roomId);
    dateRange(date);
    var occupied = db.query(
      "SELECT slot FROM bookings WHERE room_id=? AND booking_date=? AND status IN ('CONFIRMED','CHECKED_IN')",
      (rs, n) -> rs.getInt(1),
      roomId,
      date
    );
    var result = new ArrayList<Slot>();
    for (int i = 0; i < 4; i++) {
      Instant from = start(date, i);
      Instant to = from.plus(Duration.ofHours(2));
      result.add(
        new Slot(
          i,
          START[i] + "–" + START[i].plusHours(2),
          from,
          to,
          occupied.contains(i),
          !from.isAfter(now())
        )
      );
    }
    return result;
  }

  private Booking map(ResultSet rs, int row) throws SQLException {
    return new Booking(
      rs.getObject("id", UUID.class),
      rs.getInt("room_id"),
      rs.getString("room_name"),
      rs.getObject("booking_date", LocalDate.class),
      rs.getInt("slot"),
      rs.getInt("party_size"),
      rs.getTimestamp("starts_at").toInstant(),
      rs.getTimestamp("ends_at").toInstant(),
      rs.getString("status"),
      rs.getString("code")
    );
  }

  private static final String SELECT =
    "SELECT b.*,r.name AS room_name FROM bookings b JOIN rooms r ON r.id=b.room_id ";

  private Booking owned(UUID owner, UUID id) {
    var rows = db.query(
      SELECT + "WHERE b.session_id=? AND b.id=?",
      this::map,
      owner,
      id
    );
    if (rows.isEmpty()) throw fail(
      HttpStatus.NOT_FOUND,
      "Không tìm thấy đặt chỗ trong phiên này."
    );
    return rows.getFirst();
  }

  public List<Booking> mine(UUID owner) {
    return db.query(
      SELECT + "WHERE b.session_id=? ORDER BY b.starts_at DESC",
      this::map,
      owner
    );
  }

  @Transactional
  public Booking book(UUID owner, BookingRequest request) {
    var existing = db.query(SELECT + "WHERE b.id=?", this::map, request.id());
    if (!existing.isEmpty()) {
      Booking previous = owned(owner, request.id());
      if (
        previous.roomId() != request.roomId() ||
        !previous.date().equals(request.date()) ||
        previous.slot() != request.slot() ||
        previous.partySize() != request.partySize()
      ) throw fail(
        HttpStatus.CONFLICT,
        "Mã yêu cầu đã được dùng cho nội dung khác."
      );
      return previous;
    }
    dateRange(request.date());
    Room room = room(request.roomId());
    if (request.partySize() > room.capacity()) throw fail(
      HttpStatus.BAD_REQUEST,
      "Số người vượt sức chứa của phòng."
    );
    Instant from = start(request.date(), request.slot());
    if (!from.isAfter(now())) throw fail(
      HttpStatus.BAD_REQUEST,
      "Khung giờ đã bắt đầu hoặc đã qua."
    );
    String code =
      "VKU-" +
      UUID.randomUUID()
        .toString()
        .replace("-", "")
        .substring(0, 16)
        .toUpperCase(Locale.ROOT);
    int added = db.update(
      """
      INSERT INTO bookings(id,session_id,room_id,booking_date,slot,party_size,starts_at,ends_at,code)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING
      """,
      request.id(),
      owner,
      request.roomId(),
      request.date(),
      request.slot(),
      request.partySize(),
      Timestamp.from(from),
      Timestamp.from(from.plus(Duration.ofHours(2))),
      code
    );
    if (added == 0) {
      var same = db.query(
        SELECT + "WHERE b.id=? AND b.session_id=?",
        this::map,
        request.id(),
        owner
      );
      if (
        !same.isEmpty() &&
        same.getFirst().roomId() == request.roomId() &&
        same.getFirst().date().equals(request.date()) &&
        same.getFirst().slot() == request.slot() &&
        same.getFirst().partySize() == request.partySize()
      ) return same.getFirst();
      throw fail(
        HttpStatus.CONFLICT,
        "Khung giờ vừa được đặt. Hãy chọn khung khác."
      );
    }
    events.publishEvent(new RoomChanged(request.roomId()));
    return owned(owner, request.id());
  }

  @Transactional
  public Booking cancel(UUID owner, UUID id) {
    Booking b = owned(owner, id);
    if (b.status().equals("CANCELLED")) return b;
    if (
      !b.status().equals("CONFIRMED") || !b.startsAt().isAfter(now())
    ) throw fail(
      HttpStatus.CONFLICT,
      "Chỉ hủy lịch chưa bắt đầu và chưa check-in."
    );
    int changed = db.update(
      "UPDATE bookings SET status='CANCELLED' WHERE id=? AND session_id=? AND status='CONFIRMED'",
      id,
      owner
    );
    if (changed == 0) throw fail(
      HttpStatus.CONFLICT,
      "Trạng thái lịch đã thay đổi. Hãy tải lại."
    );
    events.publishEvent(new RoomChanged(b.roomId()));
    return owned(owner, id);
  }

  @Transactional
  public Booking checkIn(UUID owner, UUID id, String code) {
    Booking b = owned(owner, id);
    if (!b.code().equals(code)) throw fail(
      HttpStatus.BAD_REQUEST,
      "Mã check-in không đúng."
    );
    if (b.status().equals("CHECKED_IN")) return b;
    if (
      !b.status().equals("CONFIRMED") ||
      now().isBefore(b.startsAt().minus(Duration.ofMinutes(15))) ||
      !now().isBefore(b.endsAt())
    ) throw fail(
      HttpStatus.CONFLICT,
      "Check-in từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc."
    );
    int changed = db.update(
      "UPDATE bookings SET status='CHECKED_IN' WHERE id=? AND session_id=? AND status='CONFIRMED'",
      id,
      owner
    );
    if (changed == 0) throw fail(
      HttpStatus.CONFLICT,
      "Trạng thái lịch đã thay đổi. Hãy tải lại."
    );
    events.publishEvent(new RoomChanged(b.roomId()));
    return owned(owner, id);
  }
}
