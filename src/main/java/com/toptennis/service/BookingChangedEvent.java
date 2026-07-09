package com.toptennis.service;

import com.toptennis.model.Booking;
import com.toptennis.model.BookingStatus;

import java.time.LocalDate;
import java.time.LocalTime;

public record BookingChangedEvent(
        Type type,
        Long bookingId,
        Long courtId,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        BookingStatus status
) {
    public enum Type { CREATED, UPDATED, CANCELLED, BULK_REFRESH }

    public static BookingChangedEvent of(Type type, Booking b) {
        return new BookingChangedEvent(
                type,
                b.getId(),
                b.getCourt() != null ? b.getCourt().getId() : null,
                b.getBookingDate(),
                b.getStartTime(),
                b.getEndTime(),
                b.getStatus()
        );
    }
}
