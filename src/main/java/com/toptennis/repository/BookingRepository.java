package com.toptennis.repository;

import com.toptennis.model.Booking;
import com.toptennis.model.BookingStatus;
import com.toptennis.model.SportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByCancelToken(String cancelToken);

    @Query("select b from Booking b where b.court.id = :courtId and b.bookingDate = :date and b.status in :activeStatuses and not (b.endTime <= :start or b.startTime >= :end)")
    List<Booking> findOverlapping(@Param("courtId") Long courtId,
                                  @Param("date") LocalDate date,
                                  @Param("start") LocalTime start,
                                  @Param("end") LocalTime end,
                                  @Param("activeStatuses") List<BookingStatus> activeStatuses);

    @Query("select b from Booking b where b.id <> :excludeId and b.court.id = :courtId and b.bookingDate = :date and b.status in :activeStatuses and not (b.endTime <= :start or b.startTime >= :end)")
    List<Booking> findOverlappingExcludingId(@Param("excludeId") Long excludeId,
                                             @Param("courtId") Long courtId,
                                             @Param("date") LocalDate date,
                                             @Param("start") LocalTime start,
                                             @Param("end") LocalTime end,
                                             @Param("activeStatuses") List<BookingStatus> activeStatuses);

    @Query("select distinct b from Booking b join fetch b.court c left join fetch b.playerUser pu where b.bookingDate = :date and (:sportType is null or c.sportType = :sportType)")
    List<Booking> findByDateAndSportType(@Param("date") LocalDate date, @Param("sportType") SportType sportType);

    @Query("select b from Booking b join fetch b.court c where b.bookingDate = :date and b.status = :status and b.startTime between :start and :end and b.weeklyUser = false and LOWER(b.customerName) not like '%abonament%'")
    List<Booking> findForReminder(@Param("date") LocalDate date,
                                  @Param("status") BookingStatus status,
                                  @Param("start") LocalTime start,
                                  @Param("end") LocalTime end);

    List<Booking> findByCourtIdAndBookingDateOrderByStartTimeAsc(Long courtId, LocalDate date);

    List<Booking> findByPlayerUserIdOrderByBookingDateDesc(Long playerUserId);
    
    @Query("select b from Booking b where b.customerPhone = :phone and b.bookingDate = :date and b.status in :activeStatuses and not (b.endTime <= :start or b.startTime >= :end)")
    List<Booking> findOverlappingByPhone(@Param("phone") String phone,
                                         @Param("date") LocalDate date,
                                         @Param("start") LocalTime start,
                                         @Param("end") LocalTime end,
                                         @Param("activeStatuses") List<BookingStatus> activeStatuses);

    List<Booking> findByCustomerPhoneOrderByBookingDateDesc(String customerPhone);

    List<Booking> findByCustomerEmailOrderByBookingDateDesc(String customerEmail);

    // Counts actually-played bookings for a user: past AND still CONFIRMED. A booking
    // marked NO_SHOW (or cancelled) is NOT a played match, so those are excluded.
    @Query("select count(b) from Booking b where b.playerUser.id = :userId and b.status = com.toptennis.model.BookingStatus.CONFIRMED and (b.bookingDate < :today or (b.bookingDate = :today and b.endTime <= :now))")
    long countPastConfirmedByUserId(@Param("userId") Long userId,
                                    @Param("today") LocalDate today,
                                    @Param("now") LocalTime now);
    long countByPlayerUserIdAndStatus(Long playerUserId, BookingStatus status);

    long countByCustomerPhoneAndStatus(String customerPhone, BookingStatus status);

    // Penalty-aware counts: excludes bookings marked as exempt (e.g. after amnesty reset)
    long countByPlayerUserIdAndStatusAndPenaltyExemptFalse(Long playerUserId, BookingStatus status);

    long countByCustomerPhoneAndStatusAndPenaltyExemptFalse(String customerPhone, BookingStatus status);

    List<Booking> findByStatusAndCreatedAtBefore(BookingStatus status, java.time.LocalDateTime createdAt);
    List<Booking> findByStatus(BookingStatus status);

    // Candidates for the admin "abonamente" grouping: either explicitly tagged via subscriptionKey (bookings
    // created after V51) or matching the legacy "(Abonament)" name suffix used by the recurring admin flow before.
    @Query("select b from Booking b join fetch b.court c where b.status = :status and b.bookingDate >= :today and (b.subscriptionKey is not null or lower(b.customerName) like '%(abonament)%') order by b.bookingDate asc, b.startTime asc")
    List<Booking> findActiveSubscriptionCandidates(@Param("status") BookingStatus status, @Param("today") LocalDate today);
}
