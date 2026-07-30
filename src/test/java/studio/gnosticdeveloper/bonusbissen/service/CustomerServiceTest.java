package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private PointTransactionRepository pointTransactionRepository;
    @Mock
    private RewardRepository rewardRepository;
    @Mock
    private ExchangeCodeRepository exchangeCodeRepository;

    @InjectMocks
    private CustomerService customerService;

    @Test
    void createRejectsDuplicatePhone() {
        when(customerRepository.existsByPhone("123")).thenReturn(true);

        assertThatThrownBy(() -> customerService.create(new CustomerCreateRequest("Someone", "123")))
            .isInstanceOf(ConflictException.class);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void createSavesNewCustomer() {
        when(customerRepository.existsByPhone("123")).thenReturn(false);
        when(customerRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Customer customer = customerService.create(new CustomerCreateRequest("Someone", "123"));

        assertThat(customer.getName()).isEqualTo("Someone");
        assertThat(customer.getPhone()).isEqualTo("123");
    }

    @Test
    void deleteByIdMarksCustomerInactiveInsteadOfRemovingIt() {
        UUID id = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(id);
        customer.setActive(true);

        when(customerRepository.findById(id)).thenReturn(Optional.of(customer));
        when(customerRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        customerService.deleteById(id);

        assertThat(customer.isActive()).isFalse();
    }

    @Test
    void deleteByIdWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(customerRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.deleteById(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void grantPointsCreatesDeliveredEarnTransaction() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setName("Someone");

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerPointsAwardResponse response = customerService.grantPoints(new GrantPointsRequest(customerId, 50));

        assertThat(response.pointsGranted()).isEqualTo(50);
        assertThat(response.customerName()).isEqualTo("Someone");

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getTransactionType()).isEqualTo(TransactionType.EARN);
        assertThat(captor.getValue().getState()).isEqualTo(TransactionState.DELIVERED);
        assertThat(captor.getValue().getPoints()).isEqualTo(50);
    }

    @Test
    void grantPointsWithUnknownCustomerThrowsNotFound() {
        UUID customerId = UUID.randomUUID();
        when(customerRepository.findById(customerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.grantPoints(new GrantPointsRequest(customerId, 50)))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void claimRewardCreatesPendingRedeemTransactionWithNegativePoints() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);

        UUID rewardId = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(rewardId);
        reward.setCostPoints(30);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.of(reward));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        String code = customerService.claimReward(new ClaimRewardRequest(customerId, rewardId));

        assertThat(code).hasSize(6);

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getTransactionType()).isEqualTo(TransactionType.REDEEM);
        assertThat(captor.getValue().getState()).isEqualTo(TransactionState.PENDING);
        assertThat(captor.getValue().getPoints()).isEqualTo(-30);

        verify(exchangeCodeRepository).save(any(ExchangeCode.class));
    }

    @Test
    void claimRewardWithUnknownRewardThrowsNotFound() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);

        UUID rewardId = UUID.randomUUID();

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.claimReward(new ClaimRewardRequest(customerId, rewardId)))
            .isInstanceOf(NotFoundException.class);
    }
}
