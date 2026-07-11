package com.toptennis.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

// Keeps track of open /api/bookings/stream connections and fans out booking
// change events to all of them. Emitters are only removed here (on
// completion/timeout/error/send-failure) — never mutated from BookingService.
@Component
public class BookingSseBroadcaster {
    private static final Logger log = LoggerFactory.getLogger(BookingSseBroadcaster.class);
    private static final long EMITTER_TIMEOUT_MS = 30L * 60 * 1000; // EventSource reconnects natively after timeout

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError(e -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("CONNECTED").data("ok"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onBookingChanged(BookingChangedEvent event) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(event.type().name()).data(event));
            } catch (IOException | IllegalStateException e) {
                emitter.complete();
                emitters.remove(emitter);
            }
        }
    }

    // Fara asta, o conexiune fara evenimente de rezervare o perioada lunga poate fi
    // considerata idle si taiata de un reverse proxy intermediar (ex. nginx
    // proxy_read_timeout), iar aplicatia nu ar afla decat la urmatorul send() esuat.
    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().comment("keep-alive"));
            } catch (IOException | IllegalStateException e) {
                emitter.complete();
                emitters.remove(emitter);
            }
        }
    }
}
