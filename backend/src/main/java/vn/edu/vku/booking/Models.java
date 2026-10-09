package vn.edu.vku.booking;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;

public final class Models {

  private Models() {}

  public record SessionRequest(
    @NotBlank @Size(max = 100) String fullName,
    @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{3,30}") String studentId
  ) {}

  public record Session(UUID id, String fullName, String studentId) {}

  public record SessionReceipt(Session user, String token) {}

  public record Room(
    int id,
    String name,
    String building,
    int floor,
    int capacity,
    List<String> equipment,
    String imageKey,
    boolean occupiedNow
  ) {}

  public record Slot(
    int index,
    String label,
    Instant startsAt,
    Instant endsAt,
    boolean booked,
    boolean past
  ) {}

  public record BookingRequest(
    @NotNull UUID id,
    @Min(1) int roomId,
    @NotNull LocalDate date,
    @Min(0) @Max(3) int slot,
    @Min(2) @Max(20) int partySize
  ) {}

  public record Booking(
    UUID id,
    int roomId,
    String roomName,
    LocalDate date,
    int slot,
    int partySize,
    Instant startsAt,
    Instant endsAt,
    String status,
    String code
  ) {}

  public record CodeRequest(@NotBlank @Size(max = 24) String code) {}

  public record RoomChanged(int roomId) {}
}
