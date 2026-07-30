package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RewardServiceTest {

    @Mock
    private RewardRepository rewardRepository;

    @InjectMocks
    private RewardService rewardService;

    @Test
    void createWithoutImageSavesRewardWithNullImagePath() {
        RewardCreateRequest request = new RewardCreateRequest("Free Coffee", "A hot coffee", null, 10, null);
        when(rewardRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Reward reward = rewardService.create(request);

        assertThat(reward.getTitle()).isEqualTo("Free Coffee");
        assertThat(reward.getDescription()).isEqualTo("A hot coffee");
        assertThat(reward.getCostPoints()).isEqualTo(10);
        assertThat(reward.getImagePath()).isNull();
    }

    @Test
    void deleteMarksRewardAsInactiveInsteadOfRemovingIt() {
        UUID id = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(id);
        reward.setActive(true);

        when(rewardRepository.findById(id)).thenReturn(Optional.of(reward));
        when(rewardRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        rewardService.delete(id);

        assertThat(reward.isActive()).isFalse();
        verify(rewardRepository).save(reward);
    }

    @Test
    void deleteWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(rewardRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rewardService.delete(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void findByIdWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(rewardRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rewardService.findById(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void listActiveNormalizesBlankSearchToNull() {
        rewardService.listActive("   ");

        verify(rewardRepository).findByActiveTrue(isNull());
    }

    @Test
    void listActiveTrimsSearchTerm() {
        rewardService.listActive("  coffee  ");

        verify(rewardRepository).findByActiveTrue("coffee");
    }

    @Test
    void getTopRewardsDelegatesToRepositoryWithTopTenPageable() {
        List<TopRewardResponse> expected = List.of(new TopRewardResponse(UUID.randomUUID(), "Free Coffee", 5, 10));
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        when(rewardRepository.getTopRewards(pageableCaptor.capture())).thenReturn(expected);

        List<TopRewardResponse> result = rewardService.getTopRewards();

        assertThat(result).isEqualTo(expected);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(0);
    }
}
