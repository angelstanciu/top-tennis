package com.toptennis.repository;

import com.toptennis.model.Court;
import com.toptennis.model.SportType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CourtRepository extends JpaRepository<Court, Long> {
    List<Court> findBySportTypeAndActiveTrueOrderByIdAsc(SportType sportType);
    List<Court> findByActiveTrueOrderByIdAsc();
}

