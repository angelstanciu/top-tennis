package com.toptennis.dto;

import com.toptennis.model.BookingStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class BookingDto {
    public Long id;
    public CourtDto court;
    public LocalDate bookingDate;
    public LocalTime startTime;
    public LocalTime endTime;
    public String customerName;
    public String customerPhone;
    public String customerEmail;
    public BookingStatus status;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;
    public BigDecimal price;
}

