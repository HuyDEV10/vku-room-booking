package vn.edu.vku.booking;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static vn.edu.vku.booking.Models.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(BookingIntegrationTest.TestTime.class)
class BookingIntegrationTest {

  static class MutableClock extends Clock {

    volatile Instant value = Instant.parse("2026-10-09T00:00:00Z");

    @Override
    public ZoneId getZone() {
      return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return value;
    }
  }

  @TestConfiguration
  static class TestTime {

    @Bean
    @Primary
    MutableClock testClock() {
      return new MutableClock();
    }
  }

  @Autowired
  BookingService service;

  @Autowired
  JdbcTemplate db;

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper json;

  @Autowired
  MutableClock clock;

  @LocalServerPort
  int port;

  UUID owner;
  String token;

  @BeforeEach
  void setup() {
    String database = db.queryForObject(
      "SELECT current_database()",
      String.class
    );
    if (
      database == null || !database.endsWith("_test")
    ) throw new IllegalStateException(
      "Chỉ chạy kiểm thử trên database kết thúc _test."
    );
    db.update("DELETE FROM bookings");
    db.update("DELETE FROM demo_sessions");
    clock.value = Instant.parse("2026-10-09T00:00:00Z");
    var receipt = service.createSession(
      new SessionRequest("Sinh viên kiểm thử", "23TEST01")
    );
    owner = receipt.user().id();
    token = receipt.token();
  }

  BookingRequest input(int room, int slot) {
    return new BookingRequest(
      UUID.randomUUID(),
      room,
      LocalDate.of(2026, 10, 10),
      slot,
      2
    );
  }

  @Test
  void createsAndRetriesSameRequestWithoutDuplicates() {
    var request = input(1, 0);
    Booking first = service.book(owner, request);
    assertThat(service.book(owner, request)).isEqualTo(first);
    assertThat(
      db.queryForObject("SELECT count(*) FROM bookings", Integer.class)
    ).isEqualTo(1);
    assertThat(first.startsAt()).isEqualTo(
      Instant.parse("2026-10-10T00:30:00Z")
    );
  }

  @Test
  void concurrentDifferentRequestsHaveExactlyOneWinner() throws Exception {
    try (var executor = Executors.newFixedThreadPool(4)) {
      var barrier = new CyclicBarrier(4);
      var jobs = new ArrayList<Future<Boolean>>();
      for (int i = 0; i < 4; i++) jobs.add(
        executor.submit(() -> {
          barrier.await();
          try {
            service.book(owner, input(1, 0));
            return true;
          } catch (ResponseStatusException e) {
            assertThat(e.getStatusCode().value()).isEqualTo(409);
            return false;
          }
        })
      );
      int winners = 0;
      for (var job : jobs) if (job.get(15, TimeUnit.SECONDS)) winners++;
      assertThat(winners).isEqualTo(1);
      assertThat(
        db.queryForObject("SELECT count(*) FROM bookings", Integer.class)
      ).isEqualTo(1);
    }
  }

  @Test
  void concurrentRetryOfSameIdReturnsSameBooking() throws Exception {
    var input = input(1, 0);
    try (var executor = Executors.newFixedThreadPool(3)) {
      var barrier = new CyclicBarrier(3);
      var jobs = new ArrayList<Future<Booking>>();
      for (int i = 0; i < 3; i++) jobs.add(
        executor.submit(() -> {
          barrier.await();
          return service.book(owner, input);
        })
      );
      for (var job : jobs)
        assertThat(job.get(15, TimeUnit.SECONDS).id()).isEqualTo(input.id());
      assertThat(
        db.queryForObject("SELECT count(*) FROM bookings", Integer.class)
      ).isEqualTo(1);
    }
  }

  @Test
  void cancellationReleasesSlotAndIsIdempotent() {
    Booking b = service.book(owner, input(1, 0));
    assertThat(service.slots(1, b.date()).getFirst().booked()).isTrue();
    assertThat(service.cancel(owner, b.id()).status()).isEqualTo("CANCELLED");
    service.cancel(owner, b.id());
    assertThat(service.slots(1, b.date()).getFirst().booked()).isFalse();
    service.book(owner, input(1, 0));
  }

  @Test
  void differentSessionCannotCancelOrReadOthersBooking() {
    Booking b = service.book(owner, input(1, 0));
    UUID stranger = service
      .createSession(new SessionRequest("Phiên khác", "23TEST02"))
      .user()
      .id();
    assertThat(service.mine(stranger)).isEmpty();
    assertThatThrownBy(() -> service.cancel(stranger, b.id()))
      .isInstanceOf(ResponseStatusException.class)
      .satisfies(e ->
        assertThat(
          ((ResponseStatusException) e).getStatusCode().value()
        ).isEqualTo(404)
      );
  }

