package com.toptennis.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.toptennis.model.PlayerUser;
import com.toptennis.repository.PlayerUserRepository;
import com.toptennis.repository.BookingRepository;
import com.toptennis.model.Booking;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@org.springframework.transaction.annotation.Transactional
public class PlayerAuthService {

    private final PlayerUserRepository playerUserRepository;
    private final BookingRepository bookingRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Value("${google.auth.client-id}")
    private String googleClientId;
    
    // Simplu cache in memorie pentru OTP si Token-uri (Doar pentru MVP)
    private final Map<String, String> phoneToOtp = new ConcurrentHashMap<>();
    private final Map<String, Long> tokenToPlayerId = new ConcurrentHashMap<>();

    public PlayerAuthService(PlayerUserRepository playerUserRepository, BookingRepository bookingRepository, PasswordEncoder passwordEncoder) {
        this.playerUserRepository = playerUserRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void requestOtp(String phone) {
        String normalized = normalizePhone(phone);
        String otp = "123456"; // Hardcodat pentru ușurința testării frontend / MVP
        phoneToOtp.put(normalized, otp);
        // OTP logging removed for privacy/cleanliness in production-like logs
    }

    public String verifyOtp(String phone, String otp) {
        String normalized = normalizePhone(phone);
        String savedOtp = phoneToOtp.get(normalized);
        boolean isTestOtp = "123456".equals(otp);

        if (!isTestOtp && (savedOtp == null || !savedOtp.equals(otp))) {
            throw new IllegalArgumentException("Cod OTP invalid sau expirat.");
        }
        
        // Curatam OTP-ul folosit
        phoneToOtp.remove(normalized);

        // Gasim sau cream utilizatorul (fara nume si email pentru moment, se vor completa dupa)
        PlayerUser user = playerUserRepository.findByPhoneNumber(normalized)
            .orElseGet(() -> {
                PlayerUser newUser = new PlayerUser();
                newUser.setPhoneNumber(normalized);
                newUser.setFullName("Jucător Nou");
                newUser.setCreatedAt(LocalDateTime.now());
                newUser.setUpdatedAt(LocalDateTime.now());
                return playerUserRepository.save(newUser);
            });

        // Generam un Session Token (UUID) valabil in memorie cat timp traieste instanta
        String token = UUID.randomUUID().toString();
        tokenToPlayerId.put(token, user.getId());
        
        return token;
    }

    public String register(String phone, String password, String fullName) {
        String normalized = normalizePhone(phone);
        if (playerUserRepository.findByPhoneNumber(normalized).isPresent()) {
            throw new IllegalArgumentException("Numărul de telefon este deja înregistrat.");
        }
        PlayerUser user = new PlayerUser();
        user.setPhoneNumber(normalized);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName != null ? fullName : "Jucător Nou");
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user = playerUserRepository.save(user);
        
        String token = UUID.randomUUID().toString();
        tokenToPlayerId.put(token, user.getId());
        return token;
    }

    public String login(String phone, String password) {
        PlayerUser user = playerUserRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new IllegalArgumentException("Utilizator negăsit."));
        
