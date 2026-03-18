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
    @Size(min = 2, max = 50)
    @Pattern(regexp="^[^<>%$]+$", message="Numele conține caractere invalide")
    public String customerName;

    @NotBlank
    @Pattern(regexp="^\\+?[0-9\\s]{9,15}$", message="Număr de telefon invalid")
    public String customerPhone;

    @Email
    public String customerEmail;
}

