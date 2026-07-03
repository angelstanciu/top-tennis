package com.toptennis.repository;

import com.toptennis.model.OpenMatchParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OpenMatchParticipantRepository extends JpaRepository<OpenMatchParticipant, Long> {

    long countByOpenMatchId(Long openMatchId);

    boolean existsByOpenMatchIdAndPlayerUserId(Long openMatchId, Long playerUserId);

    @Query("select p from OpenMatchParticipant p " +
           "join fetch p.playerUser " +
           "where p.openMatch.id in :matchIds " +
           "order by p.joinedAt asc")
    List<OpenMatchParticipant> findWithPlayersByMatchIds(@Param("matchIds") Collection<Long> matchIds);
}
