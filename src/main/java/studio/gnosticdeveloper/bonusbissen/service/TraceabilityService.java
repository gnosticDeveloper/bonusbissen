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
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
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
    private final OrganizationStaffRepository organizationStaffRepository;
    private final PointProgramRepository pointProgramRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final StorefrontRepository storefrontRepository;
    private final OrganizationRepository organizationRepository;
    private final RewardRepository rewardRepository;

    public TraceabilityService(
        TraceabilityLogRepository traceabilityLogRepository,
        UserRepository userRepository,
        OrganizationStaffRepository organizationStaffRepository,
        PointProgramRepository pointProgramRepository,
        PointTransactionRepository pointTransactionRepository,
        StorefrontRepository storefrontRepository,
        OrganizationRepository organizationRepository,
        RewardRepository rewardRepository
    ) {
        this.traceabilityLogRepository = traceabilityLogRepository;
        this.userRepository = userRepository;
        this.organizationStaffRepository = organizationStaffRepository;
        this.pointProgramRepository = pointProgramRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.storefrontRepository = storefrontRepository;
        this.organizationRepository = organizationRepository;
        this.rewardRepository = rewardRepository;
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

    /** Same lookup as {@link #find}, restricted to rows that belong to the given organization and hydrated for display. */
    @Transactional(readOnly = true)
    public List<TraceabilityLogResponse> findForOrganization(UUID operationId, UUID originatingUserId, UUID affectedUserId, UUID organizationId) {
        List<TraceabilityLog> logs = find(operationId, originatingUserId, affectedUserId)
            .stream()
            .filter(log -> belongsToOrganization(log, organizationId))
            .toList();
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

    private static <T, ID> Map<ID, T> indexById(Iterable<T> entities, Function<T, ID> idOf) {
        return StreamSupport.stream(entities.spliterator(), false).collect(Collectors.toMap(idOf, Function.identity()));
    }

    /**
     * Resolves which organization an operation belongs to. The log itself carries no
     * organizationId -- each {@link OperationType} is checked against whichever entity
     * actually ties it to an organization (a payload field, or the originating staff
     * member's own membership). USER_CREATE is self-registration and belongs to no
     * organization, so it never matches.
     */
    private boolean belongsToOrganization(TraceabilityLog log, UUID organizationId) {
        Map<String, Object> payload = log.getPayload();
        return switch (log.getOperationType()) {
            case STAFF_CREATE -> organizationId.equals(uuidFrom(payload.get("organizationId")));
            case SESSION_REVOKE -> organizationStaffRepository.existsByUserIdAndOrganizationIdAndActiveTrue(
                log.getOriginatingUser().getId(),
                organizationId
            );
            case POINTS_GRANT, REWARD_CLAIM -> {
                UUID programId = uuidFrom(payload.get("programId"));
                yield programId != null && pointProgramRepository.existsByIdAndOrganizationId(programId, organizationId);
            }
            case POINTS_CORRECTION, EXCHANGE_VERIFY, EXCHANGE_APPROVE, EXCHANGE_CANCEL, EXCHANGE_USER_CANCEL -> {
                UUID transactionId = uuidFrom(payload.get("transactionId"));
                yield transactionId != null && pointTransactionRepository.existsByIdAndPointProgram_Organization_Id(transactionId, organizationId);
            }
            case USER_CREATE -> false;
        };
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
