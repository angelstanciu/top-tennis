package com.toptennis.sms;

public class SmsException extends RuntimeException {
    private final String transcript;

    public SmsException(String message) { super(message); this.transcript = null; }
    public SmsException(String message, Throwable cause) { super(message, cause); this.transcript = null; }
    public SmsException(String message, String transcript) { super(message); this.transcript = transcript; }
    public SmsException(String message, String transcript, Throwable cause) { super(message, cause); this.transcript = transcript; }

    public String getTranscript() { return transcript; }
}
