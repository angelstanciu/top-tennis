package com.toptennis.sms;

import com.toptennis.config.SmsProperties;
import com.toptennis.dto.SmsSendResult;
import com.toptennis.model.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
public class SmsService {
    private static final Logger log = LoggerFactory.getLogger(SmsService.class);
    private static final Pattern CMGS_ID = Pattern.compile("\\+CMGS:\\s*(\\d+)");
    private final AtSerialClient client;
    private final SmsProperties props;
    private final ReentrantLock sendLock = new ReentrantLock(true);

    public SmsService(AtSerialClient client, SmsProperties props) {
        this.client = client;
        this.props = props;
    }

    public SmsSendResult sendSms(String toE164, String text) {
        sendLock.lock();
        StringBuilder transcript = new StringBuilder();
        try {
            return sendSmsInternal(toE164, text, transcript, true);
        } catch (SmsException ex) {
            log.warn("SMS send failed.", ex);
            SmsSendResult result = new SmsSendResult();
            String extra = ex.getTranscript();
            if (extra != null && !extra.isEmpty()) {
                transcript.append(extra);
            } else if (transcript.length() == 0 && ex.getMessage() != null) {
                transcript.append(ex.getMessage());
            }
            result.success = false;
            result.transcript = transcript.toString();
            return result;
        } finally {
            sendLock.unlock();
        }
    }

    public void sendReservationNotifications(Booking booking) {
        if (booking == null) {
            return;
        }
        String customerNumber = booking.getCustomerPhone();
        if (customerNumber != null && !customerNumber.isBlank()) {
            String customerText = buildCustomerMessage(booking);
            SmsSendResult customerResult = sendSms(customerNumber, customerText);
            if (!customerResult.success) {
                log.warn("Failed to send customer SMS. Transcript: {}", customerResult.transcript);
            } else {
                log.info("Customer SMS delivered for {} ({}) court={} interval={} - {} date={} price={} text=\"{}\"",
                        safe(booking.getCustomerName()),
                        customerNumber,
                        booking.getCourt() != null ? booking.getCourt().getName() : "teren",
                        formatTime(booking.getStartTime()),
                        formatTime(booking.getEndTime()),
                        formatDate(booking.getBookingDate()),
                        formatPrice(booking.getPrice()),
                        customerText);
            }
        } else {
            log.warn("Customer phone is missing; SMS not sent.");
        }

        String clubNumber = props.getClubNumber();
        if (clubNumber != null && !clubNumber.isBlank()) {
            sleepBetweenMessages();
            String ownerText = buildOwnerMessage(booking);
            SmsSendResult ownerResult = sendSms(clubNumber, ownerText);
            if (!ownerResult.success) {
                log.warn("Failed to send owner SMS. Transcript: {}", ownerResult.transcript);
            } else {
                log.info("Club SMS delivered for {} ({}) court={} interval={} - {} date={} price={} text=\"{}\"",
                        safe(booking.getCustomerName()),
                        customerNumber,
                        booking.getCourt() != null ? booking.getCourt().getName() : "teren",
                        formatTime(booking.getStartTime()),
                        formatTime(booking.getEndTime()),
                        formatDate(booking.getBookingDate()),
                        formatPrice(booking.getPrice()),
                        ownerText);
            }
        } else {
            log.warn("Club SMS number is not configured; SMS not sent.");
        }
    }

    private String executeAtWithReconnect(Duration cmdTimeout) {
        String resp;
        try {
            resp = client.execute("AT", doneOkOrError(), cmdTimeout);
        } catch (SmsException ex) {
            client.reconnect();
            resp = client.execute("AT", doneOkOrError(), cmdTimeout);
            if (!resp.contains("OK")) {
                throw new SmsException("Modem did not respond with OK to AT.", resp, ex);
            }
            return resp;
        }
        if (resp.contains("OK")) {
            return resp;
        }
        client.reconnect();
        resp = client.execute("AT", doneOkOrError(), cmdTimeout);
        if (!resp.contains("OK")) {
            throw new SmsException("Modem did not respond with OK to AT.", resp);
        }
        return resp;
    }

    private boolean hasErrorLine(String s) {
        return s.contains("+CMS ERROR") || s.contains("+CME ERROR") || s.contains("ERROR");
    }

