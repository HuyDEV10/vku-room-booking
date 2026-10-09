package vn.edu.vku.booking;

import static vn.edu.vku.booking.Models.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class BookingController {

  private final BookingService service;
  private final JdbcTemplate db;

  public BookingController(BookingService service, JdbcTemplate db) {
    this.service = service;
    this.db = db;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    db.queryForObject("SELECT 1", Integer.class);
    return Map.of(
      "status",
      "UP",
      "database",
      "PostgreSQL",
      "serverTime",
      service.now()
    );
  }

  @PostMapping("/sessions")
  public SessionReceipt session(@Valid @RequestBody SessionRequest body) {
    return service.createSession(body);
  }

  @GetMapping("/rooms")
  public List<Room> rooms() {
    return service.rooms();
  }

  @GetMapping("/rooms/{id}/slots")
  public List<Slot> slots(@PathVariable int id, @RequestParam LocalDate date) {
    return service.slots(id, date);
  }

  @GetMapping("/bookings")
  public List<Booking> mine(
    @RequestHeader(value = "Authorization", required = false) String auth
  ) {
    return service.mine(service.owner(auth));
  }

  @PostMapping("/bookings")
  public Booking book(
    @RequestHeader(value = "Authorization", required = false) String auth,
    @Valid @RequestBody BookingRequest body
  ) {
    return service.book(service.owner(auth), body);
  }

  @PostMapping("/bookings/{id}/cancel")
  public Booking cancel(
    @RequestHeader(value = "Authorization", required = false) String auth,
    @PathVariable UUID id
  ) {
    return service.cancel(service.owner(auth), id);
  }

  @PostMapping("/bookings/{id}/check-in")
  public Booking checkIn(
    @RequestHeader(value = "Authorization", required = false) String auth,
    @PathVariable UUID id,
    @Valid @RequestBody CodeRequest body
  ) {
    return service.checkIn(service.owner(auth), id, body.code());
  }
}
