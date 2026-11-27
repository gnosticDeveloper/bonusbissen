package studio.gnosticdeveloper.bonusbissen.merchant;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;

/** Dashboard-side management (ADMIN) of the third-party integrations that may credit points. */
@Service
public class MerchantIntegrationService {

    private final MerchantIntegrationRepository integrationRepository;
    private final StorefrontRepository storefrontRepository;
    private final MerchantSecretCipher cipher;
    private final SecureRandom random = new SecureRandom();

    public MerchantIntegrationService(
        MerchantIntegrationRepository integrationRepository,
        StorefrontRepository storefrontRepository,
        MerchantSecretCipher cipher
    ) {
        this.integrationRepository = integrationRepository;
        this.storefrontRepository = storefrontRepository;
        this.cipher = cipher;
    }

    @Transactional
    public IntegrationResponse create(IntegrationCreateRequest request, UUID organizationId) {
        Storefront storefront = storefrontRepository
            .findByIdAndOrganizationId(request.storefrontId(), organizationId)
            .orElseThrow(() ->
                new NotFoundException(
                    "Storefront " + request.storefrontId() + " not found in organization " + organizationId + ".",
                    "No pudimos encontrar la sucursal elegida."
                )
            );
        if (!storefront.isOnline()) {
            throw new BadRequestException(
                "Storefront " + storefront.getId() + " is not online.",
                "La integración debe asociarse a una sucursal online."
            );
        }
        if (storefront.getPointProgram() == null) {
            throw new BadRequestException(
                "Storefront " + storefront.getId() + " has no point program.",
                "La sucursal elegida no tiene un programa de puntos."
            );
        }

        String secret = "bbs_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
        MerchantIntegration integration = new MerchantIntegration();
        integration.setOrganization(storefront.getOrganization());
        integration.setStorefront(storefront);
        integration.setName(request.name().trim());
        integration.setProvider(SignedMerchantSource.KEY);
        integration.setKeyId("bbk_" + HexFormat.of().formatHex(randomBytes(12)));
        integration.setCredentialsEncrypted(cipher.encrypt(secret));
        integration.setPointsPerUnit(request.pointsPerUnit());
        integration.setCurrency(request.currency().toUpperCase(Locale.ROOT));
        return IntegrationResponse.from(integrationRepository.save(integration), secret);
    }

    @Transactional(readOnly = true)
    public List<IntegrationResponse> list(UUID organizationId) {
        return integrationRepository
            .findAllByOrganization_IdOrderByCreatedAtDesc(organizationId)
            .stream()
            .map(i -> IntegrationResponse.from(i, null))
            .toList();
    }

    /** Revocation: a deactivated integration's requests are rejected like an unknown key. */
    @Transactional
    public void deactivate(UUID id, UUID organizationId) {
        MerchantIntegration integration = integrationRepository
            .findByIdAndOrganization_Id(id, organizationId)
            .orElseThrow(() ->
                new NotFoundException("Integration " + id + " not found in organization " + organizationId + ".", "No pudimos encontrar la integración.")
            );
        integration.setActive(false);
    }

    private byte[] randomBytes(int n) {
        byte[] bytes = new byte[n];
        random.nextBytes(bytes);
        return bytes;
    }
}
