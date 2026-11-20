package studio.gnosticdeveloper.bonusbissen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.storage.StorageFolder;

@ExtendWith(MockitoExtension.class)
class AccountMediaServiceTest {
    @Mock UserRepository users;
    @Mock OrganizationRepository organizations;
    @Mock AccountImageService images;

    private AccountMediaService service;
    private User user;
    private Organization organization;
    private MockMultipartFile file;

    @BeforeEach
    void setUp() {
        service = new AccountMediaService(users, organizations, images);
        user = new User();
        user.setId(UUID.randomUUID());
        organization = new Organization();
        organization.setId(UUID.randomUUID());
        file = new MockMultipartFile("image", "test.png", "image/png", new byte[] {1});
    }

    @Test
    void profileReplacementKeepsPreviousImageWhenUploadFails() {
        user.setProfilePicturePath("rewards/old");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(images.store(file, StorageFolder.PFP)).thenThrow(new IllegalArgumentException("invalid"));
        assertThatThrownBy(() -> service.setProfilePicture(user.getId(), file)).hasMessage("invalid");
        assertThat(user.getProfilePicturePath()).isEqualTo("rewards/old");
        verify(users, never()).save(any());
        verify(images, never()).deleteOld(any());
    }

    @Test
    void profileReplaceAndRemoveDeleteOnlyPriorFile() {
        user.setProfilePicturePath("rewards/old");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(users.save(user)).thenReturn(user);
        when(images.store(file, StorageFolder.PFP)).thenReturn("pfp/new");
        assertThat(service.setProfilePicture(user.getId(), file).getProfilePicturePath()).isEqualTo("pfp/new");
        verify(images).deleteOld("rewards/old");
        assertThat(service.removeProfilePicture(user.getId()).getProfilePicturePath()).isNull();
        verify(images).deleteOld("pfp/new");
    }

    @Test
    void organizationLogoAndBannerAreIndependent() {
        organization.setLogoPath("rewards/logo-old");
        organization.setBannerPath("rewards/banner-old");
        when(organizations.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(organizations.save(organization)).thenReturn(organization);
        when(images.store(file, StorageFolder.LOGOS)).thenReturn("logos/logo-new");
                when(images.store(file, StorageFolder.BANNERS)).thenReturn("banners/banner-new");
        assertThat(service.setLogo(organization.getId(), file).getLogoPath()).isEqualTo("logos/logo-new");
        assertThat(organization.getBannerPath()).isEqualTo("rewards/banner-old");
        assertThat(service.setBanner(organization.getId(), file).getBannerPath()).isEqualTo("banners/banner-new");
        verify(images).deleteOld("rewards/logo-old");
        verify(images).deleteOld("rewards/banner-old");
        service.removeLogo(organization.getId());
        service.removeBanner(organization.getId());
        assertThat(organization.getLogoPath()).isNull();
        assertThat(organization.getBannerPath()).isNull();
        verify(images).deleteOld("logos/logo-new");
        verify(images).deleteOld("banners/banner-new");
    }
}
