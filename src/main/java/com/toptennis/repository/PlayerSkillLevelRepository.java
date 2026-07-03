package com.toptennis.repository;

import com.toptennis.model.PlayerSkillLevel;
import com.toptennis.model.SportType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlayerSkillLevelRepository extends JpaRepository<PlayerSkillLevel, Long> {
    Optional<PlayerSkillLevel> findByPlayerUserIdAndSportType(Long playerUserId, SportType sportType);
}
