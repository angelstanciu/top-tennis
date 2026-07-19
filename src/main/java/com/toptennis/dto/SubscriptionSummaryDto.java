package com.toptennis.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class SubscriptionSummaryDto {
    public String key;
    public CourtDto court;
    public LocalTime startTime;
    public LocalTime endTime;
    public String customerName;
    public String customerPhone;
    public BigDecimal pricePerSession;
    public int occurrences;
    public LocalDate nextDate;
    public LocalDate lastDate;
    public List<Long> bookingIds;
}
