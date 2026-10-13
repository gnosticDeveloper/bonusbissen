package studio.gnosticdeveloper.bonusbissen.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import studio.gnosticdeveloper.bonusbissen.entity.LoginLinkToken;

public interface LoginLinkTokenRepository extends JpaRepository<LoginLinkToken, UUID> {
    Optional<LoginLinkToken> findByToken(String token);

    List<LoginLinkToken> findAllByUserIdAndOrganizationIdIsNullAndConsumedAtIsNull(UUID userId);

    List<LoginLinkToken> findAllByUserIdAndOrganizationIdAndConsumedAtIsNull(UUID userId, UUID organizationId);
}
