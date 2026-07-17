package com.toptennis.service;

import com.toptennis.model.Court;
import com.toptennis.model.SportType;
import com.toptennis.repository.CourtRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalTime;
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

    public Court updateHours(Long id, LocalTime openTime, LocalTime closeTime, boolean lighting,
                              BigDecimal pricePerHour, BigDecimal nightPrice, LocalTime nightRateStartTime,
                              BigDecimal morningPrice) {
        if (openTime == null || closeTime == null) {
            throw new IllegalArgumentException("Ora de deschidere și ora de închidere sunt obligatorii.");
        }
        if (!openTime.isBefore(closeTime)) {
            throw new IllegalArgumentException("Ora de deschidere trebuie să fie înainte de ora de închidere.");
        }
        if (pricePerHour == null || pricePerHour.signum() < 0) {
            throw new IllegalArgumentException("Prețul trebuie să fie un număr pozitiv.");
        }
        Court court = get(id);
        boolean nocturnaApplies = !court.isIndoor() && lighting;
        if (nocturnaApplies) {
            if (nightPrice == null || nightPrice.signum() < 0) {
                throw new IllegalArgumentException("Prețul de nocturnă trebuie să fie un număr pozitiv.");
            }
            if (nightRateStartTime == null || nightRateStartTime.isBefore(openTime) || nightRateStartTime.isAfter(closeTime)) {
                throw new IllegalArgumentException("Ora de nocturnă trebuie să fie între ora de deschidere și cea de închidere.");
            }
        }
        if (court.getSportType() == SportType.PADEL && !court.isIndoor()) {
            if (morningPrice == null || morningPrice.signum() < 0) {
                throw new IllegalArgumentException("Prețul de dimineață trebuie să fie un număr pozitiv.");
            }
        }
        court.setOpenTime(openTime);
        court.setCloseTime(closeTime);
        court.setLighting(lighting);
        court.setPricePerHour(pricePerHour);
        if (nightPrice != null) court.setNightPrice(nightPrice);
        if (nightRateStartTime != null) court.setNightRateStartTime(nightRateStartTime);
        if (morningPrice != null) court.setMorningPrice(morningPrice);
        return courtRepository.save(court);
    }
}

