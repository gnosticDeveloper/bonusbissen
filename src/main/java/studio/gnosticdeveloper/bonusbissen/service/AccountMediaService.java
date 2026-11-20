package studio.gnosticdeveloper.bonusbissen.service;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.storage.StorageFolder;

@Service
public class AccountMediaService {

    private final UserRepository users;
    private final OrganizationRepository organizations;
    private final AccountImageService images;

    public AccountMediaService(UserRepository users, OrganizationRepository organizations, AccountImageService images) {
        this.users = users;
        this.organizations = organizations;
        this.images = images;
    }

    @Transactional
    public User setProfilePicture(UUID userId, MultipartFile file) {
        User user = user(userId);
        String path = images.store(file, StorageFolder.PFP);
        String oldPath = user.getProfilePicturePath();
        user.setProfilePicturePath(path);
        try {
            user = users.save(user);
        } catch (RuntimeException e) {
            images.deleteOld(path);
            throw e;
        }
        images.deleteOld(oldPath);
        return user;
    }

    @Transactional
    public User removeProfilePicture(UUID userId) {
        User user = user(userId);
        String oldPath = user.getProfilePicturePath();
        user.setProfilePicturePath(null);
        user = users.save(user);
        images.deleteOld(oldPath);
        return user;
    }

    @Transactional
    public Organization setLogo(UUID organizationId, MultipartFile file) {
        Organization organization = organization(organizationId);
        String path = images.store(file, StorageFolder.LOGOS);
        String oldPath = organization.getLogoPath();
        organization.setLogoPath(path);
        try {
            organization = organizations.save(organization);
        } catch (RuntimeException e) {
            images.deleteOld(path);
            throw e;
        }
        images.deleteOld(oldPath);
        return organization;
    }

    @Transactional
    public Organization removeLogo(UUID organizationId) {
        Organization organization = organization(organizationId);
        String oldPath = organization.getLogoPath();
        organization.setLogoPath(null);
        organization = organizations.save(organization);
        images.deleteOld(oldPath);
        return organization;
    }

    @Transactional
    public Organization setBanner(UUID organizationId, MultipartFile file) {
        Organization organization = organization(organizationId);
        String path = images.store(file, StorageFolder.BANNERS);
        String oldPath = organization.getBannerPath();
        organization.setBannerPath(path);
        try {
            organization = organizations.save(organization);
        } catch (RuntimeException e) {
            images.deleteOld(path);
            throw e;
        }
        images.deleteOld(oldPath);
        return organization;
    }

    @Transactional
    public Organization removeBanner(UUID organizationId) {
        Organization organization = organization(organizationId);
        String oldPath = organization.getBannerPath();
        organization.setBannerPath(null);
        organization = organizations.save(organization);
        images.deleteOld(oldPath);
        return organization;
    }

    private User user(UUID id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id, "No pudimos encontrar tu usuario."));
    }

    /** billingPlan fetch-joined -- setLogo/setBanner etc. hand the result to OrganizationResponse after this transaction closes. */
    private Organization organization(UUID id) {
        return organizations.findByIdWithBillingPlan(id).orElseThrow(() -> new NotFoundException("Organization not found: " + id, "No pudimos encontrar la organización."));
    }
}
