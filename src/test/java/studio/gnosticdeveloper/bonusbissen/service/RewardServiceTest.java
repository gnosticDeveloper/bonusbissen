package studio.gnosticdeveloper.bonusbissen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

@ExtendWith(MockitoExtension.class)
class RewardServiceTest {

    @Mock
    private RewardRepository rewardRepository;

    @Mock
    private PointProgramRepository pointProgramRepository;

    @InjectMocks
    private RewardService rewardService;

    private static PointProgram programOwnedBy(UUID organizationId) {
        Organization organization = new Organization();
        organization.setId(organizationId);
        PointProgram program = new PointProgram();
        program.setId(UUID.randomUUID());
        program.setOrganization(organization);
        return program;
    }

    @Test
    void createWithoutImageSavesRewardWithNullImagePath() {
        UUID organizationId = UUID.randomUUID();
        PointProgram program = programOwnedBy(organizationId);

        RewardCreateRequest request = new RewardCreateRequest("Free Coffee", "A hot coffee", null, 10, null, program.getId());
        when(pointProgramRepository.findByIdAndOrganizationId(program.getId(), organizationId)).thenReturn(Optional.of(program));
        when(rewardRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Reward reward = rewardService.create(request, organizationId);

        assertThat(reward.getTitle()).isEqualTo("Free Coffee");
        assertThat(reward.getDescription()).isEqualTo("A hot coffee");
        assertThat(reward.getCostPoints()).isEqualTo(10);
        assertThat(reward.getImagePath()).isNull();
        assertThat(reward.getPointProgram()).isSameAs(program);
    }

    @Test
    void deleteMarksRewardAsInactiveInsteadOfRemovingIt() {
        UUID id = UUID.randomUUID();
        UUID organizationId = UUID.randomUUID();

        Reward reward = new Reward();
        reward.setId(id);
        reward.setActive(true);
        reward.setPointProgram(programOwnedBy(organizationId));

        when(rewardRepository.findById(id)).thenReturn(Optional.of(reward));
        when(rewardRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        rewardService.delete(id, organizationId);

        assertThat(reward.isActive()).isFalse();
        verify(rewardRepository).save(reward);
    }

    @Test
    void deleteWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(rewardRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rewardService.delete(id, UUID.randomUUID())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void findByIdWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(rewardRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rewardService.findById(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void listActiveNormalizesBlankSearchToNull() {
        UUID organizationId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);

        rewardService.listActive("   ", organizationId, null, null, pageable);

        verify(rewardRepository).findByActiveTrue(isNull(), eq(organizationId), isNull(), eq(pageable));
    }

    @Test
    void listActiveTrimsSearchTerm() {
        UUID organizationId = UUID.randomUUID();
        UUID programId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 10);

        rewardService.listActive("  coffee  ", organizationId, programId, null, pageable);

        verify(rewardRepository).findByActiveTrue(eq("coffee"), eq(organizationId), eq(programId), eq(pageable));
    }

    @Test
    void getTopRewardsDelegatesToRepositoryWithTopTenPageable() {
        UUID organizationId = UUID.randomUUID();
        List<TopRewardResponse> expected = List.of(new TopRewardResponse(UUID.randomUUID(), "Free Coffee", 5, 10));
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        when(rewardRepository.getTopRewards(eq(organizationId), pageableCaptor.capture())).thenReturn(expected);

        List<TopRewardResponse> result = rewardService.getTopRewards(organizationId);

        assertThat(result).isEqualTo(expected);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(0);
    }
}
