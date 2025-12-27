package com.toptennis.sms;

import com.fazecast.jSerialComm.SerialPort;
import com.toptennis.config.SmsProperties;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Predicate;

@Component
public class AtSerialClient {
    private final SmsProperties props;
    private final ReentrantLock ioLock = new ReentrantLock(true);
    private SerialPort port;
    private String lastTranscript;

    public AtSerialClient(SmsProperties props) {
        this.props = props;
    }

    public String execute(String command, Predicate<String> doneCondition, Duration timeout) {
        ioLock.lock();
        try {
            return executeOnce(command, doneCondition, timeout, true);
        } finally {
            ioLock.unlock();
        }
    }

    public String waitForPrompt(char promptChar, Duration timeout) {
        ioLock.lock();
        try {
            return waitForPromptOnce(promptChar, timeout, true);
        } finally {
            ioLock.unlock();
        }
    }

    public String readResponse(Predicate<String> doneCondition, Duration timeout) {
        ioLock.lock();
        try {
            return readResponseOnce(doneCondition, timeout, true);
        } finally {
            ioLock.unlock();
        }
    }

    public void writeRaw(byte[] bytes) {
        ioLock.lock();
        try {
            writeRawOnce(bytes, true);
        } catch (IOException e) {
            throw new SmsException("I/O error while writing to modem: " + e.getMessage(), null, e);
        } finally {
            ioLock.unlock();
        }
    }

    public void reconnect() {
        ioLock.lock();
        try {
            closeQuiet();
            ensureOpen();
        } finally {
            ioLock.unlock();
        }
    }

    private void ensureOpen() {
        if (port != null && port.isOpen()) {
            return;
        }
        Path portPath = Path.of(props.getPort());
        if (!Files.exists(portPath)) {
            throw new SmsPortException("SMS port not found: " + props.getPort() + ". Ensure the device is connected and the user is in the dialout group.");
        }
        SerialPort sp = SerialPort.getCommPort(props.getPort());
        sp.setComPortParameters(props.getBaud(), 8, SerialPort.ONE_STOP_BIT, SerialPort.NO_PARITY);
        sp.setFlowControl(SerialPort.FLOW_CONTROL_DISABLED);
        sp.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 500, 0);
        if (!sp.openPort()) {
            throw new SmsPortException("Cannot open " + props.getPort() + ". If permission is denied, add your user to the dialout group.");
        }
        sp.setDTR();
        sp.setRTS();
        sp.flushIOBuffers();
        port = sp;
    }

    private void closeQuiet() {
        if (port != null) {
            try {
                port.closePort();
            } catch (Exception ignored) {
            } finally {
                port = null;
            }
        }
    }

    private String executeOnce(String command, Predicate<String> doneCondition, Duration timeout, boolean allowRetry) {
        StringBuilder transcript = new StringBuilder();
        try {
            ensureOpen();
            writeLine(command);
            sleepInterCommand();
            readUntil(doneCondition, timeout, transcript);
            lastTranscript = transcript.toString();
            return lastTranscript;
        } catch (IOException e) {
            if (allowRetry) {
                reconnect();
                return executeOnce(command, doneCondition, timeout, false);
            }
            throw new SmsException("I/O error while executing AT command: " + e.getMessage(), transcript.toString(), e);
        }
    }

    private String waitForPromptOnce(char promptChar, Duration timeout, boolean allowRetry) {
        StringBuilder transcript = new StringBuilder();
        try {
            ensureOpen();
            if (lastTranscript != null && lastTranscript.indexOf(promptChar) >= 0) {
                return "";
            }
            readUntil(s -> s.indexOf(promptChar) >= 0, timeout, transcript);
            lastTranscript = transcript.toString();
            return lastTranscript;
        } catch (IOException e) {
            if (allowRetry) {
                reconnect();
                return waitForPromptOnce(promptChar, timeout, false);
            }
            throw new SmsException("I/O error while waiting for prompt: " + e.getMessage(), transcript.toString(), e);
        }
    }

    private String readResponseOnce(Predicate<String> doneCondition, Duration timeout, boolean allowRetry) {
        StringBuilder transcript = new StringBuilder();
        try {
            ensureOpen();
            readUntil(doneCondition, timeout, transcript);
            lastTranscript = transcript.toString();
            return lastTranscript;
        } catch (IOException e) {
            if (allowRetry) {
                reconnect();
                return readResponseOnce(doneCondition, timeout, false);
            }
            throw new SmsException("I/O error while reading modem response: " + e.getMessage(), transcript.toString(), e);
        }
    }

    private void writeRawOnce(byte[] bytes, boolean allowRetry) throws IOException {
        try {
            ensureOpen();
            OutputStream os = port.getOutputStream();
            os.write(bytes);
            os.flush();
        } catch (IOException e) {
            if (allowRetry) {
                reconnect();
                writeRawOnce(bytes, false);
                return;
            }
            throw e;
        }
    }

    private void writeLine(String command) throws IOException {
        OutputStream os = port.getOutputStream();
        os.write((command + "\r").getBytes(StandardCharsets.US_ASCII));
        os.flush();
    }

    private void readUntil(Predicate<String> doneCondition, Duration timeout, StringBuilder transcript) throws IOException {
        InputStream is = port.getInputStream();
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        byte[] buffer = new byte[256];
        StringBuilder raw = new StringBuilder();

        while (System.currentTimeMillis() < deadline) {
            int read = is.read(buffer);
            if (read <= 0) {
                continue;
            }
            String chunk = new String(buffer, 0, read, StandardCharsets.US_ASCII);
            transcript.append(chunk);
            raw.append(chunk);

            String normalized = normalize(raw.toString());
            if (doneCondition.test(normalized)) {
                return;
            }
        }
        throw new SmsException("Timed out waiting for modem response.", transcript.toString());
    }

    private String normalize(String s) {
        String cleaned = s.replace("\r", "\n");
        String[] lines = cleaned.split("\n");
        StringBuilder out = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                out.append(trimmed).append("\n");
            }
        }
        return out.toString();
    }

    private void sleepInterCommand() {
        try {
            Thread.sleep(props.getInterCommandDelayMs());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
