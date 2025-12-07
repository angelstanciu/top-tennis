package com.toptennis.dto;

import jakarta.validation.constraints.*;

public class CreateBookingRequest {
    @NotNull
    public Long courtId;

    @NotBlank
    public String date; // ISO yyyy-MM-dd

    @NotBlank
    public String startTime; // HH:mm

    @NotBlank
    public String endTime; // HH:mm

    @NotBlank
    @Size(min = 2, max = 100)
    public String customerName;

    @NotBlank
    @Size(min = 6, max = 30)
    public String customerPhone;

    @Email
    public String customerEmail;
}

