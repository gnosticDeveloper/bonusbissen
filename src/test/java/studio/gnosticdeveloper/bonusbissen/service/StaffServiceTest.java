package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.dto.request.StaffCreateRequest;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StaffServiceTest {

    @Mock
    private OrganizationStaffRepository organizationStaffRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private StorefrontRepository storefrontRepository;

    @InjectMocks
    private StaffService staffService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ORGANIZATION_ID = UUID.randomUUID();
    private static final UUID STOREFRONT_ID = UUID.randomUUID();
    private static final UUID STAFF_ID = UUID.randomUUID();

    private User activeUser() {
        User user = new User();
        user.setId(USER_ID);
        user.setActive(true);
        return user;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(ORGANIZATION_ID);
        return organization;
    }

    private Storefront ownedStorefront() {
        Storefront storefront = new Storefront();
        storefront.setId(STOREFRONT_ID);
        return storefront;
    }

    @Test
    void createPromotesAnExistingUserNotAlreadyStaff() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(activeUser()));
        when(organizationStaffRepository.findByUserIdAndActiveTrue(USER_ID)).thenReturn(Optional.empty());
        when(organizationRepository.findById(ORGANIZATION_ID)).thenReturn(Optional.of(organization()));
        when(storefrontRepository.findByIdAndOrganizationId(STOREFRONT_ID, ORGANIZATION_ID)).thenReturn(Optional.of(ownedStorefront()));
        when(organizationStaffRepository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenAnswer(inv -> inv.getArgument(0));

        StaffCreateRequest request = new StaffCreateRequest(USER_ID, StaffRole.CASHIER, STOREFRONT_ID);
        OrganizationStaff created = staffService.create(request, ORGANIZATION_ID);

        assertThat(created.getUser().getId()).isEqualTo(USER_ID);
        assertThat(created.getOrganization().getId()).isEqualTo(ORGANIZATION_ID);
        assertThat(created.getRole()).isEqualTo(StaffRole.CASHIER);
        assertThat(created.getStorefronts()).extracting(Storefront::getId).containsExactly(STOREFRONT_ID);
    }

    @Test
    void createThrowsConflictWhenUserIsAlreadyStaffSomewhere() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(activeUser()));
        OrganizationStaff existing = new OrganizationStaff();
        when(organizationStaffRepository.findByUserIdAndActiveTrue(USER_ID)).thenReturn(Optional.of(existing));

        StaffCreateRequest request = new StaffCreateRequest(USER_ID, StaffRole.ADMIN, null);

        assertThatThrownBy(() -> staffService.create(request, ORGANIZATION_ID)).isInstanceOf(ConflictException.class);

        verify(organizationStaffRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void createThrowsNotFoundWhenUserDoesNotExist() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        StaffCreateRequest request = new StaffCreateRequest(USER_ID, StaffRole.ADMIN, null);

        assertThatThrownBy(() -> staffService.create(request, ORGANIZATION_ID)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void createRejectsAStorefrontFromAnotherOrganization() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(activeUser()));
        when(organizationStaffRepository.findByUserIdAndActiveTrue(USER_ID)).thenReturn(Optional.empty());
        when(organizationRepository.findById(ORGANIZATION_ID)).thenReturn(Optional.of(organization()));
        when(storefrontRepository.findByIdAndOrganizationId(STOREFRONT_ID, ORGANIZATION_ID)).thenReturn(Optional.empty());

        StaffCreateRequest request = new StaffCreateRequest(USER_ID, StaffRole.CASHIER, STOREFRONT_ID);

        assertThatThrownBy(() -> staffService.create(request, ORGANIZATION_ID)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void attachStorefrontsAddsToExistingAssignment() {
        OrganizationStaff staff = new OrganizationStaff();
        staff.setId(STAFF_ID);
        when(organizationStaffRepository.findByIdAndOrganizationId(STAFF_ID, ORGANIZATION_ID)).thenReturn(Optional.of(staff));
        when(storefrontRepository.findByIdAndOrganizationId(STOREFRONT_ID, ORGANIZATION_ID)).thenReturn(Optional.of(ownedStorefront()));
        when(organizationStaffRepository.save(staff)).thenReturn(staff);

        OrganizationStaff result = staffService.attachStorefronts(STAFF_ID, List.of(STOREFRONT_ID), ORGANIZATION_ID);

        assertThat(result.getStorefronts()).extracting(Storefront::getId).containsExactly(STOREFRONT_ID);
    }

    @Test
    void deactivateFlipsActiveFlag() {
        OrganizationStaff staff = new OrganizationStaff();
        staff.setId(STAFF_ID);
        staff.setActive(true);
        when(organizationStaffRepository.findByIdAndOrganizationId(STAFF_ID, ORGANIZATION_ID)).thenReturn(Optional.of(staff));

        staffService.deactivate(STAFF_ID, ORGANIZATION_ID);

        ArgumentCaptor<OrganizationStaff> captor = ArgumentCaptor.forClass(OrganizationStaff.class);
        verify(organizationStaffRepository).save(captor.capture());
        assertThat(captor.getValue().isActive()).isFalse();
    }
}
