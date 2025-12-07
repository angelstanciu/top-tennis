package com.toptennis.mapper;

import com.toptennis.dto.CourtDto;
import com.toptennis.model.Court;

public class CourtMapper {
    public static CourtDto toDto(Court c) {
        CourtDto dto = new CourtDto();
        dto.id = c.getId();
        dto.name = c.getName();
        dto.sportType = c.getSportType();
        dto.indoor = c.isIndoor();
        dto.heated = c.isHeated();
        dto.lighting = c.isLighting();
        dto.surface = c.getSurface();
        dto.notes = c.getNotes();
        dto.pricePerHour = c.getPricePerHour();
        dto.openTime = c.getOpenTime();
        dto.closeTime = c.getCloseTime();
        return dto;
    }
}

