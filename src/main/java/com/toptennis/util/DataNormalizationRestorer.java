package com.toptennis.util;

import com.toptennis.model.Booking;
import com.toptennis.model.PlayerUser;
import com.toptennis.repository.BookingRepository;
import com.toptennis.repository.PlayerUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

// @Component
public class DataNormalizationRestorer implements CommandLineRunner {

    private final PlayerUserRepository playerUserRepository;
    private final BookingRepository bookingRepository;

    public DataNormalizationRestorer(PlayerUserRepository playerUserRepository, BookingRepository bookingRepository) {
        this.playerUserRepository = playerUserRepository;
        this.bookingRepository = bookingRepository;
    }

    @Override
    public void run(String... args) {
        System.out.println("Starting phone number normalization cleanup...");
        
        normalizePlayers();
        normalizeBookings();
        
        System.out.println("Phone number normalization cleanup complete.");
    }

    private void normalizePlayers() {
        List<PlayerUser> players = playerUserRepository.findAll();
        for (PlayerUser player : players) {
            if (player.getPhoneNumber() != null) {
                String normalized = normalize(player.getPhoneNumber());
                if (!normalized.equals(player.getPhoneNumber())) {
                    System.out.println("Normalizing Player: " + player.getPhoneNumber() + " -> " + normalized);
                    player.setPhoneNumber(normalized);
                    playerUserRepository.save(player);
                }
            }
        }
    }

    private void normalizeBookings() {
        List<Booking> bookings = bookingRepository.findAll();
        for (Booking booking : bookings) {
            if (booking.getCustomerPhone() != null) {
                String normalized = normalize(booking.getCustomerPhone());
                if (!normalized.equals(booking.getCustomerPhone())) {
                    System.out.println("Normalizing Booking " + booking.getId() + ": " + booking.getCustomerPhone() + " -> " + normalized);
                    booking.setCustomerPhone(normalized);
                    bookingRepository.save(booking);
                }
            }
        }
    }

    private String normalize(String phone) {
        if (phone == null) return null;
        String stripped = phone.replaceAll("[^0-9+]", "");
        if (stripped.startsWith("+40")) stripped = stripped.substring(3);
        else if (stripped.startsWith("+4")) stripped = stripped.substring(2);
        else if (stripped.startsWith("40") && stripped.length() >= 11) stripped = stripped.substring(2);
        else if (stripped.startsWith("0040")) stripped = stripped.substring(4);
        
        if (stripped.startsWith("7") && stripped.length() == 9) {
            stripped = "0" + stripped;
        }
        return stripped;
    }
}
