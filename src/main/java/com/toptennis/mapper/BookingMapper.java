package com.toptennis.mapper;

import com.toptennis.dto.BookingDto;
import com.toptennis.dto.CourtDto;
import com.toptennis.model.Booking;

public class BookingMapper {
    public static BookingDto toDto(Booking b) {
        BookingDto dto = new BookingDto();
        CourtDto courtDto = CourtMapper.toDto(b.getCourt());
        dto.id = b.getId();
        dto.court = courtDto;
        dto.bookingDate = b.getBookingDate();
        dto.startTime = b.getStartTime();
        dto.endTime = b.getEndTime();
        dto.customerName = b.getCustomerName();
        dto.customerPhone = b.getCustomerPhone();
        dto.customerEmail = b.getCustomerEmail();
        dto.status = b.getStatus();
        dto.createdAt = b.getCreatedAt();
        dto.updatedAt = b.getUpdatedAt();
        dto.price = b.getPrice();
        return dto;
    }
}

