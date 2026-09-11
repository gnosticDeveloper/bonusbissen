package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StorefrontUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;

@Service
public class StorefrontService {

    private final StorefrontRepository storefrontRepository;
    private final OrganizationRepository organizationRepository;
    private final GeorefClient georefClient;

    public StorefrontService(
        StorefrontRepository storefrontRepository,
        OrganizationRepository organizationRepository,
        GeorefClient georefClient
    ) {
        this.storefrontRepository = storefrontRepository;
        this.organizationRepository = organizationRepository;
        this.georefClient = georefClient;
    }

    @Transactional(readOnly = true)
    public List<Storefront> listByOrganization(UUID organizationId) {
        return storefrontRepository.findByOrganizationIdOrderByCreatedAt(organizationId);
    }

    @Transactional
    public Storefront create(StorefrontCreateRequest request, UUID organizationId) {
        Organization organization = organizationRepository
            .findById(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + "."));

        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName(request.name().trim());
        storefront.setOnline(request.online());
        storefront.setCategory(blankToNull(request.category()));
        storefront.setColor(blankToNull(request.color()));
        storefront.setHours(blankToNull(request.hours()));
        storefront.setIconPath(blankToNull(request.icon()));
        storefront.setDescription(blankToNull(request.description()));
        applyLocation(storefront, request.online(), request.address());
        return storefrontRepository.save(storefront);
    }

    @Transactional
    public Storefront update(UUID id, StorefrontUpdateRequest request, UUID organizationId) {
        Storefront storefront = getOwned(id, organizationId);
        storefront.setName(request.name().trim());
        storefront.setOnline(request.online());
        storefront.setCategory(blankToNull(request.category()));
        storefront.setColor(blankToNull(request.color()));
        storefront.setHours(blankToNull(request.hours()));
        storefront.setIconPath(blankToNull(request.icon()));
        storefront.setDescription(blankToNull(request.description()));
        applyLocation(storefront, request.online(), request.address());
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

    /** Online storefronts have no address/city; physical ones get both via georef. */
    private void applyLocation(Storefront storefront, boolean online, String address) {
        if (online) {
            storefront.setAddress(null);
            storefront.setCity(null);
            return;
        }
        GeorefClient.ResolvedAddress resolved = georefClient.resolve(address);
        storefront.setAddress(resolved.address());
        storefront.setCity(resolved.city());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
