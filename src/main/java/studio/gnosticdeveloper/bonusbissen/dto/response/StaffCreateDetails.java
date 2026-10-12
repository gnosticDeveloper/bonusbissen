package studio.gnosticdeveloper.bonusbissen.dto.response;

public record StaffCreateDetails(OrganizationSummary organization, StorefrontSummary storefront, String role) implements TraceabilityDetails {}
