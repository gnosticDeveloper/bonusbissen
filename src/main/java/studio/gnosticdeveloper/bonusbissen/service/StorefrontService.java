package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontUserRow;
import studio.gnosticdeveloper.bonusbissen.repository.UserPointProgramRepository;

@Service
public class StorefrontService {

    private final StorefrontRepository storefrontRepository;
    private final UserPointProgramRepository userPointProgramRepository;
    private final OrganizationRepository organizationRepository;
    private final GeorefClient georefClient;
    private final OnboardingService onboardingService;

    public StorefrontService(StorefrontRepository storefrontRepository, UserPointProgramRepository userPointProgramRepository, OrganizationRepository organizationRepository, GeorefClient georefClient, OnboardingService onboardingService) {
        this.storefrontRepository = storefrontRepository;
        this.userPointProgramRepository = userPointProgramRepository;
        this.organizationRepository = organizationRepository;
        this.georefClient = georefClient;
        this.onboardingService = onboardingService;
    }

    @Transactional(readOnly = true)
    public List<Storefront> listByOrganization(UUID organizationId) {
        return storefrontRepository.findByOrganizationIdOrderByCreatedAt(organizationId);
    }

    /** Users who joined the program through this storefront; the storefront must belong to the caller's organization. */
    @Transactional(readOnly = true)
    public Page<StorefrontUserRow> listUsers(UUID id, UUID organizationId, String search, String sort, String dir, Pageable pageable) {
        if (!UserPointProgramRepository.STOREFRONT_USER_SORTS.contains(sort)) {
            throw new BadRequestException("Unknown storefront user sort: " + sort + ".", "No se puede ordenar por ese campo.");
        }
        if (!"asc".equals(dir) && !"desc".equals(dir)) {
            throw new BadRequestException("Unknown sort direction: " + dir + ".", "La dirección del orden debe ser asc o desc.");
        }
        getOwned(id, organizationId);
        String term = search == null || search.isBlank() ? null : search.trim();
        return userPointProgramRepository.findStorefrontUsers(id, term, sort, "desc".equals(dir), PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()));
    }

    @Transactional
    public Storefront create(StorefrontCreateRequest request, UUID organizationId) {
        Organization organization = organizationRepository
            .findById(organizationId)
            .orElseThrow(() ->
                new NotFoundException(
                    "No se pudo encontrar la organización con ID " + organizationId + ".",
                    "Parece que la organización seleccionada no es válida."
                )
            );

        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName(request.name().trim());
        storefront.setOnline(request.online());
        storefront.setCategory(blankToNull(request.category()));
        storefront.setColor(blankToNull(request.color()));
        storefront.setHours(blankToNull(request.hours()));
        storefront.setPhone(blankToNull(request.phone()));
        storefront.setIconPath(blankToNull(request.icon()));
        storefront.setDescription(blankToNull(request.description()));
        applyLocation(storefront, request.online(), request.address(), request.city(), request.province());
        Storefront saved = storefrontRepository.save(storefront);
        onboardingService.markStorefrontCreated(organizationId);
        return saved;
    }

    @Transactional
    public Storefront update(UUID id, StorefrontUpdateRequest request, UUID organizationId) {
        Storefront storefront = getOwned(id, organizationId);
        storefront.setName(request.name().trim());
        storefront.setOnline(request.online());
        storefront.setCategory(blankToNull(request.category()));
        storefront.setColor(blankToNull(request.color()));
        storefront.setHours(blankToNull(request.hours()));
        storefront.setPhone(blankToNull(request.phone()));
        storefront.setIconPath(blankToNull(request.icon()));
        storefront.setDescription(blankToNull(request.description()));
        applyLocation(storefront, request.online(), request.address(), request.city(), request.province());
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
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar el local con ID " + id + ".", "No se pudo encontrar la sucursal seleccionada."));
    }

    /** Online storefronts have no address/city/province; physical ones get all three via georef. */
    private void applyLocation(Storefront storefront, boolean online, String address, String city, String province) {
        if (online) {
            storefront.setAddress(null);
            storefront.setCity(null);
            storefront.setProvince(null);
            return;
        }
        GeorefClient.ResolvedAddress resolved = georefClient.resolve(address, city, province);
        storefront.setAddress(resolved.address());
        storefront.setCity(resolved.city());
        storefront.setProvince(resolved.province());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
