package com.toptennis.dto;

import java.util.List;

public class AvailabilityDto {
    public CourtDto court;
    public List<TimeRangeDto> booked;
    public List<TimeRangeDto> free;

    public static class TimeRangeDto {
        public String start; // HH:mm
        public String end;   // HH:mm
        public String status; // optional label, e.g., BOOKED/BLOCKED
    }
}

