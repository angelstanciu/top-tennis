package com.toptennis.service;

import com.toptennis.dto.AvailabilityDto;
import com.toptennis.model.Booking;
import com.toptennis.model.Court;
import com.toptennis.model.SportType;
import com.toptennis.repository.BookingRepository;
import com.toptennis.model.PlayerUser;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class AvailabilityService {
    private final CourtService courtService;
    private final BookingRepository bookingRepository;
    private final PlayerAuthService playerAuthService;

    public AvailabilityService(CourtService courtService, BookingRepository bookingRepository, PlayerAuthService playerAuthService) {
        this.courtService = courtService;
        this.bookingRepository = bookingRepository;
        this.playerAuthService = playerAuthService;
    }

    public List<AvailabilityDto> getAvailability(SportType sportType, LocalDate date) {
        boolean isAdmin = false;
        PlayerUser currentUser = null;
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String auth = request.getHeader("Authorization");
                if (auth != null && auth.startsWith("Bearer ")) {
                    currentUser = playerAuthService.getUserByToken(auth).orElse(null);
                }
                
                org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                    isAdmin = true;
                }
            }
        } catch (Exception e) {}

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
                boolean isOwner = currentUser != null && b.getPlayerUser() != null && b.getPlayerUser().getId().equals(currentUser.getId());
                boolean canViewPii = isAdmin || isOwner || b.getStatus() == com.toptennis.model.BookingStatus.BLOCKED;
                tr.customerName = canViewPii ? b.getCustomerName() : "Ocupat";
                if (b.getPlayerUser() != null) {
                    tr.playerMatchesCount = b.getPlayerUser().getMatchesPlayed();
                }
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
