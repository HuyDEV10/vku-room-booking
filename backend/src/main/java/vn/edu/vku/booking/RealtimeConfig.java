package vn.edu.vku.booking;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.event.*;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Configuration
@EnableWebSocket
public class RealtimeConfig
  extends TextWebSocketHandler
  implements WebSocketConfigurer, WebMvcConfigurer
{

  private final String[] origins;
  private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

  public RealtimeConfig(@Value("${app.cors-origins}") String origins) {
    this.origins = origins.split(",");
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry.addHandler(this, "/ws/rooms").setAllowedOrigins(origins);
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry
      .addMapping("/api/**")
      .allowedOrigins(origins)
      .allowedMethods("GET", "POST", "OPTIONS")
      .allowedHeaders("Content-Type", "Authorization");
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    sessions.add(new ConcurrentWebSocketSessionDecorator(session, 5000, 65536));
  }

  @Override
  public void afterConnectionClosed(
    WebSocketSession session,
    CloseStatus status
  ) {
    sessions.removeIf(s -> s.getId().equals(session.getId()));
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void changed(Models.RoomChanged event) {
    for (WebSocketSession session : sessions) {
      try {
        if (session.isOpen()) session.sendMessage(
          new TextMessage(
            "{\"type\":\"ROOM_CHANGED\",\"roomId\":" + event.roomId() + "}"
          )
        );
        else sessions.remove(session);
      } catch (IOException | RuntimeException e) {
        sessions.remove(session);
        try {
          session.close();
        } catch (IOException ignored) {}
      }
    }
  }
}
