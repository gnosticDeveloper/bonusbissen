package studio.gnosticdeveloper.bonusbissen.dto.response;

/** Marker for the typed, per-{@code OperationType} shape of a {@code TraceabilityLog}'s payload. */
public sealed interface TraceabilityDetails
    permits
        SessionRevokeDetails,
        StaffCreateDetails,
        UserCreateDetails,
        PointsGrantDetails,
        PointsCorrectionDetails,
        RewardClaimDetails,
        ExchangeVerifyDetails,
        ExchangeApproveDetails,
        ExchangeCancelDetails,
        ExchangeUserCancelDetails {}