  @Test
  void rejectsDatesOutsideSevenDaysAndCapacityOverflow() {
    assertThatThrownBy(() ->
      service.book(
        owner,
        new BookingRequest(
          UUID.randomUUID(),
          1,
          LocalDate.of(2026, 10, 16),
          0,
          2
        )
      )
    ).isInstanceOf(ResponseStatusException.class);
    assertThatThrownBy(() ->
      service.book(
        owner,
        new BookingRequest(
          UUID.randomUUID(),
          1,
          LocalDate.of(2026, 10, 8),
          0,
          2
        )
      )
    ).isInstanceOf(ResponseStatusException.class);
    assertThatThrownBy(() ->
      service.book(
        owner,
        new BookingRequest(
          UUID.randomUUID(),
          1,
          LocalDate.of(2026, 10, 10),
          0,
          7
        )
      )
    ).isInstanceOf(ResponseStatusException.class);
  }

  @Test
  void checkInRequiresCodeAndTimeWindowAndLocksCancellation() {
    Booking b = service.book(owner, input(1, 0));
    assertThatThrownBy(() ->
      service.checkIn(owner, b.id(), b.code())
    ).isInstanceOf(ResponseStatusException.class);
    clock.value = b.startsAt().minusSeconds(900);
    assertThatThrownBy(() ->
      service.checkIn(owner, b.id(), "wrong")
    ).isInstanceOf(ResponseStatusException.class);
    assertThat(service.checkIn(owner, b.id(), b.code()).status()).isEqualTo(
      "CHECKED_IN"
    );
    assertThat(service.checkIn(owner, b.id(), b.code()).status()).isEqualTo(
      "CHECKED_IN"
    );
    assertThatThrownBy(() -> service.cancel(owner, b.id())).isInstanceOf(
      ResponseStatusException.class
    );
  }

  @Test
  void currentOccupancyTracksStartAndEndBoundaries() {
    Booking b = service.book(owner, input(1, 0));
    clock.value = b.startsAt();
    assertThat(service.rooms().getFirst().occupiedNow()).isTrue();
    clock.value = b.endsAt();
    assertThat(service.rooms().getFirst().occupiedNow()).isFalse();
    assertThatThrownBy(() ->
      service.book(
        owner,
        new BookingRequest(UUID.randomUUID(), 2, b.date(), 0, 2)
      )
    ).isInstanceOf(ResponseStatusException.class);
  }

  @Test
  void reusedRequestIdWithChangedPayloadIsRejected() {
    var input = input(1, 0);
    service.book(owner, input);
    assertThatThrownBy(() ->
      service.book(owner, new BookingRequest(input.id(), 1, input.date(), 1, 2))
    ).isInstanceOf(ResponseStatusException.class);
  }

  @Test
  void validatesHttpPayloadAndRequiresBearer() throws Exception {
    mvc
      .perform(
        post("/api/bookings")
          .contentType(MediaType.APPLICATION_JSON)
          .content(json.writeValueAsString(input(1, 0)))
      )
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/bookings")
          .header("Authorization", "Bearer " + token)
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            "{\"id\":\"" +
              UUID.randomUUID() +
              "\",\"roomId\":1,\"date\":\"2026-10-10\",\"slot\":9,\"partySize\":2}"
          )
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(
        post("/api/sessions")
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"fullName\":\"\",\"studentId\":\"bad id\"}")
      )
      .andExpect(status().isBadRequest());
  }

  @Test
  void healthAndCorsUseExactOrigin() throws Exception {
    mvc
      .perform(get("/api/health"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.database").value("PostgreSQL"));
    mvc
      .perform(
        options("/api/bookings")
          .header("Origin", "http://localhost:8082")
          .header("Access-Control-Request-Method", "POST")
          .header(
            "Access-Control-Request-Headers",
            "Authorization,Content-Type"
          )
      )
      .andExpect(status().isOk())
      .andExpect(
        header().string("Access-Control-Allow-Origin", "http://localhost:8082")
      );
    mvc
      .perform(get("/api/rooms").header("Origin", "https://untrusted.example"))
      .andExpect(status().isForbidden());
  }

  @Test
  void websocketPublishesCommittedRoomChange() throws Exception {
    var message = new CompletableFuture<String>();
    var listener = new WebSocket.Listener() {
      @Override
      public void onOpen(WebSocket socket) {
        socket.request(1);
      }

      @Override
      public CompletionStage<?> onText(
        WebSocket socket,
        CharSequence data,
        boolean last
      ) {
        message.complete(data.toString());
        socket.request(1);
        return null;
      }
    };
    WebSocket socket = HttpClient.newHttpClient()
      .newWebSocketBuilder()
      .buildAsync(URI.create("ws://localhost:" + port + "/ws/rooms"), listener)
      .get(10, TimeUnit.SECONDS);
    try {
      service.book(owner, input(1, 0));
      assertThat(message.get(10, TimeUnit.SECONDS)).contains(
        "ROOM_CHANGED",
        "\"roomId\":1"
      );
    } finally {
      socket
        .sendClose(WebSocket.NORMAL_CLOSURE, "done")
        .get(5, TimeUnit.SECONDS);
    }
  }
}
