package com.toptennis.repository;

import com.toptennis.model.OpenMatch;
import com.toptennis.model.OpenMatchStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OpenMatchRepository extends JpaRepository<OpenMatch, Long> {

    /**
     * Incarcare cu lock pesimist (SELECT ... FOR UPDATE) — serializeaza
     * alaturarile concurente la acelasi meci, ca sa nu depasim numarul de locuri.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from OpenMatch m where m.id = :id")
    Optional<OpenMatch> findWithLockById(@Param("id") Long id);

    @Query("select m from OpenMatch m " +
           "join fetch m.booking b " +
           "join fetch b.court " +
           "join fetch m.organizer " +
           "where m.status in :statuses and b.bookingDate >= :fromDate")
    List<OpenMatch> findUpcoming(@Param("statuses") List<OpenMatchStatus> statuses,
                                 @Param("fromDate") LocalDate fromDate);

    @Query("select m from OpenMatch m " +
           "join fetch m.booking b " +
           "join fetch b.court " +
           "join fetch m.organizer " +
           "where m.status = :status")
    List<OpenMatch> findByStatusFetchBooking(@Param("status") OpenMatchStatus status);
}
