package com.toptennis.controller;

import com.toptennis.dto.CourtDto;
import com.toptennis.mapper.CourtMapper;
import com.toptennis.service.CourtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/admin/courts")
public class AdminCourtController {
    private final CourtService courtService;

    public AdminCourtController(CourtService courtService) {
        this.courtService = courtService;
    }

    public record UpdateCourtHoursRequest(
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime openTime,
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime closeTime,
            boolean lighting,
            @NotNull @DecimalMin("0") BigDecimal pricePerHour,
            @NotNull @DecimalMin("0") BigDecimal nightPrice,
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime nightRateStartTime,
            @NotNull @DecimalMin("0") BigDecimal morningPrice,
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime nightRateEndTime) {}

    @PatchMapping("/{id}")
    public CourtDto updateHours(@PathVariable Long id, @RequestBody @Valid UpdateCourtHoursRequest req) {
        try {
            return CourtMapper.toDto(courtService.updateHours(id, req.openTime(), req.closeTime(), req.lighting(),
                    req.pricePerHour(), req.nightPrice(), req.nightRateStartTime(), req.morningPrice(), req.nightRateEndTime()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }
}
