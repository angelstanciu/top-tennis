package com.toptennis.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * O partida deschisa (matchmaking): rezervarea exista si tine terenul ocupat,
 * iar organizatorul cauta jucatori pentru locurile ramase.
 */
@Entity
@Table(name = "open_match")
public class OpenMatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_player_id", nullable = false)
    private PlayerUser organizer;

    @Enumerated(EnumType.STRING)
    @Column(name = "sport_type", nullable = false, length = 32)
    private SportType sportType;

    @Column(name = "target_level_rank", nullable = false)
    private int targetLevelRank;

    /** Cati jucatori are deja organizatorul, inclusiv el (2 sau 3 la padel). */
    @Column(name = "group_size", nullable = false)
    private int groupSize;

    @Column(name = "total_slots", nullable = false)
    private int totalSlots;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private OpenMatchStatus status;

    /** Momentul la care partida neumpluta se anuleaza automat si terenul se elibereaza. */
    @Column(name = "release_at", nullable = false)
    private LocalDateTime releaseAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
    public PlayerUser getOrganizer() { return organizer; }
    public void setOrganizer(PlayerUser organizer) { this.organizer = organizer; }
    public SportType getSportType() { return sportType; }
    public void setSportType(SportType sportType) { this.sportType = sportType; }
    public int getTargetLevelRank() { return targetLevelRank; }
    public void setTargetLevelRank(int targetLevelRank) { this.targetLevelRank = targetLevelRank; }
    public int getGroupSize() { return groupSize; }
    public void setGroupSize(int groupSize) { this.groupSize = groupSize; }
    public int getTotalSlots() { return totalSlots; }
    public void setTotalSlots(int totalSlots) { this.totalSlots = totalSlots; }
    public OpenMatchStatus getStatus() { return status; }
    public void setStatus(OpenMatchStatus status) { this.status = status; }
    public LocalDateTime getReleaseAt() { return releaseAt; }
    public void setReleaseAt(LocalDateTime releaseAt) { this.releaseAt = releaseAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
