package com.toptennis.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.BAD_REQUEST.value();
        err.error = HttpStatus.BAD_REQUEST.getReasonPhrase();
        err.message = "Validare eșuată";
        err.path = req.getRequestURI();
        err.details = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraint(ConstraintViolationException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.BAD_REQUEST.value();
        err.error = HttpStatus.BAD_REQUEST.getReasonPhrase();
        err.message = "Eroare de validare";
        err.path = req.getRequestURI();
        err.details = ex.getConstraintViolations().stream().map(v -> v.getPropertyPath()+": "+v.getMessage()).toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.BAD_REQUEST.value();
        err.error = HttpStatus.BAD_REQUEST.getReasonPhrase();
        err.message = ex.getMessage();
        err.path = req.getRequestURI();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = ex.getStatusCode().value();
        err.error = "Eroare HTTP " + err.status;
        err.message = ex.getReason();
        err.path = req.getRequestURI();
        return ResponseEntity.status(ex.getStatusCode()).body(err);
    }

    // SQL unique constraint violation – return a clean 409 instead of raw SQL error
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.CONFLICT.value();
        err.error = "Conflict";
        err.path = req.getRequestURI();

        String cause = ex.getMessage() != null ? ex.getMessage().toUpperCase() : "";
        if (cause.contains("PHONE_NUMBER")) {
            err.message = "Acest număr de telefon aparține deja unui alt cont. Dacă vă aparține, apăsați pe butonul 'Revendică' pentru a-l transfera prin validare SMS.";
        } else if (cause.contains("EMAIL")) {
            err.message = "Această adresă de email este deja asociată altui cont.";
        } else {
            err.message = "O constrângere de unicitate a fost violată. Datele introduse există deja.";
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(err);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.INTERNAL_SERVER_ERROR.value();
        err.error = HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase();
        err.message = ex.getMessage();
        err.path = req.getRequestURI();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
    }
}

