package com.toptennis.controller;

import com.toptennis.dto.SmsSendRequest;
import com.toptennis.dto.SmsSendResult;
import com.toptennis.sms.SmsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/sms")
public class SmsController {
    private final SmsService smsService;

    public SmsController(SmsService smsService) {
        this.smsService = smsService;
    }

    @PostMapping
    public SmsSendResult send(@RequestBody @Valid SmsSendRequest request) {
        return smsService.sendSms(request.to, request.text);
    }
}
