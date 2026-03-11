package com.toptennis.repository;

import com.toptennis.model.SubscriptionRequest;
import com.toptennis.model.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubscriptionRequestRepository extends JpaRepository<SubscriptionRequest, Long> {
    List<SubscriptionRequest> findByStatus(SubscriptionStatus status);
    List<SubscriptionRequest> findByPlayerId(Integer playerId);
}
