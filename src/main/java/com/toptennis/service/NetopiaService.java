package com.toptennis.service;

import com.toptennis.model.Booking;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class NetopiaService {

    public NetopiaService() {}

    /**
     * Generates a unique transaction ID and prepares the payment payload.
     * Returns the encrypted data required for the POST redirect to secure.netopia-payments.com.
     */
    public PaymentPayload generatePaymentPayload(Booking booking) {
        // Generate a strict correlation ID
        String orderId = "BKG-" + booking.getId() + "-" + UUID.randomUUID().toString().substring(0, 8);
        booking.setTransactionId(orderId);
        
        // 1. Construct the Order XML (or JSON for v2)
        // "<order type=\"card\" id=\"" + orderId + "\" timestamp=\"" + timestamp + "\">..."
        
        // 2. Encrypt the Order payload using RC4
        // 3. Encrypt the RC4 key using RSA (the Netopia public.key)
        
        // Returning mock placeholders until keys are provided
        return new PaymentPayload("mock_env_key", "mock_encrypted_data", "https://sandboxsecure.mobilpay.ro");
    }

    public static class PaymentPayload {
        public String envKey;
        public String data;
        public String paymentUrl;

        public PaymentPayload(String envKey, String data, String paymentUrl) {
            this.envKey = envKey;
            this.data = data;
            this.paymentUrl = paymentUrl;
        }
    }
}
