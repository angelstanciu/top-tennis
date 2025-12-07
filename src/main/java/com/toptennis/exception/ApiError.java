package com.toptennis.exception;

import java.time.Instant;
import java.util.List;

public class ApiError {
    public Instant timestamp = Instant.now();
    public int status;
    public String error;
    public String message;
    public String path;
    public List<String> details;
}

