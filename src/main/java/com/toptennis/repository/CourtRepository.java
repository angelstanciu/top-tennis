package com.toptennis.repository;

import com.toptennis.model.Court;
import com.toptennis.model.SportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.List;

public interface CourtRepository extends JpaRepository<Court, Long> {
    List<Court> findBySportTypeAndActiveTrueOrderByIdAsc(SportType sportType);
    List<Court> findByActiveTrueOrderByIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Court c where c.id = :id")
    java.util.Optional<Court> findWithLockById(Long id);
}

