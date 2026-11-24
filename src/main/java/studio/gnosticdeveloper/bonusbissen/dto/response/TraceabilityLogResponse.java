package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.TraceabilityLog;
import studio.gnosticdeveloper.bonusbissen.entity.User;

public record TraceabilityLogResponse(
    UUID operationId,
    OperationType operationType,
    UserSummary originatingUser,
    List<UserSummary> affectedUsers,
    OffsetDateTime createdAt,
    TraceabilityDetails details
) {
    public static TraceabilityLogResponse from(TraceabilityLog log, Lookup lookup) {
        Map<String, Object> payload = log.getPayload();
        TraceabilityDetails details = switch (log.getOperationType()) {
            case SESSION_REVOKE -> new SessionRevokeDetails();
            case STAFF_CREATE -> new StaffCreateDetails(
                lookup.organization(uuid(payload, "organizationId")),
                lookup.storefront(uuid(payload, "storefrontId")),
                string(payload, "role")
            );
            case STAFF_ROLE_UPDATE -> new StaffRoleUpdateDetails(string(payload, "previousRole"), string(payload, "newRole"));
            case USER_CREATE -> new UserCreateDetails(string(payload, "username"));
            case POINTS_GRANT -> new PointsGrantDetails(
                intValue(payload, "points"),
                lookup.storefront(uuid(payload, "storefrontId")),
                lookup.program(uuid(payload, "programId")),
                string(payload, "note")
            );
            case ONLINE_PURCHASE_GRANT -> new OnlinePurchaseGrantDetails(
                intValue(payload, "points"),
                lookup.program(uuid(payload, "programId")),
                string(payload, "orderId"),
                string(payload, "amount"),
                string(payload, "currency")
            );
            case POINTS_CORRECTION -> new PointsCorrectionDetails(
                lookup.transaction(uuid(payload, "transactionId")),
                lookup.transaction(uuid(payload, "correctedTransactionId")),
                intValue(payload, "points"),
                string(payload, "note")
            );
            case REWARD_CLAIM -> new RewardClaimDetails(
                lookup.reward(uuid(payload, "rewardId")),
                intValue(payload, "costPoints"),
                lookup.program(uuid(payload, "programId"))
            );
            case EXCHANGE_VERIFY -> new ExchangeVerifyDetails(lookup.transaction(uuid(payload, "transactionId")), string(payload, "code"));
            case EXCHANGE_APPROVE -> new ExchangeApproveDetails(lookup.transaction(uuid(payload, "transactionId")), intValue(payload, "points"));
            case EXCHANGE_CANCEL -> new ExchangeCancelDetails(
                lookup.transaction(uuid(payload, "transactionId")),
                intValue(payload, "points"),
                bool(payload, "refunded")
            );
            case EXCHANGE_USER_CANCEL -> new ExchangeUserCancelDetails(
                lookup.transaction(uuid(payload, "transactionId")),
                intValue(payload, "points")
            );
            case STAFF_DEACTIVATE -> new StaffDeactivateDetails(string(payload, "role"));
            case STAFF_STOREFRONTS_UPDATE -> new StaffStorefrontsUpdateDetails(string(payload, "action"), storefronts(payload, lookup));
            case USER_UPDATE -> new UserUpdateDetails(
                string(payload, "previousName"),
                string(payload, "name"),
                string(payload, "previousEmail"),
                string(payload, "email")
            );
            case USER_DEACTIVATE -> new UserDeactivateDetails();
            case USER_REACTIVATE -> new UserReactivateDetails();
            case PASSWORD_CHANGE -> new PasswordChangeDetails();
            case POINT_PROGRAM_UPDATE -> new PointProgramUpdateDetails(
                lookup.program(uuid(payload, "programId")),
                string(payload, "previousName"),
                string(payload, "name"),
                bool(payload, "previousActive"),
                bool(payload, "active"),
                nullableInt(payload, "previousExpirationMonths"),
                nullableInt(payload, "expirationMonths")
            );
            case PROGRAM_STOREFRONTS_UPDATE -> new ProgramStorefrontsUpdateDetails(
                lookup.program(uuid(payload, "programId")),
                string(payload, "action"),
                storefronts(payload, lookup)
            );
            case ORGANIZATION_DEACTIVATE -> new OrganizationDeactivateDetails(lookup.organization(uuid(payload, "organizationId")));
        };
        return new TraceabilityLogResponse(
            log.getOperationId(),
            log.getOperationType(),
            lookup.user(log.getOriginatingUser().getId()),
            log.getAffectedUserIds().stream().map(lookup::user).toList(),
            log.getCreatedAt(),
            details
        );
    }

    private static UUID uuid(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        return value instanceof UUID uuid ? uuid : UUID.fromString(value.toString());
    }

    private static String string(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : value.toString();
    }

    private static int intValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value instanceof Number number ? number.intValue() : 0;
    }

    private static Integer nullableInt(Map<String, Object> payload, String key) {
        return payload.get(key) instanceof Number number ? number.intValue() : null;
    }

    /** The storefronts named by the payload's "storefrontIds"; ones that no longer exist are left out. */
    private static List<StorefrontSummary> storefronts(Map<String, Object> payload, Lookup lookup) {
        if (!(payload.get("storefrontIds") instanceof Iterable<?> ids)) {
            return List.of();
        }
        List<StorefrontSummary> result = new ArrayList<>();
        for (Object id : ids) {
            StorefrontSummary storefront = lookup.storefront(UUID.fromString(id.toString()));
            if (storefront != null) {
                result.add(storefront);
            }
        }
        return result;
    }

    private static boolean bool(Map<String, Object> payload, String key) {
        return Boolean.TRUE.equals(payload.get(key));
    }

    /** Pre-loaded entities, batched by the caller, so hydrating a page of logs costs a handful of queries instead of one per field. */
    public record Lookup(
        Map<UUID, User> users,
        Map<UUID, PointProgram> programs,
        Map<UUID, Storefront> storefronts,
        Map<UUID, Organization> organizations,
        Map<UUID, Reward> rewards,
        Map<UUID, PointTransaction> transactions
    ) {
        UserSummary user(UUID id) {
            User user = users.get(id);
            return user == null ? UserSummary.unknown(id) : UserSummary.from(user);
        }

        PointProgramSummary program(UUID id) {
            if (id == null) {
                return null;
            }
            PointProgram program = programs.get(id);
            return program == null ? PointProgramSummary.unknown(id) : PointProgramSummary.from(program);
        }

        StorefrontSummary storefront(UUID id) {
            if (id == null) {
                return null;
            }
            Storefront storefront = storefronts.get(id);
            return storefront == null ? null : StorefrontSummary.from(storefront);
        }

        OrganizationSummary organization(UUID id) {
            if (id == null) {
                return null;
            }
            Organization organization = organizations.get(id);
            return organization == null ? OrganizationSummary.unknown(id) : OrganizationSummary.from(organization);
        }

        RewardSummary reward(UUID id) {
            if (id == null) {
                return null;
            }
            Reward reward = rewards.get(id);
            return reward == null ? RewardSummary.unknown(id) : RewardSummary.from(reward);
        }

        TransactionSummary transaction(UUID id) {
            if (id == null) {
                return null;
            }
            PointTransaction transaction = transactions.get(id);
            return transaction == null ? TransactionSummary.unknown(id) : TransactionSummary.from(transaction);
        }
    }
}
