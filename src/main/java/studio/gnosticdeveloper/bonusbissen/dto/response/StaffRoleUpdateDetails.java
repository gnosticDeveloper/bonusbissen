package studio.gnosticdeveloper.bonusbissen.dto.response;

public record StaffRoleUpdateDetails(String previousRole, String newRole) implements TraceabilityDetails {}
