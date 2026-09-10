package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;

@Service
public class StorefrontService {

    private final StorefrontRepository storefrontRepository;
    private final OrganizationRepository organizationRepository;

    public StorefrontService(StorefrontRepository storefrontRepository, OrganizationRepository organizationRepository) {
        this.storefrontRepository = storefrontRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public List<Storefront> listByOrganization(UUID organizationId) {
        return storefrontRepository.findByOrganizationIdOrderByCreatedAt(organizationId);
    }

    @Transactional
    public Storefront create(StorefrontCreateRequest request, UUID organizationId) {
        requireOnlineOrAddress(request.online(), request.address());

        Organization organization = organizationRepository
            .findById(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + "."));

        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName(request.name().trim());
        storefront.setOnline(request.online());
        storefront.setAddress(blankToNull(request.address()));
        storefront.setHours(blankToNull(request.hours()));
        storefront.setIconPath(blankToNull(request.icon()));
        storefront.setDescription(blankToNull(request.description()));
        return storefrontRepository.save(storefront);
    }

    @Transactional
    public Storefront update(UUID id, StorefrontUpdateRequest request, UUID organizationId) {
        requireOnlineOrAddress(request.online(), request.address());

        Storefront storefront = getOwned(id, organizationId);
        storefront.setName(request.name().trim());
        storefront.setOnline(request.online());
        storefront.setAddress(blankToNull(request.address()));
        storefront.setHours(blankToNull(request.hours()));
        storefront.setIconPath(blankToNull(request.icon()));
        storefront.setDescription(blankToNull(request.description()));
        if (request.active() != null) {
            storefront.setActive(request.active());
        }
        return storefrontRepository.save(storefront);
    }

    @Transactional
    public void deactivate(UUID id, UUID organizationId) {
        Storefront storefront = getOwned(id, organizationId);
        storefront.setActive(false);
        storefrontRepository.save(storefront);
    }

    private Storefront getOwned(UUID id, UUID organizationId) {
        return storefrontRepository
            .findByIdAndOrganizationId(id, organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar el local con ID " + id + "."));
    }

    private static void requireOnlineOrAddress(boolean online, String address) {
        if (!online && (address == null || address.isBlank())) {
            throw new BadRequestException("Un local físico necesita una dirección.");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
