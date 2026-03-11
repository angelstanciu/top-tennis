package com.toptennis.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.toptennis.model.PlayerUser;
import com.toptennis.repository.PlayerUserRepository;
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
public class PlayerAuthService {

    private final PlayerUserRepository playerUserRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Value("${google.auth.client-id}")
    private String googleClientId;
    
    // Simplu cache in memorie pentru OTP si Token-uri (Doar pentru MVP)
    private final Map<String, String> phoneToOtp = new ConcurrentHashMap<>();
    private final Map<String, Integer> tokenToPlayerId = new ConcurrentHashMap<>();

    public PlayerAuthService(PlayerUserRepository playerUserRepository, PasswordEncoder passwordEncoder) {
        this.playerUserRepository = playerUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void requestOtp(String phone) {
        String otp = "123456"; // Hardcodat pentru ușurința testării frontend / MVP
        phoneToOtp.put(phone, otp);
        System.out.println("====== OTP MOCK ======");
        System.out.println("Pentru telefonul " + phone + " codul este de test universal: " + otp);
        System.out.println("======================");
    }

    public String verifyOtp(String phone, String otp) {
        String savedOtp = phoneToOtp.get(phone);
        if (savedOtp == null || !savedOtp.equals(otp)) {
            throw new IllegalArgumentException("Cod OTP invalid sau expirat.");
        }
        
        // Curatam OTP-ul folosit
        phoneToOtp.remove(phone);

        // Gasim sau cream utilizatorul (fara nume si email pentru moment, se vor completa dupa)
        PlayerUser user = playerUserRepository.findByPhoneNumber(phone)
            .orElseGet(() -> {
                PlayerUser newUser = new PlayerUser();
                newUser.setPhoneNumber(phone);
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
        if (playerUserRepository.findByPhoneNumber(phone).isPresent()) {
            throw new IllegalArgumentException("Numărul de telefon este deja înregistrat.");
        }
        PlayerUser user = new PlayerUser();
        user.setPhoneNumber(phone);
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
        Integer playerId = tokenToPlayerId.get(actualToken);
        if (playerId == null) return Optional.empty();
        return playerUserRepository.findById(playerId);
    }

    public PlayerUser updateProfile(Integer playerId, String fullName, String email, String preferredSport, Integer age, String avatarUrl) {
        PlayerUser user = playerUserRepository.findById(playerId).orElseThrow();
        if (fullName != null && !fullName.isBlank()) user.setFullName(fullName);
        if (email != null) user.setEmail(email);
        if (age != null) user.setAge(age);
        if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
        if (preferredSport != null) {
            try {
                user.setPreferredSport(com.toptennis.model.SportType.valueOf(preferredSport));
            } catch (Exception ignored) {}
        }
        user.setUpdatedAt(LocalDateTime.now());
        return playerUserRepository.save(user);
    }

    public String loginOrRegisterWithGoogle(String idTokenString) throws GeneralSecurityException, IOException {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken = verifier.verify(idTokenString);
        if (idToken == null) {
            throw new IllegalArgumentException("ID Token invalid.");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

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
}
