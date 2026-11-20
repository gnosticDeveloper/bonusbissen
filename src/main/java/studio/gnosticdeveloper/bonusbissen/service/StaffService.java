package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.OperationType;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.security.SessionService;

@Service
public class StaffService {

    private final OrganizationStaffRepository organizationStaffRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final StorefrontRepository storefrontRepository;
    private final SessionService sessionService;
    private final TraceabilityService traceabilityService;

    public StaffService(
        OrganizationStaffRepository organizationStaffRepository,
        OrganizationRepository organizationRepository,
        UserRepository userRepository,
        StorefrontRepository storefrontRepository,
        SessionService sessionService,
        TraceabilityService traceabilityService
    ) {
        this.organizationStaffRepository = organizationStaffRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.storefrontRepository = storefrontRepository;
        this.sessionService = sessionService;
        this.traceabilityService = traceabilityService;
    }

    @Transactional(readOnly = true)
    public List<OrganizationStaff> listByOrganization(UUID organizationId) {
        return organizationStaffRepository.findByOrganizationIdOrderByCreatedAt(organizationId);
    }

    /** Promotes an existing, not-already-staff {@code User} to staff of {@code organizationId}. */
    @Transactional
    public OrganizationStaff create(StaffCreateRequest request, UUID organizationId, UUID actingUserId) {
        User user = userRepository
            .findById(request.userId())
            .filter(User::isActive)
            .orElseThrow(() ->
                new NotFoundException(
                    "No se pudo encontrar un usuario con el ID " + request.userId() + ".",
                    "No pudimos encontrar el usuario que ingresaste. Por favor, ingresa de nuevo."
                )
            );

        if (organizationStaffRepository.findByUserIdAndActiveTrue(user.getId()).isPresent()) {
            throw new ConflictException(
                "Este usuario ya es parte del staff de una organización.",
                "El usuario ya es parte del staff de una organización."
            );
        }

        Organization organization = organizationRepository
            .findById(organizationId)
            .orElseThrow(() ->
                new NotFoundException(
                    "No se pudo encontrar la organización con ID " + organizationId + ".",
                    "No pudimos encontrar la organización que ingresaste. Por favor, ingresa de nuevo."
                )
            );

        OrganizationStaff staff = new OrganizationStaff();
        staff.setUser(user);
        staff.setOrganization(organization);
        staff.setRole(request.role());
        if (request.storefrontId() != null) {
            staff.getStorefronts().add(resolveOwnedStorefront(request.storefrontId(), organizationId));
        }

        staff = saveUnique(staff);

        Map<String, Object> payload = new HashMap<>();
        payload.put("role", staff.getRole().name());
        payload.put("organizationId", organizationId);
        if (request.storefrontId() != null) {
            payload.put("storefrontId", request.storefrontId());
        }
        traceabilityService.record(OperationType.STAFF_CREATE, organizationId, actingUserId, user.getId(), payload);
        return staff;
    }

    /** Adds storefronts to an existing staff member's assignment. */
    @Transactional
    public OrganizationStaff attachStorefronts(UUID staffId, List<UUID> storefrontIds, UUID organizationId, UUID actingUserId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        Set<UUID> before = assignedStorefrontIds(staff);
        staff.getStorefronts().addAll(resolveOwnedStorefronts(storefrontIds, organizationId));
        Set<UUID> attached = new HashSet<>(assignedStorefrontIds(staff));
        attached.removeAll(before);
        staff = organizationStaffRepository.save(staff);
        recordStorefrontChange(staff, "attach", attached, organizationId, actingUserId);
        return staff;
    }

    /** Removes storefronts from an existing staff member's assignment. */
    @Transactional
    public OrganizationStaff detachStorefronts(UUID staffId, List<UUID> storefrontIds, UUID organizationId, UUID actingUserId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        Set<UUID> before = assignedStorefrontIds(staff);
        Set<UUID> toDetach = new HashSet<>(storefrontIds);
        staff.getStorefronts().removeIf(s -> toDetach.contains(s.getId()));
        Set<UUID> detached = new HashSet<>(before);
        detached.removeAll(assignedStorefrontIds(staff));
        staff = organizationStaffRepository.save(staff);
        recordStorefrontChange(staff, "detach", detached, organizationId, actingUserId);
        return staff;
    }

    private static Set<UUID> assignedStorefrontIds(OrganizationStaff staff) {
        Set<UUID> ids = new HashSet<>();
        for (Storefront storefront : staff.getStorefronts()) {
            ids.add(storefront.getId());
        }
        return ids;
    }

