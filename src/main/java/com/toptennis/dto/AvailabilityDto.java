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
        public String customerName; // optional, only for booked slots
        public Integer playerMatchesCount;
        // Meci deschis (matchmaking): setate doar cand rezervarea are un meci OPEN atasat
        public Long openMatchId;
        public Integer openMatchSpotsLeft;
        public Boolean openMatchTakeover; // true = in ultimele 6h, o echipa completa poate prelua intervalul
    }
}

