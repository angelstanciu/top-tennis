package com.toptennis.service;

import com.toptennis.dto.OpenMatchDto;
import com.toptennis.model.*;
import com.toptennis.repository.*;
import com.toptennis.sms.SmsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Partide deschise (matchmaking) — Faza 1: Padel.
 *
 * Reguli cheie:
 *  - Crearea unei partide REZERVA terenul (trece prin acelasi flux validat ca
 *    orice rezervare: suprapuneri, goluri, penalizari, pret).
 *  - Daca partida nu se umple pana la release_at (de regula start - 6h),
 *    se anuleaza automat si terenul se elibereaza, FARA penalizare pentru
 *    organizator (CANCELLED + penaltyExempt = true, exact ca la block-ul de admin).
 *  - Alaturarea foloseste lock pesimist pe randul partidei ca sa nu depaseasca
 *    niciodata numarul de locuri, indiferent cate cereri vin simultan.
 */
@Service
public class OpenMatchService {
    private static final Logger log = LoggerFactory.getLogger(OpenMatchService.class);
    private static final DateTimeFormatter RO_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    /** Data scurta (fara an) — SMS-urile trebuie sa incapa in 160 de caractere GSM. */
    private static final DateTimeFormatter DD_MM = DateTimeFormatter.ofPattern("dd.MM");
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    /** Cate ore inainte de start se elibereaza automat o partida neumpluta. */
    private static final int RELEASE_HOURS_BEFORE_START = 6;
    /** Nu accept crearea unei partide care incepe in mai putin de atat. */
    private static final int MIN_HOURS_BEFORE_START = 2;

    private final OpenMatchRepository openMatchRepository;
    private final OpenMatchParticipantRepository participantRepository;
    private final PlayerSkillLevelRepository skillLevelRepository;
    private final BookingRepository bookingRepository;
    private final CourtRepository courtRepository;
    private final BookingService bookingService;
    private final PlayerAuthService playerAuthService;
    private final SmsService smsService;
    private final ThreadPoolTaskExecutor taskExecutor;

    @Value("${app.base-url:https://star-arena.ro}")
    private String baseUrl;

    @Value("${sms.adminNotificationNumber:}")
    private String adminNotificationNumber;

    public OpenMatchService(OpenMatchRepository openMatchRepository,
                            OpenMatchParticipantRepository participantRepository,
                            PlayerSkillLevelRepository skillLevelRepository,
                            BookingRepository bookingRepository,
                            CourtRepository courtRepository,
                            BookingService bookingService,
                            PlayerAuthService playerAuthService,
                            SmsService smsService,
                            @Qualifier("smsTaskExecutor") ThreadPoolTaskExecutor taskExecutor) {
        this.openMatchRepository = openMatchRepository;
        this.participantRepository = participantRepository;
        this.skillLevelRepository = skillLevelRepository;
        this.bookingRepository = bookingRepository;
        this.courtRepository = courtRepository;
        this.bookingService = bookingService;
        this.playerAuthService = playerAuthService;
        this.smsService = smsService;
        this.taskExecutor = taskExecutor;
    }

