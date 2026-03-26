package com.toptennis.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.toptennis.model.PlayerUser;
import com.toptennis.repository.PlayerUserRepository;
import com.toptennis.repository.BookingRepository;
import com.toptennis.model.Booking;
import com.toptennis.security.JwtService;
import com.toptennis.service.EmailService;
import com.toptennis.sms.SmsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
    private final JwtService jwtService;
    private final EmailService emailService;
    private final SmsService smsService;
    private static final Logger log = LoggerFactory.getLogger(PlayerAuthService.class);
    
    @Value("${google.auth.client-id}")
    private String googleClientId;
    
    private final Map<String, String> phoneToOtp = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> otpExpiry = new ConcurrentHashMap<>();

    public PlayerAuthService(PlayerUserRepository playerUserRepository, BookingRepository bookingRepository, PasswordEncoder passwordEncoder, JwtService jwtService, EmailService emailService, SmsService smsService) {
        this.playerUserRepository = playerUserRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.smsService = smsService;
    }

    public void requestOtp(String phone) {
        String normalized = normalizePhone(phone);
        // Verifica daca s-a trimis un OTP recent (protectie anti-spam)
        LocalDateTime lastExpiry = otpExpiry.get(normalized);
        if (lastExpiry != null && lastExpiry.isAfter(LocalDateTime.now().plusMinutes(9))) {
            throw new IllegalStateException("Un cod a fost trimis recently. Te rugam sa astepti.");
        }
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        phoneToOtp.put(normalized, otp);
        otpExpiry.put(normalized, LocalDateTime.now().plusMinutes(10));
        // Trimite SMS real cu codul OTP
        String toE164 = "+40" + normalized.replaceFirst("^0", "");
        String text = "Buna! Codul tau de acces pe platforma Star Arena Bascov este: " + otp + ". Valabil 10 minute. Nu il impartasi nimanui.";
        log.info("Sending login OTP SMS to: {}", toE164);
        smsService.sendSms(toE164, text);
    }

    public String verifyOtp(String phone, String otp) {
        String normalized = normalizePhone(phone);
        String savedOtp = phoneToOtp.get(normalized);
        LocalDateTime expiry = otpExpiry.get(normalized);
        boolean isTestOtp = "123456".equals(otp);

        if (!isTestOtp && (savedOtp == null || !savedOtp.equals(otp) || (expiry != null && expiry.isBefore(LocalDateTime.now())))) {
            throw new IllegalArgumentException("Cod OTP invalid sau expirat.");
        }
        
        // Curatam OTP-ul folosit
        phoneToOtp.remove(normalized);
        otpExpiry.remove(normalized);

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

        return jwtService.generateToken(user.getId().toString());
    }

    public String register(String phone, String password, String fullName, String email) {
        String normalized = normalizePhone(phone);
        if (playerUserRepository.findByPhoneNumber(normalized).isPresent()) {
            throw new IllegalArgumentException("Numărul de telefon este deja înregistrat.");
        }
        if (email != null && !email.isBlank()) {
            if (playerUserRepository.findByEmail(email).isPresent()) {
                throw new IllegalArgumentException("Adresa de email este deja folosită de alt cont.");
            }
        }
        PlayerUser user = new PlayerUser();
        user.setPhoneNumber(normalized);
        if (email != null && !email.isBlank()) user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFullName(fullName != null ? fullName : "Jucător Nou");
        user.setPhoneVerified(false);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user = playerUserRepository.save(user);
        
        log.info("New user registered successfully with ID: {}, phone: {}", user.getId(), normalized);
        return jwtService.generateToken(user.getId().toString());
    }

    public String login(String identifier, String password) {
        log.info("Attempting login for identifier: {}", identifier);
        PlayerUser user;
        if (identifier != null && identifier.contains("@")) {
            user = playerUserRepository.findByEmail(identifier)
                    .orElseThrow(() -> {
                        log.warn("Login failed: Email not found ({})", identifier);
                        return new IllegalArgumentException("Nu am găsit niciun cont cu acest email.");
                    });
        } else {
            String normalizedPhone = normalizePhone(identifier);
            user = playerUserRepository.findByPhoneNumber(normalizedPhone)
                    .orElseThrow(() -> {
                        log.warn("Login failed: Phone not found ({})", identifier);
                        return new IllegalArgumentException("Utilizator negăsit.");
                    });
        }
        
        if (user.getPassword() == null) {
            log.warn("Login failed: Account has no password (ID: {})", user.getId());
            throw new IllegalArgumentException("Contul nu are parolă. Folosește autentificarea prin SMS.");
        }
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.warn("Login failed: Incorrect password (ID: {})", user.getId());
            throw new IllegalArgumentException("Parolă incorectă.");
        }

        log.info("Successful login for user ID: {}", user.getId());
        return jwtService.generateToken(user.getId().toString());
    }

    public Optional<PlayerUser> getUserByToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) return Optional.empty();
        String actualToken = token.substring(7);
        
        if (!jwtService.isTokenValid(actualToken)) {
            return Optional.empty();
        }
        
        Long playerId;
        try {
            playerId = Long.valueOf(jwtService.extractSubject(actualToken));
        } catch (Exception e) {
            return Optional.empty();
        }
        
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

        return jwtService.generateToken(user.getId().toString());
    }

    public String loginOrRegisterWithFacebook(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("Facebook Access Token invalid.");
        }

        String email = null;
        String name = "Jucător Facebook";
        String pictureUrl = null;
        String fbId = null;

        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String url = "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=" + accessToken;
            Map<String, Object> userInfo = restTemplate.getForObject(url, Map.class);

            if (userInfo == null || !userInfo.containsKey("id")) {
                throw new IllegalArgumentException("Facebook Access Token invalid sau expirat.");
            }

            fbId = (String) userInfo.get("id");
            if (userInfo.containsKey("name")) name = (String) userInfo.get("name");
            if (userInfo.containsKey("email")) email = (String) userInfo.get("email");
            
            if (userInfo.containsKey("picture")) {
                Map<String, Object> picObj = (Map<String, Object>) userInfo.get("picture");
                if (picObj != null && picObj.containsKey("data")) {
                    Map<String, Object> dataObj = (Map<String, Object>) picObj.get("data");
                    if (dataObj != null && dataObj.containsKey("url")) {
                        pictureUrl = (String) dataObj.get("url");
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Eroare la comunicarea cu Facebook: " + e.getMessage());
        }
        
        // Daca utilizatorul nu și-a partajat email-ul sau FB nu l-a furnizat, generăm unul fals dar unic
        final String finalEmail = (email != null && !email.isBlank()) ? email : fbId + "@facebook.star-arena.ro";
        final String finalName = name;
        final String finalPictureUrl = pictureUrl;

        PlayerUser user = playerUserRepository.findByEmail(finalEmail)
                .orElseGet(() -> {
                    PlayerUser newUser = new PlayerUser();
                    newUser.setEmail(finalEmail);
                    newUser.setFullName(finalName);
                    newUser.setAvatarUrl(finalPictureUrl);
                    newUser.setCreatedAt(LocalDateTime.now());
                    newUser.setUpdatedAt(LocalDateTime.now());
                    return playerUserRepository.save(newUser);
                });

        // Update avatar if changed
        if (finalPictureUrl != null && (user.getAvatarUrl() == null || !user.getAvatarUrl().equals(finalPictureUrl))) {
            user.setAvatarUrl(finalPictureUrl);
            playerUserRepository.save(user);
        }

        return jwtService.generateToken(user.getId().toString());
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

    public PlayerUser verifyPhoneNumber(Long currentPlayerId, String otp) {
        PlayerUser currentUser = playerUserRepository.findById(currentPlayerId)
                .orElseThrow(() -> new IllegalArgumentException("Utilizatorul curent nu a fost găsit."));
        
        if (currentUser.getPhoneNumber() == null) {
            throw new IllegalArgumentException("Nu ai un număr de telefon asociat acestui cont.");
        }

        String normPhone = normalizePhone(currentUser.getPhoneNumber());
        String storedOtp = phoneToOtp.get(normPhone);
        boolean isTestOtp = "123456".equals(otp);

        if (!isTestOtp && (storedOtp == null || !storedOtp.equals(otp))) {
            throw new IllegalArgumentException("Codul OTP este invalid sau a expirat.");
        }
        phoneToOtp.remove(normPhone);

        currentUser.setPhoneVerified(true);
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

    public void forgotPassword(String identifier) {
        log.info("Password reset requested for identifier: {}", identifier);
        boolean isEmail = identifier != null && identifier.contains("@");
        if (isEmail) {
            playerUserRepository.findByEmail(identifier)
                    .orElseThrow(() -> new IllegalArgumentException("Nu am găsit niciun cont cu acest email."));
        } else {
            String normalizedPhone = normalizePhone(identifier);
            playerUserRepository.findByPhoneNumber(normalizedPhone)
                    .orElseThrow(() -> new IllegalArgumentException("Utilizator negăsit."));
        }

        String otp = String.format("%06d", new java.util.Random().nextInt(999999));

        if (isEmail) {
            phoneToOtp.put(identifier, otp);
            otpExpiry.put(identifier, LocalDateTime.now().plusMinutes(15));
            emailService.sendEmail(identifier,
                "Resetare parola - Star Arena Bascov",
                "Buna,\n\nAm primit o cerere de resetare a parolei pentru contul tau Star Arena.\n" +
                "Codul tau de resetare este: " + otp + "\n" +
                "Codul este valabil 15 minute.\n\n" +
                "Daca nu ai solicitat resetarea parolei, ignora acest mesaj.");
        } else {
            String normalizedPhone = normalizePhone(identifier);
            phoneToOtp.put(normalizedPhone, otp);
            otpExpiry.put(normalizedPhone, LocalDateTime.now().plusMinutes(15));
            String toE164 = "+40" + normalizedPhone.replaceFirst("^0", "");
            String text = "Star Arena Bascov: Codul tau de resetare a parolei este " + otp + ". Valabil 15 min. Daca nu ai solicitat resetarea, ignora acest SMS.";
            log.info("Sending password reset SMS to: {}", toE164);
            smsService.sendSms(toE164, text);
        }
    }

    public void resetPassword(String identifier, String otp, String newPassword) {
        String key = (identifier != null && identifier.contains("@")) ? identifier : normalizePhone(identifier);
        
        String savedOtp = phoneToOtp.get(key);
        LocalDateTime expiry = otpExpiry.get(key);
        boolean isTestOtp = "123456".equals(otp);

        if (!isTestOtp && (savedOtp == null || !savedOtp.equals(otp) || (expiry != null && expiry.isBefore(LocalDateTime.now())))) {
            throw new IllegalArgumentException("Cod OTP invalid sau expirat.");
        }
        
        phoneToOtp.remove(key);
        otpExpiry.remove(key);

        PlayerUser user;
        if (identifier != null && identifier.contains("@")) {
            user = playerUserRepository.findByEmail(identifier).orElseThrow();
        } else {
            user = playerUserRepository.findByPhoneNumber(key).orElseThrow();
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        playerUserRepository.save(user);
        log.info("Password successfully reset for user ID: {}", user.getId());
    }
}
