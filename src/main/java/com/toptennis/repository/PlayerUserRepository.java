package com.toptennis.repository;

import com.toptennis.model.PlayerUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlayerUserRepository extends JpaRepository<PlayerUser, Integer> {
    Optional<PlayerUser> findByPhoneNumber(String phoneNumber);
}
