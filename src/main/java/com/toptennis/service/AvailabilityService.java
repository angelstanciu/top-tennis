package com.toptennis.service;

import com.toptennis.dto.AvailabilityDto;
import com.toptennis.model.Booking;
import com.toptennis.model.Court;
import com.toptennis.model.SportType;
import com.toptennis.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AvailabilityService {
    private final CourtService courtService;
    private final BookingRepository bookingRepository;

    public AvailabilityService(CourtService courtService, BookingRepository bookingRepository) {
        this.courtService = courtService;
        this.bookingRepository = bookingRepository;
    }

    public List<AvailabilityDto> getAvailability(SportType sportType, LocalDate date) {
        List<Court> courts = courtService.listActive(sportType);
        List<AvailabilityDto> result = new ArrayList<>();
        for (Court court : courts) {
            List<Booking> bookings = bookingRepository
                    .findByCourtIdAndBookingDateOrderByStartTimeAsc(court.getId(), date)
                    .stream()
                    .filter(b -> b.getStatus() != com.toptennis.model.BookingStatus.CANCELLED)
                    .toList();
            AvailabilityDto dto = new AvailabilityDto();
            dto.court = com.toptennis.mapper.CourtMapper.toDto(court);
            dto.booked = new ArrayList<>();
            for (Booking b : bookings) {
                AvailabilityDto.TimeRangeDto tr = new AvailabilityDto.TimeRangeDto();
                tr.start = b.getStartTime().toString();
                tr.end = b.getEndTime().toString();
                tr.status = b.getStatus().name();
                tr.customerName = b.getCustomerName();
                dto.booked.add(tr);
            }
            dto.free = computeFreeSlots(java.time.LocalTime.MIN, java.time.LocalTime.of(23,59), bookings);
            result.add(dto);
        }
        return result;
    }

    private List<AvailabilityDto.TimeRangeDto> computeFreeSlots(LocalTime open, LocalTime close, List<Booking> bookings) {
        List<AvailabilityDto.TimeRangeDto> free = new ArrayList<>();
        LocalTime cursor = open;
        for (Booking b : bookings) {
            if (cursor.isBefore(b.getStartTime())) {
                addRange(free, cursor, b.getStartTime());
            }
            if (cursor.isBefore(b.getEndTime())) {
                cursor = b.getEndTime();
            }
        }
        if (cursor.isBefore(close)) {
            addRange(free, cursor, close);
        }
        return free;
    }

    private void addRange(List<AvailabilityDto.TimeRangeDto> list, LocalTime start, LocalTime end) {
        AvailabilityDto.TimeRangeDto tr = new AvailabilityDto.TimeRangeDto();
        tr.start = start.toString();
        tr.end = end.toString();
        tr.status = "FREE";
        list.add(tr);
    }
}
