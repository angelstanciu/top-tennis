package com.toptennis.dto;

import com.toptennis.model.SportType;
import java.math.BigDecimal;
import java.time.LocalTime;

public class CourtDto {
    public Long id;
    public String name;
    public SportType sportType;
    public boolean indoor;
    public boolean heated;
    public boolean lighting;
    public String surface;
    public String notes;
    public BigDecimal pricePerHour;
    public LocalTime openTime;
    public LocalTime closeTime;
}

