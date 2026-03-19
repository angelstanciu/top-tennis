package com.toptennis.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import java.util.Map;
import com.toptennis.service.NetopiaService;
import com.toptennis.service.BookingService;
import com.toptennis.model.Booking;

@RestController
@RequestMapping("/api/payments/netopia")
public class NetopiaController {

    private final NetopiaService netopiaService;
    private final BookingService bookingService;

    public NetopiaController(NetopiaService netopiaService, BookingService bookingService) {
        this.netopiaService = netopiaService;
        this.bookingService = bookingService;
    }

    @PostMapping("/initiate/{bookingId}")
    public NetopiaService.PaymentPayload initiate(@PathVariable Long bookingId) {
        Booking booking = bookingService.get(bookingId);
        // TODO: security check that the user calling this owns the booking
        return netopiaService.generatePaymentPayload(booking);
    }

    /**
     * Endpoint where Netopia redirects the user after a successful/failed payment interaction.
     * This is just a visual return URL, not the secure server-to-server confirmation.
     */
    @GetMapping("/return")
    public ResponseEntity<String> handleReturn(@RequestParam Map<String, String> params) {
        // Typically reads 'orderId' or 'status' from the URL to display a success or failure HTML page
        // Alternatively, this can redirect the user back to the React app: /rezerva/succes
        System.out.println("Return hit: " + params);
        return ResponseEntity.status(302).header("Location", "https://star-arena.ro/rezerva").build();
    }

    /**
     * The secure Webhook (IPN - Instant Payment Notification) called by Netopia's servers in the background.
     * This carries the encrypted signature confirming if the money was actually captured.
     */
    @PostMapping(value = "/ipn", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> handleIpn(@RequestParam Map<String, String> payload) {
        String envKey = payload.get("env_key");
        String data = payload.get("data");
        
        System.out.println("Netopia IPN Webhook Hit! EnvKey: " + (envKey != null ? "Yes" : "No"));
        
        // 1. Decrypt data using the Private.key
        // 2. Parse XML/JSON to get the actual status (confirmed, failed, pending) and the original order ID
        // 3. Find Booking by ID
        // 4. If status == confirmed -> set booking.paymentStatus = PAID, booking.status = CONFIRMED
        // 5. Respond with <crc>XML</crc> as per Netopia's requirement
        
        return ResponseEntity.ok("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<crc>success</crc>");
    }
}