    /** Nothing is recorded when the request changed nothing (e.g. attaching a storefront already assigned). */
    private void recordStorefrontChange(OrganizationStaff staff, String action, Set<UUID> changedStorefrontIds, UUID organizationId, UUID actingUserId) {
        if (changedStorefrontIds.isEmpty()) {
            return;
        }
        traceabilityService.record(
            OperationType.STAFF_STOREFRONTS_UPDATE, organizationId, actingUserId, staff.getUser().getId(),
            TraceabilityPayload.of("action", action, "storefrontIds", List.copyOf(changedStorefrontIds))
        );
    }

    /**
     * Changes a staff member's role and revokes their sessions, since the role is carried in the
     * access token. Nobody can change their own role: that is how an organization ends up with no admin.
     */
    @Transactional
    public OrganizationStaff updateRole(UUID staffId, StaffUpdateRequest request, UUID organizationId, UUID actingUserId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        if (!staff.isActive()) {
            throw new BadRequestException(
                "Staff member " + staffId + " is not active.",
                "El empleado ya no forma parte del equipo."
            );
        }
        if (staff.getUser().getId().equals(actingUserId)) {
            throw new BadRequestException(
                "User " + actingUserId + " tried to change their own role.",
                "No podés cambiar tu propio rol."
            );
        }
        StaffRole previous = staff.getRole();
        if (previous == request.role()) {
            return staff;
        }
        staff.setRole(request.role());
        staff = organizationStaffRepository.save(staff);
        sessionService.revokeAllForUser(staff.getUser().getId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("organizationId", organizationId);
        payload.put("previousRole", previous.name());
        payload.put("newRole", request.role().name());
        traceabilityService.record(OperationType.STAFF_ROLE_UPDATE, organizationId, actingUserId, staff.getUser().getId(), payload);
        return staff;
    }

    /**
     * Soft-deletes: frees the staff member's username to be re-promoted elsewhere later.
     * Nobody can remove themselves, so an organization always keeps the admin who is acting.
     */
    @Transactional
    public void deactivate(UUID staffId, UUID organizationId, UUID actingUserId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        if (staff.getUser().getId().equals(actingUserId)) {
            throw new BadRequestException(
                "User " + actingUserId + " tried to remove themselves from the staff.",
                "No podés quitarte a vos mismo del equipo."
            );
        }
        staff.setActive(false);
        organizationStaffRepository.save(staff);
        sessionService.revokeAllForUser(staff.getUser().getId());
        traceabilityService.record(
            OperationType.STAFF_DEACTIVATE, organizationId, actingUserId, staff.getUser().getId(),
            TraceabilityPayload.of("role", staff.getRole().name())
        );
    }

    /**
     * Kills every session (and already-issued access token) for a staff member
     * without deactivating them -- e.g. a suspected account compromise where the
     * person should still be able to log back in once they've reset their password.
     */
    @Transactional
    public void revokeSessions(UUID staffId, UUID organizationId, UUID actingUserId) {
        OrganizationStaff staff = getOwned(staffId, organizationId);
        sessionService.revokeAllForUser(staff.getUser().getId());
        traceabilityService.record(OperationType.SESSION_REVOKE, organizationId, actingUserId, staff.getUser().getId(), Map.of());
    }

    private OrganizationStaff getOwned(UUID staffId, UUID organizationId) {
        return organizationStaffRepository
            .findByIdAndOrganizationId(staffId, organizationId)
            .orElseThrow(() ->
                new NotFoundException(
                    "No se pudo encontrar un empleado con el ID " + staffId + ".",
                    "No pudimos encontrar el empleado que ingresaste. Por favor, ingresa de nuevo."
                )
            );
    }

    private Storefront resolveOwnedStorefront(UUID storefrontId, UUID organizationId) {
        return storefrontRepository
            .findByIdAndOrganizationId(storefrontId, organizationId)
            .orElseThrow(() ->
                new BadRequestException(
                    "El local " + storefrontId + " no pertenece a esta organización.",
                    "El local no pertenece a esta organización. Por favor, ingresa de nuevo."
                )
            );
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
                    .orElseThrow(() ->
                        new BadRequestException(
                            "El local " + storefrontId + " no pertenece a esta organización.",
                            "El local no pertenece a esta organización. Por favor, ingresa de nuevo."
                        )
                    )
            );
        }
        return resolved;
    }

    private OrganizationStaff saveUnique(OrganizationStaff staff) {
        try {
            return organizationStaffRepository.saveAndFlush(staff);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException(
                "Este usuario ya es parte del staff de una organización.",
                "El usuario ya es parte del staff de una organización."
            );
        }
    }
}
