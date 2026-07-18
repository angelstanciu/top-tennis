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
    // Must match BookingService.PADEL_OUTDOOR_MORNING_END — the fixed weekday morning-discount
    // boundary for Padel outdoor. Duplicated here (rather than shared) because a nocturnă
    // morning carry-over ending after this hour would hand splitTieredPrice a non-ascending
    // boundary array ([nightRateEndTime, 14:00, nightRateStartTime]) and silently mis-tier bookings.
    private static final LocalTime PADEL_OUTDOOR_MORNING_END = LocalTime.of(14, 0);

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
                              BigDecimal morningPrice, LocalTime nightRateEndTime) {
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
        boolean isPadelOutdoor = court.getSportType() == SportType.PADEL && !court.isIndoor();
        boolean nocturnaApplies = !court.isIndoor() && lighting;
        if (nocturnaApplies) {
            if (nightPrice == null || nightPrice.signum() < 0) {
                throw new IllegalArgumentException("Prețul de nocturnă trebuie să fie un număr pozitiv.");
            }
            if (nightRateStartTime == null || nightRateStartTime.isBefore(openTime) || nightRateStartTime.isAfter(closeTime)) {
                throw new IllegalArgumentException("Ora de nocturnă trebuie să fie între ora de deschidere și cea de închidere.");
            }
        }
        // Validated whenever a morning carry-over is being saved, independent of the `lighting`
        // toggle above: nightRateStartTime/nightRateEndTime persist regardless of nocturnaApplies
        // (see the unconditional setters below), so an inverted pair saved while lighting is off
        // would otherwise silently reactivate — mispriced — the moment nocturnă is turned back on.
        // '00:00' is the sentinel for "no morning carry-over" (nocturnă stops at closing, same as
        // before this field existed).
        if (nightRateStartTime != null && nightRateEndTime != null && nightRateEndTime.isAfter(LocalTime.MIDNIGHT)) {
            if (!nightRateEndTime.isBefore(nightRateStartTime)) {
                throw new IllegalArgumentException("Ora de final a nocturnei (dimineața) trebuie să fie înainte de ora de start a nocturnei.");
            }
            // Padel outdoor also has a fixed weekday morning-discount tier ending at 14:00
            // (BookingService.calculatePadelOutdoorPrice's 4-tier split); the carry-over tier
            // must end before it or the tiered price split sees non-ascending boundaries.
            if (isPadelOutdoor && !nightRateEndTime.isBefore(PADEL_OUTDOOR_MORNING_END)) {
                throw new IllegalArgumentException("Pentru Padel outdoor, ora de final a nocturnei trebuie să fie înainte de 14:00.");
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
        if (nightRateEndTime != null) court.setNightRateEndTime(nightRateEndTime);
        return courtRepository.save(court);
    }
}

