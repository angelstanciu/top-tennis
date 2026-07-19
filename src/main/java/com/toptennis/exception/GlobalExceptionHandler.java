package com.toptennis.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

    // A required @RequestParam was missing or blank (e.g. ?date= with no value) — Spring
    // converts an empty string to null before the null-check, surfacing as this exception
    // rather than a validation error. Map it to a clean 400 instead of the generic 500.
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParam(MissingServletRequestParameterException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.BAD_REQUEST.value();
        err.error = HttpStatus.BAD_REQUEST.getReasonPhrase();
        err.message = "Parametrul '" + ex.getParameterName() + "' este obligatoriu.";
        err.path = req.getRequestURI();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    // A @RequestParam was present but couldn't be converted to the target type (e.g. a
    // malformed date string). Same rationale as above — 400, not 500.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        ApiError err = new ApiError();
        err.status = HttpStatus.BAD_REQUEST.value();
        err.error = HttpStatus.BAD_REQUEST.getReasonPhrase();
        err.message = "Parametrul '" + ex.getName() + "' are un format invalid.";
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

    // Client disconnected mid-stream (e.g. GET /api/bookings/stream, browser tab closed).
    // The response is already unusable at this point — returning a body would only
    // trigger a second, noisier failure trying to write JSON onto a broken SSE stream.
    @ExceptionHandler(org.springframework.web.context.request.async.AsyncRequestNotUsableException.class)
    public void handleAsyncRequestNotUsable(org.springframework.web.context.request.async.AsyncRequestNotUsableException ex, HttpServletRequest req) {
        log.debug("Async client disconnected for URI {}", req.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Unhandled Exception (500) caught globally for URI {}: ", req.getRequestURI(), ex);
        ApiError err = new ApiError();
        err.status = HttpStatus.INTERNAL_SERVER_ERROR.value();
        err.error = HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase();
        err.message = "A apărut o eroare internă pe server. Te rugăm să încerci mai târziu.";
        err.path = req.getRequestURI();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
    }
}

