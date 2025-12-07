package com.toptennis.controller;

import com.toptennis.dto.CourtDto;
import com.toptennis.mapper.CourtMapper;
import com.toptennis.model.Court;
import com.toptennis.service.CourtService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/courts")
public class CourtController {
    private final CourtService courtService;

    public CourtController(CourtService courtService) {
        this.courtService = courtService;
    }

    @GetMapping
    public List<CourtDto> list() {
        return courtService.listActive(null).stream().map(CourtMapper::toDto).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public CourtDto get(@PathVariable Long id) {
        Court c = courtService.get(id);
        return CourtMapper.toDto(c);
    }
}