    // ─── Nivel de joc ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<PlayerSkillLevel> getLevel(Long playerId, SportType sport) {
        return skillLevelRepository.findByPlayerUserIdAndSportType(playerId, sport);
    }

    @Transactional
    public PlayerSkillLevel setLevel(PlayerUser player, SportType sport, int levelRank) {
        if (!SkillLevel.isValidRank(levelRank)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nivel de joc invalid.");
        }
        PlayerSkillLevel psl = skillLevelRepository
                .findByPlayerUserIdAndSportType(player.getId(), sport)
                .orElseGet(() -> {
                    PlayerSkillLevel created = new PlayerSkillLevel();
                    created.setPlayerUser(player);
                    created.setSportType(sport);
                    return created;
                });
        psl.setLevelRank(levelRank);
        psl.setUpdatedAt(LocalDateTime.now());
        return skillLevelRepository.save(psl);
    }

    // ─── Creare partida deschisa ─────────────────────────────────────────────

    public record CreateResult(OpenMatch match, Booking booking, String whatsappText) {}

    @Transactional
    public CreateResult createOpenMatch(String token, Long courtId, LocalDate date,
                                        LocalTime start, LocalTime end,
                                        String customerName, String customerPhone, String customerEmail,
                                        int groupSize, int targetLevelRank) {
        PlayerUser player = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Trebuie sa fii autentificat pentru a cauta jucatori."));

        Court court = courtRepository.findById(courtId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Terenul nu a fost gasit."));

        // Faza 1: doar padel.
        if (court.getSportType() != SportType.PADEL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cautarea de jucatori este disponibila momentan doar la Padel.");
        }
        if (groupSize != 2 && groupSize != 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numar de jucatori invalid (2 sau 3).");
        }
        if (!SkillLevel.isValidRank(targetLevelRank)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nivel cautat invalid.");
        }
        // Nivelul organizatorului trebuie setat in profil.
        if (skillLevelRepository.findByPlayerUserIdAndSportType(player.getId(), court.getSportType()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Nu ai selectat nivelul de joc. Mergi la profilul tau si seteaza-l inainte de a cauta jucatori.");
        }
        // Meciurile deschise nu trec peste miezul noptii.
        if (!end.isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Meciurile cu cautare de jucatori nu pot trece peste miezul noptii.");
        }

        LocalDateTime startDT = LocalDateTime.of(date, start);
        LocalDateTime now = LocalDateTime.now();
        if (startDT.isBefore(now.plusHours(MIN_HOURS_BEFORE_START))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Meciul incepe prea curand pentru a mai cauta jucatori. Alege un interval cu cel putin "
                            + MIN_HOURS_BEFORE_START + " ore inainte de start.");
        }
        // Auto-eliberare la start - 6h; daca partida e creata deja in acea
        // fereastra, ii dam totusi o sansa pana la start - 1h.
        LocalDateTime releaseAt = startDT.minusHours(RELEASE_HOURS_BEFORE_START);
        if (!releaseAt.isAfter(now.plusMinutes(30))) {
            releaseAt = startDT.minusHours(1);
        }

        // Rezervarea propriu-zisa: acelasi drum validat ca orice rezervare de client.
        Booking booking = bookingService.createPublic(courtId, date, start, end,
                customerName, customerPhone, customerEmail, token, false);

        OpenMatch match = new OpenMatch();
        match.setBooking(booking);
        match.setOrganizer(player);
        match.setSportType(court.getSportType());
        match.setTargetLevelRank(targetLevelRank);
        match.setGroupSize(groupSize);
        match.setTotalSlots(4);
        match.setStatus(OpenMatchStatus.OPEN);
        match.setReleaseAt(releaseAt);
        match.setCreatedAt(now);
        match.setUpdatedAt(now);
        OpenMatch saved = openMatchRepository.save(match);

        String whatsappText = buildWhatsappText(saved, booking);

        // SMS catre admin cu textul gata de dat forward in grupul clubului.
        if (adminNotificationNumber != null && !adminNotificationNumber.isBlank()) {
            final String adminText = "MECI DESCHIS NOU!\n" + whatsappText;
            final String adminNo = adminNotificationNumber;
            taskExecutor.execute(() -> {
                sleepQuietly();
                var result = smsService.sendSms(adminNo, adminText);
                if (!result.success) {
                    log.warn("Open match admin SMS failed. Transcript: {}", result.transcript);
                }
            });
        }

        log.info("Open match #{} created by player {} (booking #{}), releaseAt={}",
                saved.getId(), player.getId(), booking.getId(), releaseAt);
        return new CreateResult(saved, booking, whatsappText);
    }

    // ─── Alaturare ───────────────────────────────────────────────────────────

    @Transactional
    public OpenMatch joinMatch(String token, Long matchId) {
        PlayerUser player = playerAuthService.getUserByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Trebuie sa fii autentificat pentru a te alatura unui meci."));

        // Lock pesimist: alaturarile la acelasi meci se executa pe rand.
        OpenMatch match = openMatchRepository.findWithLockById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meciul nu a fost gasit."));

        if (skillLevelRepository.findByPlayerUserIdAndSportType(player.getId(), match.getSportType()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Nu ai selectat nivelul de joc. Mergi la profilul tau si seteaza-l inainte de a te alatura.");
        }
        if (match.getStatus() != OpenMatchStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Meciul nu mai este deschis.");
        }
        Booking booking = match.getBooking();
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rezervarea acestui meci nu este activa.");
        }
        LocalDateTime startDT = LocalDateTime.of(booking.getBookingDate(), booking.getStartTime());
        if (!startDT.isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Meciul a inceput deja.");
        }
        if (match.getOrganizer().getId().equals(player.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esti organizatorul acestui meci.");
        }
        if (participantRepository.existsByOpenMatchIdAndPlayerUserId(matchId, player.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Te-ai alaturat deja acestui meci.");
        }
        long joinedCount = participantRepository.countByOpenMatchId(matchId);
        int spotsLeft = match.getTotalSlots() - match.getGroupSize() - (int) joinedCount;
        if (spotsLeft <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Meciul s-a completat intre timp.");
        }

        OpenMatchParticipant participant = new OpenMatchParticipant();
        participant.setOpenMatch(match);
        participant.setPlayerUser(player);
        participant.setJoinedAt(LocalDateTime.now());
        participantRepository.save(participant);

        boolean nowFull = (spotsLeft - 1) == 0;
        if (nowFull) {
            match.setStatus(OpenMatchStatus.FULL);
        }
        match.setUpdatedAt(LocalDateTime.now());
        OpenMatch saved = openMatchRepository.save(match);

        // Notificari SMS (async, in coada single-thread a modemului).
        final String organizerPhone = match.getOrganizer().getPhoneNumber();
        final String joinerName = shortName(safeName(player.getFullName()));
        final String joinerPhone = player.getPhoneNumber() == null ? "" : player.getPhoneNumber();
        final String dateRo = booking.getBookingDate().format(DD_MM);
        final String startHm = booking.getStartTime().format(HM);
        final String endHm = booking.getEndTime().format(HM);
        final String courtName = booking.getCourt() != null ? booking.getCourt().getName() : "?";
        final int remaining = spotsLeft - 1;

        final List<String> fullNotifyPhones;
        if (nowFull) {
            fullNotifyPhones = new ArrayList<>();
            if (organizerPhone != null && !organizerPhone.isBlank()) fullNotifyPhones.add(organizerPhone);
            participantRepository.findWithPlayersByMatchIds(List.of(matchId)).forEach(p -> {
                String ph = p.getPlayerUser().getPhoneNumber();
                if (ph != null && !ph.isBlank() && !fullNotifyPhones.contains(ph)) fullNotifyPhones.add(ph);
            });
        } else {
            fullNotifyPhones = null;
        }

        taskExecutor.execute(() -> {
            if (nowFull && fullNotifyPhones != null) {
                String text = "Echipa e completa! Meci padel " + dateRo + " " + startHm + "-" + endHm
                        + ", Teren " + courtName + ". Ne vedem pe teren!"
                        + SmsService.AUTOMAT_FOOTER;
                for (String phone : fullNotifyPhones) {
                    sleepQuietly();
                    var r = smsService.sendSms(phone, text);
                    if (!r.success) log.warn("Open match FULL SMS failed for {}", phone);
                }
            } else if (organizerPhone != null && !organizerPhone.isBlank()) {
                String text = joinerName + (joinerPhone.isBlank() ? "" : " (" + joinerPhone + ")")
                        + " s-a alaturat meciului tau de padel din " + dateRo + " " + startHm
                        + ". Mai cautati " + remaining + "."
                        + SmsService.AUTOMAT_FOOTER;
                sleepQuietly();
                var r = smsService.sendSms(organizerPhone, text);
                if (!r.success) log.warn("Open match JOIN SMS failed for organizer {}", organizerPhone);
            }
        });

        log.info("Player {} joined open match #{} ({} spots left{})",
                player.getId(), matchId, remaining, nowFull ? ", now FULL" : "");
        return saved;
    }

    // ─── Listare ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<OpenMatchDto> listUpcoming(String token) {
        PlayerUser caller = playerAuthService.getUserByToken(token).orElse(null);
        boolean authenticated = caller != null;
        Long callerId = caller != null ? caller.getId() : null;

        List<OpenMatch> matches = openMatchRepository.findUpcoming(
                List.of(OpenMatchStatus.OPEN, OpenMatchStatus.FULL), LocalDate.now());

        LocalDateTime now = LocalDateTime.now();
        List<OpenMatch> visible = matches.stream()
                .filter(m -> m.getBooking().getStatus() == BookingStatus.CONFIRMED)
                .filter(m -> LocalDateTime.of(m.getBooking().getBookingDate(), m.getBooking().getStartTime()).isAfter(now))
                .sorted(Comparator.comparing((OpenMatch m) -> m.getBooking().getBookingDate())
                        .thenComparing(m -> m.getBooking().getStartTime()))
                .toList();

        if (visible.isEmpty()) return List.of();

        List<Long> ids = visible.stream().map(OpenMatch::getId).toList();
        Map<Long, List<OpenMatchParticipant>> participantsByMatch = participantRepository
                .findWithPlayersByMatchIds(ids).stream()
                .collect(Collectors.groupingBy(p -> p.getOpenMatch().getId(),
                        LinkedHashMap::new, Collectors.toList()));

        return visible.stream()
                .map(m -> toDto(m, participantsByMatch.getOrDefault(m.getId(), List.of()), authenticated, callerId))
                .toList();
    }

    private OpenMatchDto toDto(OpenMatch m, List<OpenMatchParticipant> participants,
                               boolean authenticated, Long callerId) {
        Booking b = m.getBooking();
        OpenMatchDto dto = new OpenMatchDto();
        dto.id = m.getId();
        dto.sportType = m.getSportType().name();
        dto.courtName = b.getCourt() != null ? b.getCourt().getName() : "?";
        dto.courtIndoor = b.getCourt() != null && b.getCourt().isIndoor();
        dto.date = b.getBookingDate().toString();
        dto.startTime = b.getStartTime().format(HM);
        dto.endTime = b.getEndTime().format(HM);
        dto.targetLevelRank = m.getTargetLevelRank();
        dto.targetLevelLabel = SkillLevel.fromRank(m.getTargetLevelRank()).getLabel();
        dto.status = m.getStatus().name();
        dto.totalSlots = m.getTotalSlots();
        dto.groupSize = m.getGroupSize();
        dto.spotsLeft = Math.max(0, m.getTotalSlots() - m.getGroupSize() - participants.size());
        dto.organizerName = safeName(m.getOrganizer().getFullName());
        dto.organizerPhone = authenticated ? m.getOrganizer().getPhoneNumber() : null;
        dto.organizerAvatar = m.getOrganizer().getAvatarUrl();
        dto.bookingStatus = b.getStatus().name();
        dto.mine = callerId != null && m.getOrganizer().getId().equals(callerId);
        dto.joined = callerId != null && participants.stream()
                .anyMatch(p -> p.getPlayerUser().getId().equals(callerId));
        dto.participants = participants.stream().map(p -> {
            OpenMatchDto.ParticipantDto pd = new OpenMatchDto.ParticipantDto();
            pd.name = safeName(p.getPlayerUser().getFullName());
            pd.phone = authenticated ? p.getPlayerUser().getPhoneNumber() : null;
            pd.avatarUrl = p.getPlayerUser().getAvatarUrl();
            return pd;
        }).toList();
        return dto;
    }

    // ─── Preluarea intervalului de o echipa completa (ultimele 6 ore) ────────

    /**
     * In ultimele 6 ore inainte de start, un meci OPEN inca neumplut nu mai are
     * garantia slotului: o echipa completa poate prelua intervalul. Rezervarea
     * organizatorului se anuleaza FARA penalizare, meciul se inchide, iar
     * organizatorul si jucatorii alaturati sunt anuntati prin SMS.
     */
    public record TakeoverResult(Booking newBooking) {}

    @Transactional
    public TakeoverResult takeoverMatch(String token, Long matchId,
                                        String customerName, String customerPhone, String customerEmail) {
        OpenMatch match = openMatchRepository.findWithLockById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meciul nu a fost gasit."));

        if (match.getStatus() != OpenMatchStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Meciul nu mai este deschis; intervalul nu poate fi preluat.");
        }
        Booking oldBooking = match.getBooking();
        if (oldBooking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Rezervarea acestui meci nu este activa.");
        }
        LocalDateTime startDT = LocalDateTime.of(oldBooking.getBookingDate(), oldBooking.getStartTime());
        LocalDateTime now = LocalDateTime.now();
        if (!startDT.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Meciul a inceput deja.");
        }
        if (now.isBefore(startDT.minusHours(RELEASE_HOURS_BEFORE_START))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Intervalul poate fi preluat doar in ultimele " + RELEASE_HOURS_BEFORE_START
                            + " ore inainte de meci. Pana atunci te poti alatura meciului.");
        }

        // Inchidem meciul si eliberam rezervarea organizatorului, fara penalizare.
        match.setStatus(OpenMatchStatus.CANCELLED);
        match.setUpdatedAt(now);
        openMatchRepository.save(match);

        oldBooking.setStatus(BookingStatus.CANCELLED);
        oldBooking.setPenaltyExempt(true);
        oldBooking.setUpdatedAt(now);
        bookingRepository.save(oldBooking);
        bookingRepository.flush();

        // Rezervarea echipei complete, prin acelasi drum validat ca oricare alta.
        Booking newBooking = bookingService.createPublic(
                oldBooking.getCourt().getId(), oldBooking.getBookingDate(),
                oldBooking.getStartTime(), oldBooking.getEndTime(),
                customerName, customerPhone, customerEmail, token, false);

        // Notificari: organizator + jucatorii alaturati (texte sub 160 caractere).
        String dateRo = oldBooking.getBookingDate().format(DD_MM);
        String startHm = oldBooking.getStartTime().format(HM);
        String organizerPhone = match.getOrganizer().getPhoneNumber();
        List<String> participantPhones = participantRepository.findWithPlayersByMatchIds(List.of(matchId)).stream()
                .map(p -> p.getPlayerUser().getPhoneNumber())
                .filter(p -> p != null && !p.isBlank())
                .distinct()
                .toList();
        taskExecutor.execute(() -> {
            if (organizerPhone != null && !organizerPhone.isBlank()) {
                sleepQuietly();
                var r = smsService.sendSms(organizerPhone,
                        "Intervalul tau de padel din " + dateRo + " ora " + startHm
                                + " a fost rezervat de o echipa completa. Meciul s-a inchis, nu ai nicio penalizare."
                                + SmsService.AUTOMAT_FOOTER);
                if (!r.success) log.warn("Takeover SMS failed for organizer {}", organizerPhone);
            }
            for (String phone : participantPhones) {
                sleepQuietly();
                var r = smsService.sendSms(phone,
                        "Meciul de padel din " + dateRo + " ora " + startHm
                                + " s-a anulat: intervalul a fost preluat de o echipa completa. Ne pare rau!"
                                + SmsService.AUTOMAT_FOOTER);
                if (!r.success) log.warn("Takeover SMS failed for participant {}", phone);
            }
        });

        log.info("Open match #{} taken over: old booking #{} cancelled (no penalty), new booking #{} created.",
                matchId, oldBooking.getId(), newBooking.getId());
        return new TakeoverResult(newBooking);
    }

    // ─── Auto-eliberare (job programat) ──────────────────────────────────────

    /**
     * La fiecare 5 minute: partidele OPEN care au trecut de release_at si nu
     * s-au umplut se anuleaza, iar terenul se elibereaza FARA penalizare.
     * Tot aici sincronizam partidele ale caror rezervari au fost anulate
     * separat (de admin sau de organizator).
     */
    @Scheduled(fixedDelay = 300_000, initialDelay = 60_000)
    @Transactional
    public void autoReleaseUnfilledMatches() {
        LocalDateTime now = LocalDateTime.now();
        List<OpenMatch> openMatches = openMatchRepository.findByStatusFetchBooking(OpenMatchStatus.OPEN);

        for (OpenMatch match : openMatches) {
            Booking booking = match.getBooking();
            boolean bookingDead = booking.getStatus() == BookingStatus.CANCELLED
                    || booking.getStatus() == BookingStatus.NO_SHOW;
            boolean pastRelease = !match.getReleaseAt().isAfter(now);
            LocalDateTime startDT = LocalDateTime.of(booking.getBookingDate(), booking.getStartTime());
            boolean started = !startDT.isAfter(now);

            if (bookingDead) {
                // Rezervarea a fost anulata pe alt drum -> inchidem partida si
                // anuntam jucatorii care se alaturasera.
                match.setStatus(OpenMatchStatus.CANCELLED);
                match.setUpdatedAt(now);
                openMatchRepository.save(match);
                notifyParticipantsMatchCancelled(match, booking);
                log.info("Open match #{} closed: its booking #{} was cancelled elsewhere.",
                        match.getId(), booking.getId());
                continue;
            }

            if (pastRelease && !started) {
                // Neumpluta la deadline -> anulam si eliberam terenul, fara penalizare.
                match.setStatus(OpenMatchStatus.CANCELLED);
                match.setUpdatedAt(now);
                openMatchRepository.save(match);

                booking.setStatus(BookingStatus.CANCELLED);
                booking.setPenaltyExempt(true);
                booking.setUpdatedAt(now);
                bookingRepository.save(booking);

                notifyAutoRelease(match, booking);
                log.info("Open match #{} auto-released (booking #{} freed, no penalty).",
                        match.getId(), booking.getId());
            } else if (started) {
                // A inceput fara sa se umple: doar inchidem partida, rezervarea ramane.
                match.setStatus(OpenMatchStatus.CANCELLED);
                match.setUpdatedAt(now);
                openMatchRepository.save(match);
                log.info("Open match #{} closed: start time passed.", match.getId());
            }
        }
    }

    private void notifyAutoRelease(OpenMatch match, Booking booking) {
        String phone = match.getOrganizer().getPhoneNumber();
        if (phone == null || phone.isBlank()) return;
        String dateRo = booking.getBookingDate().format(DD_MM);
        String startHm = booking.getStartTime().format(HM);
        String text = "Meciul tau de padel din " + dateRo + " ora " + startHm
                + " nu s-a completat si s-a anulat automat. Terenul e liber, nu ai nicio penalizare."
                + SmsService.AUTOMAT_FOOTER;
        taskExecutor.execute(() -> {
            sleepQuietly();
            var r = smsService.sendSms(phone, text);
            if (!r.success) log.warn("Auto-release SMS failed for organizer {}", phone);
        });
    }

    private void notifyParticipantsMatchCancelled(OpenMatch match, Booking booking) {
        List<OpenMatchParticipant> participants =
                participantRepository.findWithPlayersByMatchIds(List.of(match.getId()));
        if (participants.isEmpty()) return;
        String dateRo = booking.getBookingDate().format(DD_MM);
        String startHm = booking.getStartTime().format(HM);
        List<String> phones = participants.stream()
                .map(p -> p.getPlayerUser().getPhoneNumber())
                .filter(p -> p != null && !p.isBlank())
                .distinct()
                .toList();
        if (phones.isEmpty()) return;
        String text = "Meciul de padel din " + dateRo + " ora " + startHm
                + " la care te-ai alaturat a fost anulat. Ne pare rau!"
                + SmsService.AUTOMAT_FOOTER;
        taskExecutor.execute(() -> {
            for (String phone : phones) {
                sleepQuietly();
                var r = smsService.sendSms(phone, text);
                if (!r.success) log.warn("Match-cancelled SMS failed for participant {}", phone);
            }
        });
    }

    // ─── Utilitare ───────────────────────────────────────────────────────────

    /**
     * Text compact, valabil si pentru share pe WhatsApp si pentru SMS-ul catre
     * admin (impreuna cu prefixul "MECI DESCHIS NOU!\n" trebuie sa ramana sub
     * 160 de caractere — limita unui SMS GSM pe modem).
     */
    public String buildWhatsappText(OpenMatch match, Booking booking) {
        String dateRo = booking.getBookingDate().format(DD_MM);
        String startHm = booking.getStartTime().format(HM);
        String endHm = booking.getEndTime().format(HM);
        int seeking = match.getTotalSlots() - match.getGroupSize();
        String levelLabel = SkillLevel.fromRank(match.getTargetLevelRank()).getLabel();
        return "Meci padel " + dateRo + ", " + startHm + "-" + endHm
                + ", Teren " + (booking.getCourt() != null ? booking.getCourt().getName() : "?")
                + ". Cautam " + seeking + (seeking == 1 ? " jucator" : " jucatori")
                + ", nivel " + levelLabel + "."
                + " Alatura-te: " + baseUrl + "/meciuri";
    }

    private String safeName(String name) {
        return (name == null || name.isBlank()) ? "Jucator" : name.trim();
    }

    /** Nume scurtat pentru SMS (limita de 160 caractere GSM). */
    private String shortName(String name) {
        return name.length() > 18 ? name.substring(0, 16) + ".." : name;
    }

    private void sleepQuietly() {
        try { Thread.sleep(2000L); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
