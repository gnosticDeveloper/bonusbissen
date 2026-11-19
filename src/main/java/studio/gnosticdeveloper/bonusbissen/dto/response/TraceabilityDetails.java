package studio.gnosticdeveloper.bonusbissen.dto.response;

/** Marker for the typed, per-{@code OperationType} shape of a {@code TraceabilityLog}'s payload. */
public sealed interface TraceabilityDetails
    permits
        SessionRevokeDetails,
        StaffCreateDetails,
        StaffRoleUpdateDetails,
        UserCreateDetails,
        PointsGrantDetails,
        PointsCorrectionDetails,
        RewardClaimDetails,
        ExchangeVerifyDetails,
        ExchangeApproveDetails,
        ExchangeCancelDetails,
        ExchangeUserCancelDetails,
        StaffDeactivateDetails,
        StaffStorefrontsUpdateDetails,
        UserUpdateDetails,
        UserDeactivateDetails,
        UserReactivateDetails,
        PasswordChangeDetails,
        PointProgramUpdateDetails,
        ProgramStorefrontsUpdateDetails,
        OrganizationDeactivateDetails {}