    private SmsSendResult sendSmsInternal(String toE164, String text, StringBuilder transcript, boolean allowRetry) {
        if (text != null && text.length() > 160) {
            log.warn("SMS length is {} characters; modem/network may truncate.", text.length());
        }

        Duration cmdTimeout = Duration.ofMillis(props.getCommandTimeoutMs());
        Duration sendTimeout = Duration.ofMillis(props.getSendTimeoutMs());

        transcript.append(executeAtWithReconnect(cmdTimeout));
        String cmgfResp = client.execute("AT+CMGF=1", doneOkOrError(), cmdTimeout);
        transcript.append(cmgfResp);
        if (hasErrorLine(cmgfResp)) {
            return failResult(transcript.toString());
        }

        String cmgsResp = client.execute("AT+CMGS=\"" + toE164 + "\"", donePromptOrError(), cmdTimeout);
        transcript.append(cmgsResp);
        if (hasErrorLine(cmgsResp)) {
            return failResult(transcript.toString());
        }
        transcript.append(client.waitForPrompt('>', cmdTimeout));

        byte[] messageBytes = (text + (char) 0x1A).getBytes(StandardCharsets.UTF_8);
        client.writeRaw(messageBytes);

        String finalResp = client.readResponse(doneOkOrError(), sendTimeout);
        transcript.append(finalResp);

        if (hasErrorLine(transcript.toString())) {
            if (allowRetry) {
                attemptSoftReset(transcript, cmdTimeout);
                transcript.append("\nRETRY\n");
                return sendSmsInternal(toE164, text, transcript, false);
            }
            return failResult(transcript.toString());
        }
        if (!(finalResp.contains("OK") || finalResp.contains("+CMGS:"))) {
            if (allowRetry) {
                attemptSoftReset(transcript, cmdTimeout);
                transcript.append("\nRETRY\n");
                return sendSmsInternal(toE164, text, transcript, false);
            }
            return failResult(transcript.toString());
        }
        SmsSendResult result = new SmsSendResult();
        result.transcript = transcript.toString();
        Matcher m = CMGS_ID.matcher(result.transcript);
        if (m.find()) {
            result.messageId = m.group(1);
        }
        result.success = true;
        log.info("SMS sent to {} messageId={} text=\"{}\"", toE164, result.messageId, text);
        return result;
    }

    private SmsSendResult failResult(String transcript) {
        SmsSendResult result = new SmsSendResult();
        result.success = false;
        result.transcript = transcript;
        return result;
    }

    private void attemptSoftReset(StringBuilder transcript, Duration cmdTimeout) {
        try {
            transcript.append(client.execute("ATZ", doneOkOrError(), cmdTimeout));
            transcript.append(client.execute("AT", doneOkOrError(), cmdTimeout));
        } catch (SmsException ex) {
            transcript.append(ex.getTranscript() != null ? ex.getTranscript() : ex.getMessage());
        }
    }

    private void sleepBetweenMessages() {
        try {
            Thread.sleep(5000L);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private String buildCustomerMessage(Booking booking) {
        String start = formatTime(booking.getStartTime());
        String end = formatTime(booking.getEndTime());
        String date = formatDate(booking.getBookingDate());
        String price = formatPrice(booking.getPrice());
        return "Rezervarea dumneavoastra a fost efectuata cu succes pentru intervalul " + start + " - " + end +
                " in data de " + date + ". Veti avea de achitat suma de " + price + " RON.";
    }

    private String buildOwnerMessage(Booking booking) {
        String start = formatTime(booking.getStartTime());
        String end = formatTime(booking.getEndTime());
        String date = formatDateDashed(booking.getBookingDate());
        String customer = booking.getCustomerName() == null ? "Client" : booking.getCustomerName();
        String customerPhone = booking.getCustomerPhone() == null ? "" : booking.getCustomerPhone();
        String court = booking.getCourt() != null ? booking.getCourt().getName() : "teren";
        String sport = booking.getCourt() != null && booking.getCourt().getSportType() != null
                ? booking.getCourt().getSportType().name()
                : "";
        String courtNumber = extractCourtNumber(court);
        String sportLabel = mapSportLabel(sport);
        return "Aveti o rezervare noua:\n\n" +
                "Sport: " + sportLabel + "\n" +
                "Teren: " + courtNumber + "\n" +
                "Data: " + date + "\n" +
                "Interval rezervat: " + start + " - " + end + "\n" +
                "Client: " + customer + " / " + customerPhone;
    }

    private String formatDate(LocalDate date) {
        if (date == null) {
            return "";
        }
        return date.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
    }

    private String formatDateDashed(LocalDate date) {
        if (date == null) {
            return "";
        }
        return date.format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
    }

    private String formatTime(LocalTime time) {
        if (time == null) {
            return "";
        }
        if (time.getHour() == 23 && time.getMinute() == 59) {
            return "24:00";
        }
        return time.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) {
            return "0";
        }
        return price.stripTrailingZeros().toPlainString();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "Client" : value;
    }

    private String extractCourtNumber(String courtName) {
        if (courtName == null) {
            return "";
        }
        String trimmed = courtName.trim();
        if (trimmed.toLowerCase().startsWith("teren")) {
            String rest = trimmed.substring(5).trim();
            return rest.isEmpty() ? trimmed : rest;
        }
        return trimmed;
    }

    private String mapSportLabel(String sport) {
        switch (sport) {
            case "TENNIS":
                return "Tenis";
            case "PADEL":
                return "Padel";
            case "BEACH_VOLLEY":
                return "Volei pe plaja";
            case "BASKETBALL":
                return "Baschet";
            case "FOOTVOLLEY":
                return "Tenis de picior";
            case "TABLE_TENNIS":
                return "Tenis de masa";
            default:
                return sport == null ? "" : sport;
        }
    }

    private java.util.function.Predicate<String> doneOkOrError() {
        return s -> s.contains("OK") || hasErrorLine(s);
    }

    private java.util.function.Predicate<String> donePromptOrError() {
        return s -> s.contains(">") || hasErrorLine(s);
    }

}
