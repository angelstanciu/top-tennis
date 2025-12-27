package com.toptennis.dto;

import jakarta.validation.constraints.NotBlank;

public class SmsSendRequest {
    @NotBlank
    public String to;

    @NotBlank
    public String text;
}
