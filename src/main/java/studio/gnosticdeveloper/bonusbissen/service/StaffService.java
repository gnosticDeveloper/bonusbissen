package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

@Service
public class StaffService {

    private final OrganizationStaffRepository organizationStaffRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final StorefrontRepository storefrontRepository;

    public StaffService(
        OrganizationStaffRepository organizationStaffRepository,
        OrganizationRepository organizationRepository,
        UserRepository userRepository,
        StorefrontRepository storefrontRepository
    ) {
        this.organizationStaffRepository = organizationStaffRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.storefrontRepository = storefrontRepository;
    }

    @Transactional(readOnly = true)
    public List<OrganizationStaff> listByOrganization(UUID organizationId) {
        return organizationStaffRepository.findByOrganizationIdOrderByCreatedAt(organizationId);
    }

    /** Promotes an existing, not-already-staff {@code User} to staff of {@code organizationId}. */
    @Transactional
    public OrganizationStaff create(StaffCreateRequest request, UUID organizationId) {
        User user = userRepository
            .findById(request.userId())
            .filter(User::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un usuario con el ID " + request.userId() + "."));

        if (organizationStaffRepository.findByUserIdAndActiveTrue(user.getId()).isPresent()) {
            throw new ConflictException("Este usuario ya es parte del staff de una organización.");
        }

        Organization organization = organizationRepository
            .findById(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + "."));

        OrganizationStaff staff = new OrganizationStaff();
        staff.setUser(user);
        staff.setOrganization(organization);
        staff.setRole(request.role());
        if (request.storefrontId() != null) {
            staff.getStorefronts().add(resolveOwnedStorefront(request.storefrontId(), organizationId));
        }

        return saveUnique(staff);
    }

    /** Adds storefronts to an existing staff member's assignment. */
    @Transactional
    public OrganizationStaff attachStorefronts(UUID staffId, List<UUID> storefrontIds, UUID organizationId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        staff.getStorefronts().addAll(resolveOwnedStorefronts(storefrontIds, organizationId));
        return organizationStaffRepository.save(staff);
    }

    /** Removes storefronts from an existing staff member's assignment. */
    @Transactional
    public OrganizationStaff detachStorefronts(UUID staffId, List<UUID> storefrontIds, UUID organizationId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        Set<UUID> toDetach = new HashSet<>(storefrontIds);
        staff.getStorefronts().removeIf(s -> toDetach.contains(s.getId()));
        return organizationStaffRepository.save(staff);
    }

    /** Soft-deletes: frees the staff member's username to be re-promoted elsewhere later. */
    @Transactional
    public void deactivate(UUID staffId, UUID organizationId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        staff.setActive(false);
        organizationStaffRepository.save(staff);
    }

    private OrganizationStaff getOwned(UUID staffId, UUID organizationId) {
        return organizationStaffRepository
            .findByIdAndOrganizationId(staffId, organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un empleado con el ID " + staffId + "."));
    }

    private Storefront resolveOwnedStorefront(UUID storefrontId, UUID organizationId) {
        return storefrontRepository
            .findByIdAndOrganizationId(storefrontId, organizationId)
            .orElseThrow(() -> new BadRequestException("El local " + storefrontId + " no pertenece a esta organización."));
    }

    private Set<Storefront> resolveOwnedStorefronts(List<UUID> storefrontIds, UUID organizationId) {
        Set<Storefront> resolved = new HashSet<>();
        if (storefrontIds == null) {
            return resolved;
        }
        for (UUID storefrontId : storefrontIds) {
            resolved.add(
                storefrontRepository
                    .findByIdAndOrganizationId(storefrontId, organizationId)
                    .orElseThrow(() -> new BadRequestException("El local " + storefrontId + " no pertenece a esta organización."))
            );
        }
        return resolved;
    }

    private OrganizationStaff saveUnique(OrganizationStaff staff) {
        try {
            return organizationStaffRepository.saveAndFlush(staff);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Este usuario ya es parte del staff de una organización.");
        }
    }
}
