package com.toptennis.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "open_match_participant",
       uniqueConstraints = @UniqueConstraint(name = "uq_omp_match_player", columnNames = {"open_match_id", "player_user_id"}))
public class OpenMatchParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "open_match_id", nullable = false)
    private OpenMatch openMatch;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "player_user_id", nullable = false)
    private PlayerUser playerUser;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OpenMatch getOpenMatch() { return openMatch; }
    public void setOpenMatch(OpenMatch openMatch) { this.openMatch = openMatch; }
    public PlayerUser getPlayerUser() { return playerUser; }
    public void setPlayerUser(PlayerUser playerUser) { this.playerUser = playerUser; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
}
