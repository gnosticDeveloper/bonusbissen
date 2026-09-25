package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.UserPointProgram;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserPointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PointProgramServiceTest {

    @Mock
    private PointProgramRepository pointProgramRepository;
    @Mock
    private StorefrontRepository storefrontRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private UserPointProgramRepository userPointProgramRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PointProgramService pointProgramService;

    private static final UUID PROGRAM_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ORGANIZATION_ID = UUID.randomUUID();
    private static final UUID STOREFRONT_ID = UUID.randomUUID();

    private PointProgram activeProgram() {
        PointProgram program = new PointProgram();
        program.setId(PROGRAM_ID);
        program.setActive(true);
        return program;
    }

    private User user() {
        User user = new User();
        user.setId(USER_ID);
        return user;
    }

    private Storefront storefrontWithProgram(PointProgram program) {
        Storefront storefront = new Storefront();
        storefront.setId(STOREFRONT_ID);
        storefront.setPointProgram(program);
        return storefront;
    }

    @Test
    void joinCreatesMembershipWhenMissing() {
        when(pointProgramRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(activeProgram()));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(userPointProgramRepository.existsByUser_IdAndPointProgram_Id(USER_ID, PROGRAM_ID)).thenReturn(false);

        pointProgramService.join(USER_ID, PROGRAM_ID);

        ArgumentCaptor<UserPointProgram> captor = ArgumentCaptor.forClass(UserPointProgram.class);
        verify(userPointProgramRepository).save(captor.capture());
        assertThat(captor.getValue().getUser().getId()).isEqualTo(USER_ID);
        assertThat(captor.getValue().getPointProgram().getId()).isEqualTo(PROGRAM_ID);
    }

    @Test
    void joinIsIdempotentWhenAlreadyAMember() {
        when(pointProgramRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(activeProgram()));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(userPointProgramRepository.existsByUser_IdAndPointProgram_Id(USER_ID, PROGRAM_ID)).thenReturn(true);

        pointProgramService.join(USER_ID, PROGRAM_ID);

        verify(userPointProgramRepository, never()).save(any());
    }

    @Test
    void joinWithInactiveProgramThrowsNotFound() {
        PointProgram inactive = activeProgram();
        inactive.setActive(false);
        when(pointProgramRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> pointProgramService.join(USER_ID, PROGRAM_ID)).isInstanceOf(NotFoundException.class);

        verify(userPointProgramRepository, never()).save(any());
    }

    @Test
    void joinOnBehalfRequiresTheProgramBelongToTheCallersOrganization() {
        when(pointProgramRepository.findByIdAndOrganizationId(PROGRAM_ID, ORGANIZATION_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pointProgramService.joinOnBehalf(USER_ID, PROGRAM_ID, ORGANIZATION_ID)).isInstanceOf(NotFoundException.class);

        verify(userPointProgramRepository, never()).save(any());
    }

    @Test
    void joinOnBehalfCreatesMembershipForAnOwnedProgram() {
        when(pointProgramRepository.findByIdAndOrganizationId(PROGRAM_ID, ORGANIZATION_ID)).thenReturn(Optional.of(activeProgram()));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(userPointProgramRepository.existsByUser_IdAndPointProgram_Id(USER_ID, PROGRAM_ID)).thenReturn(false);

        pointProgramService.joinOnBehalf(USER_ID, PROGRAM_ID, ORGANIZATION_ID);

        verify(userPointProgramRepository).save(any(UserPointProgram.class));
    }

    @Test
    void joinByStorefrontJoinsUsingTheStorefrontsProgram() {
        when(storefrontRepository.findById(STOREFRONT_ID)).thenReturn(Optional.of(storefrontWithProgram(activeProgram())));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(userPointProgramRepository.existsByUser_IdAndPointProgram_Id(USER_ID, PROGRAM_ID)).thenReturn(false);

        pointProgramService.joinByStorefront(USER_ID, STOREFRONT_ID);

        ArgumentCaptor<UserPointProgram> captor = ArgumentCaptor.forClass(UserPointProgram.class);
        verify(userPointProgramRepository).save(captor.capture());
        assertThat(captor.getValue().getPointProgram().getId()).isEqualTo(PROGRAM_ID);
    }

    @Test
    void joinByStorefrontThrowsWhenStorefrontHasNoProgram() {
        when(storefrontRepository.findById(STOREFRONT_ID)).thenReturn(Optional.of(storefrontWithProgram(null)));

        assertThatThrownBy(() -> pointProgramService.joinByStorefront(USER_ID, STOREFRONT_ID)).isInstanceOf(NotFoundException.class);

        verify(userPointProgramRepository, never()).save(any());
    }

    @Test
    void joinByStorefrontThrowsWhenProgramIsInactive() {
        PointProgram inactive = activeProgram();
        inactive.setActive(false);
        when(storefrontRepository.findById(STOREFRONT_ID)).thenReturn(Optional.of(storefrontWithProgram(inactive)));

        assertThatThrownBy(() -> pointProgramService.joinByStorefront(USER_ID, STOREFRONT_ID)).isInstanceOf(NotFoundException.class);

        verify(userPointProgramRepository, never()).save(any());
    }

    @Test
    void attachStorefrontsRejectsAStorefrontAlreadyOnAnotherProgram() {
        UUID otherProgramId = UUID.randomUUID();
        PointProgram otherProgram = new PointProgram();
        otherProgram.setId(otherProgramId);
        Storefront storefront = storefrontWithProgram(otherProgram);

        PointProgram target = activeProgram();
        when(pointProgramRepository.findByIdAndOrganizationId(PROGRAM_ID, ORGANIZATION_ID)).thenReturn(Optional.of(target));
        when(storefrontRepository.findByIdAndOrganizationId(STOREFRONT_ID, ORGANIZATION_ID)).thenReturn(Optional.of(storefront));

        assertThatThrownBy(() -> pointProgramService.attachStorefronts(PROGRAM_ID, List.of(STOREFRONT_ID), ORGANIZATION_ID))
            .isInstanceOf(ConflictException.class);

        verify(storefrontRepository, never()).save(any());
    }
}
