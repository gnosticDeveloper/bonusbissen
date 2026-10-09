package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.TraceabilityLogRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

@Service
public class TraceabilityService {

    private final TraceabilityLogRepository traceabilityLogRepository;
    private final UserRepository userRepository;

    public TraceabilityService(TraceabilityLogRepository traceabilityLogRepository, UserRepository userRepository) {
        this.traceabilityLogRepository = traceabilityLogRepository;
        this.userRepository = userRepository;
    }

    /** Records an operation with a single affected user. Returns the new operation id. */
    @Transactional
    public UUID record(OperationType type, UUID originatingUserId, UUID affectedUserId, Map<String, Object> payload) {
        return record(type, originatingUserId, Set.of(affectedUserId), payload);
    }

    /** Records an operation affecting several users under one shared operation id. */
    @Transactional
    public UUID record(OperationType type, UUID originatingUserId, Set<UUID> affectedUserIds, Map<String, Object> payload) {
        TraceabilityLog log = new TraceabilityLog();
        log.setOperationType(type);
        log.setOriginatingUser(userRepository.getReferenceById(originatingUserId));
        log.setAffectedUserIds(Set.copyOf(affectedUserIds));
        log.setPayload(Map.copyOf(payload));
        return traceabilityLogRepository.save(log).getOperationId();
    }

    @Transactional(readOnly = true)
    public List<TraceabilityLog> find(UUID operationId, UUID originatingUserId, UUID affectedUserId) {
        if (operationId != null) {
            return traceabilityLogRepository.findById(operationId).map(List::of).orElse(List.of());
        }
        if (originatingUserId != null) {
            return traceabilityLogRepository.findAllByOriginatingUser_Id(originatingUserId);
        }
        if (affectedUserId != null) {
            return traceabilityLogRepository.findAllByAffectedUserIdsContains(affectedUserId);
        }
        throw new BadRequestException("Especificá operationId, originatingUserId o affectedUserId.", "");
    }
}