        if (user.getPassword() == null) {
            throw new IllegalArgumentException("Contul nu are parolă. Folosește autentificarea prin SMS.");
        }
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Parolă incorectă.");
        }

        String token = UUID.randomUUID().toString();
        tokenToPlayerId.put(token, user.getId());
        return token;
    }

    public Optional<PlayerUser> getUserByToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) return Optional.empty();
        String actualToken = token.substring(7);
        Long playerId = tokenToPlayerId.get(actualToken);
        if (playerId == null) return Optional.empty();
        
        return playerUserRepository.findById(playerId).map(user -> {
            // Migreaza on-the-fly numarul de telefon catre formatul normalizat daca e nevoie
            if (user.getPhoneNumber() != null) {
                String normalized = normalizePhone(user.getPhoneNumber());
                if (!normalized.equals(user.getPhoneNumber())) {
                    user.setPhoneNumber(normalized);
                    playerUserRepository.save(user);
                }
            }
            return user;
        });
    }

    public PlayerUser updateProfile(Long playerId, String fullName, String email, String phoneNumber, String preferredSport, Integer age, String gender, String avatarUrl) {
        PlayerUser user = playerUserRepository.findById(playerId).orElseThrow();
        
        // If updating phone, check for duplicates
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            String normalized = normalizePhone(phoneNumber);
            if (user.getPhoneNumber() == null || !user.getPhoneNumber().equals(normalized)) {
                if (playerUserRepository.findByPhoneNumber(normalized).isPresent()) {
                    throw new IllegalArgumentException("Acest număr de telefon este deja folosit de un alt cont.");
                }
                user.setPhoneNumber(normalized);
            }
        }

        if (fullName != null && !fullName.isBlank()) user.setFullName(fullName);
        if (email != null) user.setEmail(email);
        if (age != null) user.setAge(age);
        if (gender != null) user.setGender(gender);
        if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
        if (preferredSport != null) {
            try {
                user.setPreferredSport(com.toptennis.model.SportType.valueOf(preferredSport));
            } catch (Exception ignored) {}
        }
        user.setUpdatedAt(LocalDateTime.now());
        return playerUserRepository.save(user);
    }

    public String loginOrRegisterWithGoogle(String credential) throws GeneralSecurityException, IOException {
        String email, name, pictureUrl;

        // Check if it's a JWT (ID Token) or an Access Token
        if (credential.contains(".") && credential.split("\\.").length == 3) {
            // Standard JWT flow
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken == null) throw new IllegalArgumentException("ID Token invalid.");

            GoogleIdToken.Payload payload = idToken.getPayload();
            email = payload.getEmail();
            name = (String) payload.get("name");
            pictureUrl = (String) payload.get("picture");
        } else {
            // Access Token flow (called from custom useGoogleLogin buttons)
            // We verify by calling https://www.googleapis.com/oauth2/v3/userinfo
            try {
                org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                String url = "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + credential;
                Map<String, Object> userInfo = restTemplate.getForObject(url, Map.class);
                
                if (userInfo == null || !userInfo.containsKey("email")) {
                    throw new IllegalArgumentException("Google Access Token invalid sau expirat.");
                }
                
                email = (String) userInfo.get("email");
                name = (String) userInfo.get("name");
                pictureUrl = (String) userInfo.get("picture");
            } catch (Exception e) {
                throw new IllegalArgumentException("Eroare la verificarea token-ului Google: " + e.getMessage());
            }
        }

        PlayerUser user = playerUserRepository.findByEmail(email)
                .orElseGet(() -> {
                    PlayerUser newUser = new PlayerUser();
                    newUser.setEmail(email);
                    newUser.setFullName(name != null ? name : "Jucător Google");
                    newUser.setAvatarUrl(pictureUrl);
                    newUser.setCreatedAt(LocalDateTime.now());
                    newUser.setUpdatedAt(LocalDateTime.now());
                    return playerUserRepository.save(newUser);
                });

        // Update avatar if changed
        if (pictureUrl != null && (user.getAvatarUrl() == null || !user.getAvatarUrl().equals(pictureUrl))) {
            user.setAvatarUrl(pictureUrl);
            playerUserRepository.save(user);
        }

        String token = UUID.randomUUID().toString();
        tokenToPlayerId.put(token, user.getId());
        return token;
    }

    public String loginOrRegisterWithFacebook(String accessToken) {
        // In productie aici am apela https://graph.facebook.com/me?fields=id,name,email,picture&access_token=...
        // Pentru MVP/Demo, simulam succesul daca primim un token ne-vid
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("Facebook Access Token invalid.");
        }

        // Mocking Facebook response (In reality, use RestTemplate to fetch user info)
        String mockEmail = "facebook_user_" + accessToken.substring(0, Math.min(accessToken.length(), 5)) + "@example.com";
        String mockName = "Utilizator Facebook";
        String mockPicture = "https://graph.facebook.com/v12.0/me/picture?access_token=" + accessToken;

        PlayerUser user = playerUserRepository.findByEmail(mockEmail)
                .orElseGet(() -> {
                    PlayerUser newUser = new PlayerUser();
                    newUser.setEmail(mockEmail);
                    newUser.setFullName(mockName);
                    newUser.setAvatarUrl(mockPicture);
                    newUser.setCreatedAt(LocalDateTime.now());
                    newUser.setUpdatedAt(LocalDateTime.now());
                    return playerUserRepository.save(newUser);
                });

        String token = UUID.randomUUID().toString();
        tokenToPlayerId.put(token, user.getId());
        return token;
    }

    public PlayerUser linkPhoneNumber(Long currentPlayerId, String phone, String otp) {
        String normPhone = normalizePhone(phone);
        // 1. Verify OTP
        String storedOtp = phoneToOtp.get(normPhone);
        boolean isTestOtp = "123456".equals(otp);

        if (!isTestOtp && (storedOtp == null || !storedOtp.equals(otp))) {
            throw new IllegalArgumentException("Codul OTP este invalid sau a expirat.");
        }
        phoneToOtp.remove(normPhone);

        // 2. Find current user
        PlayerUser currentUser = playerUserRepository.findById(currentPlayerId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizatorul curent nu a fost găsit."));

        // 3. Find if another user has this phone
        Optional<PlayerUser> existingUser = playerUserRepository.findByPhoneNumber(normPhone);
        if (existingUser.isPresent()) {
            PlayerUser otherUser = existingUser.get();
            if (!otherUser.getId().equals(currentPlayerId)) {
                // Transfer bookings from old ghost account to the current account
                java.util.List<Booking> oldBookings = bookingRepository.findByPlayerUserIdOrderByBookingDateDesc(otherUser.getId());
                for (Booking b : oldBookings) {
                    b.setPlayerUser(currentUser);
                    bookingRepository.save(b);
                }
                bookingRepository.flush();
                
                // Soft-Unlink: Instead of deleting (which might fail due to FKs), 
                // we set a unique dummy phone number or null to free the constraint.
                // Using a unique "UNLINKED_" prefix to ensure no overlaps even if multiple are unlinked.
                otherUser.setPhoneNumber("UNLINKED_" + java.util.UUID.randomUUID().toString().substring(0, 8));
                playerUserRepository.saveAndFlush(otherUser);
                
                System.out.println("[CLAIM] Soft-unlinked old user ID " + otherUser.getId() + " and transferred " + oldBookings.size() + " bookings.");
            }
        }

        // 4. Update current user
        currentUser.setPhoneNumber(normPhone);
        currentUser.setUpdatedAt(LocalDateTime.now());
        return playerUserRepository.save(currentUser);
    }

    private String normalizePhone(String phone) {
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
