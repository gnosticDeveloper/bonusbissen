package studio.gnosticdeveloper.bonusbissen.security;

import java.util.UUID;

public record AuthenticatedPrincipal(UUID id, String displayName, String role, UUID organizationId) {}
