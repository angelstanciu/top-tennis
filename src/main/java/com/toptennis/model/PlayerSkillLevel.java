package com.toptennis.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "player_skill_level",
       uniqueConstraints = @UniqueConstraint(name = "uq_psl_player_sport", columnNames = {"player_user_id", "sport_type"}))
public class PlayerSkillLevel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "player_user_id", nullable = false)
    private PlayerUser playerUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "sport_type", nullable = false, length = 32)
    private SportType sportType;

    @Column(name = "level_rank", nullable = false)
    private int levelRank;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public PlayerUser getPlayerUser() { return playerUser; }
    public void setPlayerUser(PlayerUser playerUser) { this.playerUser = playerUser; }
    public SportType getSportType() { return sportType; }
    public void setSportType(SportType sportType) { this.sportType = sportType; }
    public int getLevelRank() { return levelRank; }
    public void setLevelRank(int levelRank) { this.levelRank = levelRank; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
