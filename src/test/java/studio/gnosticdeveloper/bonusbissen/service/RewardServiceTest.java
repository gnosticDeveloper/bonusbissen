// package studio.gnosticdeveloper.bonusbissen.service;

// import org.junit.jupiter.api.Test;
// import org.junit.jupiter.api.extension.ExtendWith;
// import org.mockito.InjectMocks;
// import org.mockito.Mock;
// import org.mockito.junit.jupiter.MockitoExtension;
// import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
// import studio.gnosticdeveloper.bonusbissen.entity.BenefitType;
// import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
// import studio.gnosticdeveloper.bonusbissen.repository.MenuItemRepository;
// import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

// import java.math.BigDecimal;
// import java.util.UUID;

// import static org.assertj.core.api.Assertions.assertThatThrownBy;

// @ExtendWith(MockitoExtension.class)
// class RewardServiceTest {

//     @Mock
//     private RewardRepository rewardRepository;

//     @Mock
//     private MenuItemRepository menuItemRepository;

//     @InjectMocks
//     private RewardService rewardService;

//     @Test
//     void freeItemRewardWithoutMenuItemIsRejected() {
//         RewardCreateRequest request = new RewardCreateRequest("Free Coffee", null, 10, BenefitType.FREE_ITEM, null, null);

//         assertThatThrownBy(() -> rewardService.create(request))
//                 .isInstanceOf(BadRequestException.class)
//                 .hasMessageContaining("menuItemId");
//     }

//     @Test
//     void freeItemRewardWithDiscountValueIsRejected() {
//         RewardCreateRequest request = new RewardCreateRequest(
//                 "Free Coffee", null, 10, BenefitType.FREE_ITEM, UUID.randomUUID(), BigDecimal.TEN);

//         assertThatThrownBy(() -> rewardService.create(request))
//                 .isInstanceOf(BadRequestException.class)
//                 .hasMessageContaining("discountValue");
//     }

//     @Test
//     void discountRewardWithoutDiscountValueIsRejected() {
//         RewardCreateRequest request = new RewardCreateRequest(
//                 "10% off", null, 10, BenefitType.DISCOUNT_PERCENTAGE, null, null);

//         assertThatThrownBy(() -> rewardService.create(request))
//                 .isInstanceOf(BadRequestException.class)
//                 .hasMessageContaining("discountValue");
//     }
// }
