package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointTransactionCreateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.*;
import studio.gnosticdeveloper.bonusbissen.exception.InsufficientPointsException;
import studio.gnosticdeveloper.bonusbissen.repository.*;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PointTransactionServiceTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private MenuItemRepository menuItemRepository;
    @Mock
    private RewardRepository rewardRepository;
    @Mock
    private PointTransactionRepository pointTransactionRepository;

    @InjectMocks
    private PointTransactionService pointTransactionService;

    @Test
    void redemptionBelowBalanceThrowsInsufficientPoints() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setDocument("doc-1");

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());

        Reward reward = new Reward();
        reward.setId(UUID.randomUUID());
        reward.setCostPoints(50);

        when(customerRepository.findByDocumentForUpdate("doc-1")).thenReturn(Optional.of(customer));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(rewardRepository.findById(reward.getId())).thenReturn(Optional.of(reward));
        when(pointTransactionRepository.sumPointsDeltaByCustomerId(customer.getId())).thenReturn(20);

        PointTransactionCreateRequest request = new PointTransactionCreateRequest(
                "doc-1", TransactionType.REDEMPTION, null, reward.getId(), null, null);

        assertThatThrownBy(() -> pointTransactionService.create(request, employee.getId()))
                .isInstanceOf(InsufficientPointsException.class);
    }

    @Test
    void purchaseSetsPositivePointsDeltaFromMenuItem() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setDocument("doc-2");

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());

        MenuItem menuItem = new MenuItem();
        menuItem.setId(UUID.randomUUID());
        menuItem.setPointsValue(15);

        when(customerRepository.findByDocumentForUpdate("doc-2")).thenReturn(Optional.of(customer));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(menuItemRepository.findById(menuItem.getId())).thenReturn(Optional.of(menuItem));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(pointTransactionRepository.sumPointsDeltaByCustomerId(customer.getId())).thenReturn(15);

        PointTransactionCreateRequest request = new PointTransactionCreateRequest(
                "doc-2", TransactionType.PURCHASE, menuItem.getId(), null, null, null);

        PointTransactionService.Result result = pointTransactionService.create(request, employee.getId());

        assertThat(result.transaction().getPointsDelta()).isEqualTo(15);
        assertThat(result.newBalance()).isEqualTo(15);
    }
}
