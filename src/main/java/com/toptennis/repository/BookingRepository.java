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

public interface BookingRepository extends JpaRepository<Booking, Long> {

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

    @Query("select distinct b from Booking b join fetch b.court c where b.bookingDate = :date and (:sportType is null or c.sportType = :sportType)")
    List<Booking> findByDateAndSportType(@Param("date") LocalDate date, @Param("sportType") SportType sportType);

    @Query("select b from Booking b join fetch b.court c where b.bookingDate = :date and b.status = :status and b.startTime between :start and :end")
    List<Booking> findForReminder(@Param("date") LocalDate date,
                                  @Param("status") BookingStatus status,
                                  @Param("start") LocalTime start,
                                  @Param("end") LocalTime end);

    @Query("select b from Booking b join fetch b.court c where b.bookingDate = :date and b.startTime = :start and b.court.id = :courtId and b.customerPhone = :phone and b.customerName = :name")
    List<Booking> findByDateStartCourtAndCustomer(@Param("date") LocalDate date,
                                                  @Param("start") LocalTime start,
                                                  @Param("courtId") Long courtId,
                                                  @Param("phone") String phone,
                                                  @Param("name") String name);

    @Query("select b from Booking b join fetch b.court c where b.bookingDate = :date and b.endTime = :end and b.court.id = :courtId and b.customerPhone = :phone and b.customerName = :name")
    List<Booking> findByDateEndCourtAndCustomer(@Param("date") LocalDate date,
                                                @Param("end") LocalTime end,
                                                @Param("courtId") Long courtId,
                                                @Param("phone") String phone,
                                                @Param("name") String name);

    List<Booking> findByCourtIdAndBookingDateOrderByStartTimeAsc(Long courtId, LocalDate date);
}
