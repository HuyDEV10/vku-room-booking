package vn.edu.vku.booking;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<?> expected(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of(
        "message",
        e.getReason() == null ? "Yêu cầu không hợp lệ." : e.getReason()
      )
    );
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class,
  })
  public ResponseEntity<?> invalid(Exception e) {
    return ResponseEntity.badRequest().body(
      Map.of(
        "message",
        "Dữ liệu không hợp lệ. Kiểm tra tên, MSSV, ngày, khung giờ và số người."
      )
    );
  }
}
