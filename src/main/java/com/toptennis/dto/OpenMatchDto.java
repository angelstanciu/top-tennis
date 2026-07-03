package com.toptennis.dto;

import java.util.List;

public class OpenMatchDto {
    public Long id;
    public String sportType;
    public String courtName;
    public boolean courtIndoor;
    public String date;        // yyyy-MM-dd
    public String startTime;   // HH:mm
    public String endTime;     // HH:mm
    public int targetLevelRank;
    public String targetLevelLabel;
    public String status;      // OPEN / FULL / CANCELLED
    public int totalSlots;
    public int groupSize;      // jucatorii organizatorului (inclusiv el)
    public int spotsLeft;
    public String organizerName;
    public String organizerPhone;   // doar pentru utilizatori autentificati
    public String organizerAvatar;
    public List<ParticipantDto> participants;
    public String bookingStatus;
    public boolean mine;    // apelantul este organizatorul
    public boolean joined;  // apelantul s-a alaturat deja

    public static class ParticipantDto {
        public String name;
        public String phone;    // doar pentru utilizatori autentificati
        public String avatarUrl;
    }
}
