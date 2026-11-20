package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.dto.response.TraceabilityLogResponse;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.TraceabilityLogRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

@Service
public class TraceabilityService {

    private final TraceabilityLogRepository traceabilityLogRepository;
    private final UserRepository userRepository;
    private final PointProgramRepository pointProgramRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final StorefrontRepository storefrontRepository;
    private final OrganizationRepository organizationRepository;
    private final RewardRepository rewardRepository;

    public TraceabilityService(
        TraceabilityLogRepository traceabilityLogRepository,
        UserRepository userRepository,
        PointProgramRepository pointProgramRepository,
        PointTransactionRepository pointTransactionRepository,
        StorefrontRepository storefrontRepository,
        OrganizationRepository organizationRepository,
        RewardRepository rewardRepository
    ) {
        this.traceabilityLogRepository = traceabilityLogRepository;
        this.userRepository = userRepository;
        this.pointProgramRepository = pointProgramRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.storefrontRepository = storefrontRepository;
        this.organizationRepository = organizationRepository;
        this.rewardRepository = rewardRepository;
    }

    /**
     * Records an operation with a single affected user. {@code organizationId} is the organization
     * the operation belongs to -- what an admin's audit view filters on -- or null for operations
     * that belong to none (self-registration, a user's own account changes). Returns the new
     * operation id.
     */
    @Transactional
    public UUID record(OperationType type, UUID organizationId, UUID originatingUserId, UUID affectedUserId, Map<String, Object> payload) {
        return record(type, organizationId, originatingUserId, Set.of(affectedUserId), payload);
    }

    /** Records an operation affecting several users (possibly none) under one shared operation id. */
    @Transactional
    public UUID record(OperationType type, UUID organizationId, UUID originatingUserId, Set<UUID> affectedUserIds, Map<String, Object> payload) {
        TraceabilityLog log = new TraceabilityLog();
        log.setOperationType(type);
        log.setOrganizationId(organizationId);
        log.setOriginatingUser(userRepository.getReferenceById(originatingUserId));
        log.setAffectedUserIds(Set.copyOf(affectedUserIds));
        log.setPayload(Map.copyOf(payload));
        return traceabilityLogRepository.save(log).getOperationId();
    }

    /** All three filters are optional and AND together when combined; at least one must be given. */
    @Transactional(readOnly = true)
    public List<TraceabilityLog> find(OperationType operationType, UUID originatingUserId, UUID affectedUserId) {
        if (operationType == null && originatingUserId == null && affectedUserId == null) {
            throw new BadRequestException("Especificá operationType, originatingUserId o affectedUserId.", "");
        }
        return traceabilityLogRepository.search(operationType, originatingUserId, affectedUserId);
    }

    /**
     * Same filters as {@link #find}, restricted to the organization's own rows (newest first) and
     * hydrated for display. The organization filter runs in SQL against the column written when
     * each row was recorded.
     */
    @Transactional(readOnly = true)
    public List<TraceabilityLogResponse> findForOrganization(OperationType operationType, UUID originatingUserId, UUID affectedUserId, UUID organizationId) {
        if (operationType == null && originatingUserId == null && affectedUserId == null) {
            throw new BadRequestException("Especificá operationType, originatingUserId o affectedUserId.", "");
        }
        List<TraceabilityLog> logs = traceabilityLogRepository.searchForOrganization(organizationId, operationType, originatingUserId, affectedUserId);
        TraceabilityLogResponse.Lookup lookup = buildLookup(logs);
        return logs.stream().map(log -> TraceabilityLogResponse.from(log, lookup)).toList();
    }

    /**
     * Batches every entity referenced by a page of logs into one query per entity type, so
     * hydrating N rows costs a handful of queries instead of N*fields. Payload keys are
     * unambiguous across operation types (e.g. "storefrontId" always means a Storefront),
     * so they're collected by key name rather than re-switching on OperationType.
     */
    private TraceabilityLogResponse.Lookup buildLookup(List<TraceabilityLog> logs) {
        Set<UUID> userIds = new HashSet<>();
        Set<UUID> programIds = new HashSet<>();
        Set<UUID> storefrontIds = new HashSet<>();
        Set<UUID> organizationIds = new HashSet<>();
        Set<UUID> rewardIds = new HashSet<>();
        Set<UUID> transactionIds = new HashSet<>();

        for (TraceabilityLog log : logs) {
            userIds.add(log.getOriginatingUser().getId());
            userIds.addAll(log.getAffectedUserIds());
            Map<String, Object> payload = log.getPayload();
            addIfPresent(programIds, payload, "programId");
            addIfPresent(storefrontIds, payload, "storefrontId");
            addAllIfPresent(storefrontIds, payload, "storefrontIds");
            addIfPresent(organizationIds, payload, "organizationId");
            addIfPresent(rewardIds, payload, "rewardId");
            addIfPresent(transactionIds, payload, "transactionId");
            addIfPresent(transactionIds, payload, "correctedTransactionId");
        }

        return new TraceabilityLogResponse.Lookup(
            indexById(userRepository.findAllById(userIds), User::getId),
            indexById(pointProgramRepository.findAllById(programIds), PointProgram::getId),
            indexById(storefrontRepository.findAllById(storefrontIds), Storefront::getId),
            indexById(organizationRepository.findAllById(organizationIds), Organization::getId),
            indexById(rewardRepository.findAllById(rewardIds), Reward::getId),
            indexById(pointTransactionRepository.findAllById(transactionIds), PointTransaction::getId)
        );
    }

    private static void addIfPresent(Set<UUID> target, Map<String, Object> payload, String key) {
        UUID value = uuidFrom(payload.get(key));
        if (value != null) {
            target.add(value);
        }
    }

    private static void addAllIfPresent(Set<UUID> target, Map<String, Object> payload, String key) {
        if (payload.get(key) instanceof Iterable<?> values) {
            for (Object value : values) {
                UUID id = uuidFrom(value);
                if (id != null) {
                    target.add(id);
                }
            }
        }
    }

    private static <T, ID> Map<ID, T> indexById(Iterable<T> entities, Function<T, ID> idOf) {
        return StreamSupport.stream(entities.spliterator(), false).collect(Collectors.toMap(idOf, Function.identity()));
    }

    private static UUID uuidFrom(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof UUID uuid) {
            return uuid;
        }
        try {
            return UUID.fromString(value.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
