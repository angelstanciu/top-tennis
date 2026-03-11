package com.toptennis.service;

import com.toptennis.model.SubscriptionRequest;
import com.toptennis.model.SubscriptionStatus;
import com.toptennis.repository.SubscriptionRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class SubscriptionRequestService {

    @Autowired
    private SubscriptionRequestRepository repository;

    public SubscriptionRequest createRequest(SubscriptionRequest request) {
        request.setStatus(SubscriptionStatus.PENDING);
        return repository.save(request);
    }

    public List<SubscriptionRequest> getAllRequests() {
        return repository.findAll();
    }

    public List<SubscriptionRequest> getPendingRequests() {
        return repository.findByStatus(SubscriptionStatus.PENDING);
    }

    public SubscriptionRequest updateStatus(Long id, SubscriptionStatus status) {
        SubscriptionRequest request = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cererea nu a fost găsită."));
        request.setStatus(status);
        return repository.save(request);
    }

    public List<SubscriptionRequest> getPlayerRequests(Integer playerId) {
        return repository.findByPlayerId(playerId);
    }
}
