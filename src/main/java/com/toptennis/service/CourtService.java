package com.toptennis.service;

import com.toptennis.model.Court;
import com.toptennis.model.SportType;
import com.toptennis.repository.CourtRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CourtService {
    private final CourtRepository courtRepository;

    public CourtService(CourtRepository courtRepository) {
        this.courtRepository = courtRepository;
    }

    public List<Court> listActive(SportType sportType) {
        if (sportType == null) {
            return courtRepository.findByActiveTrueOrderByIdAsc();
        }
        return courtRepository.findBySportTypeAndActiveTrueOrderByIdAsc(sportType);
    }

    public Court get(Long id) {
        return courtRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Terenul nu a fost găsit: " + id));
    }
}

