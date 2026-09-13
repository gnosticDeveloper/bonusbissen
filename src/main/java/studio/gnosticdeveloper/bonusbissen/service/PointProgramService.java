package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointProgramCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointProgramUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserPointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

@Service
public class PointProgramService {

    private final PointProgramRepository pointProgramRepository;
    private final StorefrontRepository storefrontRepository;
    private final OrganizationRepository organizationRepository;
    private final UserPointProgramRepository userPointProgramRepository;
    private final UserRepository userRepository;

    public PointProgramService(
        PointProgramRepository pointProgramRepository,
        StorefrontRepository storefrontRepository,
        OrganizationRepository organizationRepository,
        UserPointProgramRepository userPointProgramRepository,
        UserRepository userRepository
    ) {
        this.pointProgramRepository = pointProgramRepository;
        this.storefrontRepository = storefrontRepository;
        this.organizationRepository = organizationRepository;
        this.userPointProgramRepository = userPointProgramRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<PointProgram> listByOrganization(UUID organizationId) {
        return pointProgramRepository.findByOrganizationIdOrderByCreatedAt(organizationId);
    }

    @Transactional
    public PointProgram create(PointProgramCreateRequest request, UUID organizationId) {
        Organization organization = organizationRepository
            .findById(organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + organizationId + "."));

        PointProgram program = new PointProgram();
        program.setOrganization(organization);
        program.setName(request.name().trim());
        program.setUnitLabel(blankToNull(request.unitLabel()));
        if (request.storefrontIds() != null && !request.storefrontIds().isEmpty()) {
            program.setStorefronts(resolveOwnedStorefronts(request.storefrontIds(), organizationId));
        }
        return saveUnique(program);
    }

    @Transactional
    public PointProgram update(UUID id, PointProgramUpdateRequest request, UUID organizationId) {
        PointProgram program = getOwned(id, organizationId);
        program.setName(request.name().trim());
        program.setUnitLabel(blankToNull(request.unitLabel()));
        if (request.active() != null) {
            program.setActive(request.active());
        }
        return saveUnique(program);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional
    public PointProgram attachStorefronts(UUID id, List<UUID> storefrontIds, UUID organizationId) {
        PointProgram program = getOwned(id, organizationId);
        program.getStorefronts().addAll(resolveOwnedStorefronts(storefrontIds, organizationId));
        return pointProgramRepository.save(program);
    }

    @Transactional
    public PointProgram detachStorefronts(UUID id, List<UUID> storefrontIds, UUID organizationId) {
        PointProgram program = getOwned(id, organizationId);
        Set<UUID> toRemove = new HashSet<>(storefrontIds);
        program.getStorefronts().removeIf(s -> toRemove.contains(s.getId()));
        return pointProgramRepository.save(program);
    }

    /** Self-service join: a user opts in to any active program. */
    @Transactional
    public void join(UUID userId, UUID programId) {
        PointProgram program = pointProgramRepository
            .findById(programId)
            .filter(PointProgram::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar el programa de puntos con ID " + programId + "."));
        User user = userRepository
            .findById(userId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + userId + "."));
        joinIfMissing(user, program);
    }

    /** Staff joining a user to one of their own organization's programs on the user's behalf. */
    @Transactional
    public void joinOnBehalf(UUID userId, UUID programId, UUID organizationId) {
        PointProgram program = getOwned(programId, organizationId);
        User user = userRepository
            .findById(userId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + userId + "."));
        joinIfMissing(user, program);
    }

    private void joinIfMissing(User user, PointProgram program) {
        if (userPointProgramRepository.existsByUser_IdAndPointProgram_Id(user.getId(), program.getId())) {
            return;
        }
        UserPointProgram membership = new UserPointProgram();
        membership.setUser(user);
        membership.setPointProgram(program);
        userPointProgramRepository.save(membership);
    }

    private PointProgram getOwned(UUID id, UUID organizationId) {
        return pointProgramRepository
            .findByIdAndOrganizationId(id, organizationId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar el programa de puntos con ID " + id + "."));
    }

    private Set<Storefront> resolveOwnedStorefronts(List<UUID> storefrontIds, UUID organizationId) {
        Set<Storefront> resolved = new HashSet<>();
        for (UUID storefrontId : storefrontIds) {
            resolved.add(
                storefrontRepository
                    .findByIdAndOrganizationId(storefrontId, organizationId)
                    .orElseThrow(() -> new BadRequestException("El local " + storefrontId + " no pertenece a esta organización."))
            );
        }
        return resolved;
    }

    private PointProgram saveUnique(PointProgram program) {
        try {
            return pointProgramRepository.saveAndFlush(program);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException("Ya existe un programa de puntos con ese nombre.");
        }
    }
}
