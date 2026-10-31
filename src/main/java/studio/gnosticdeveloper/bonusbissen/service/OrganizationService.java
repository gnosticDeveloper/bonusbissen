package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.security.SessionService;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationStaffRepository organizationStaffRepository;
    private final StorefrontRepository storefrontRepository;
    private final PointProgramRepository pointProgramRepository;
    private final UserRepository userRepository;
    private final SessionService sessionService;
    private final TraceabilityService traceabilityService;

    public OrganizationService(
        OrganizationRepository organizationRepository,
        OrganizationStaffRepository organizationStaffRepository,
        StorefrontRepository storefrontRepository,
        PointProgramRepository pointProgramRepository,
        UserRepository userRepository,
        SessionService sessionService,
        TraceabilityService traceabilityService
    ) {
        this.organizationRepository = organizationRepository;
        this.organizationStaffRepository = organizationStaffRepository;
        this.storefrontRepository = storefrontRepository;
        this.pointProgramRepository = pointProgramRepository;
        this.userRepository = userRepository;
        this.sessionService = sessionService;
        this.traceabilityService = traceabilityService;
    }

    /** Creates an organization and makes {@code creatorUserId} its first ADMIN. The creator must not already be active staff elsewhere. */
    @Transactional
    public Organization create(OrganizationCreateRequest request, UUID creatorUserId) {
        User creator = userRepository
            .findById(creatorUserId)
            .filter(User::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar el usuario con ID " + creatorUserId + ".", "No pudimos encontrar tu usuario"));

        if (organizationStaffRepository.findByUserIdAndActiveTrue(creatorUserId).isPresent()) {
            throw new ConflictException(
                "Este usuario ya es parte del staff de una organización.",
                "Ya sos parte del staff de una organización."
            );
        }

        Organization organization = new Organization();
        organization.setName(request.name().trim());
        organization = organizationRepository.save(organization);

        OrganizationStaff staff = new OrganizationStaff();
        staff.setUser(creator);
        staff.setOrganization(organization);
        staff.setRole(StaffRole.ADMIN);
        try {
            organizationStaffRepository.saveAndFlush(staff);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException(
                "Este usuario ya es parte del staff de una organización.",
                "Ya sos parte del staff de una organización."
            );
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("role", StaffRole.ADMIN.name());
        payload.put("organizationId", organization.getId());
        traceabilityService.record(OperationType.STAFF_CREATE, creatorUserId, creatorUserId, payload);
        return organization;
    }

    @Transactional
    public void deactivate(UUID id) {
        Organization organization = getById(id);
        organization.setActive(false);
        organizationRepository.save(organization);

        List<OrganizationStaff> staff = organizationStaffRepository.findByOrganizationIdAndActiveTrue(id);
        staff.forEach(s -> s.setActive(false));
        organizationStaffRepository.saveAll(staff);
        storefrontRepository.deactivateAllByOrganizationId(id);
        pointProgramRepository.deactivateAllByOrganizationId(id);

        staff.forEach(s -> sessionService.revokeAllForUser(s.getUser().getId()));
    }

    @Transactional(readOnly = true)
    public Page<Organization> search(String search, Pageable pageable) {
        String term = search == null || search.isBlank() ? null : search.trim();
        return organizationRepository.search(term, pageable);
    }

    @Transactional(readOnly = true)
    public Organization getById(UUID id) {
        return organizationRepository.findById(id).filter(Organization::isActive).orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + id + ".", "No pudimos encontrar la organización"));
    }

    @Transactional
    public Organization update(UUID id, OrganizationUpdateRequest request) {
        Organization organization = getById(id);
        organization.setName(request.name());
        return organizationRepository.save(organization);
    }
}
