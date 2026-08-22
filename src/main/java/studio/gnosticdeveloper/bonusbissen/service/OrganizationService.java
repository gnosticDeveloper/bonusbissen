package studio.gnosticdeveloper.bonusbissen.service;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.OrganizationUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;

    public OrganizationService(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public Organization getById(UUID id) {
        return organizationRepository.findById(id).orElseThrow(() -> new NotFoundException("No se pudo encontrar la organización con ID " + id + "."));
    }

    @Transactional
    public Organization update(UUID id, OrganizationUpdateRequest request) {
        Organization organization = getById(id);
        organization.setName(request.name());
        organization.setIconPath(request.icon());
        organization.setHours(request.hours());
        organization.setAddress(request.address());
        organization.setDescription(request.description());
        return organizationRepository.save(organization);
    }
}
