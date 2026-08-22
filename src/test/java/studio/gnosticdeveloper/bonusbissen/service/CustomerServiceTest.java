package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.InactiveCustomerConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.InsufficientPointsException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private CustomerService customerService;

    private static final UUID EMPLOYEE_ID = UUID.randomUUID();

    private Employee employeeWithOrganization() {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());

        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);
        employee.setOrganization(organization);
        return employee;
    }

    @Test
    void createRejectsDuplicatePhone() {
        Customer existing = new Customer();
        existing.setId(UUID.randomUUID());
        existing.setPhone("123");
        existing.setActive(true);
        when(customerRepository.findByPhone("123")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> customerService.create(new CustomerCreateRequest("Someone", "123", null), EMPLOYEE_ID))
            .isInstanceOf(ConflictException.class);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void createWithInactiveExistingPhoneThrowsInactiveCustomerConflict() {
        Customer existing = new Customer();
        existing.setId(UUID.randomUUID());
        existing.setPhone("123");
        existing.setActive(false);
        when(customerRepository.findByPhone("123")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> customerService.create(new CustomerCreateRequest("Someone", "123", null), EMPLOYEE_ID))
            .isInstanceOf(InactiveCustomerConflictException.class);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void createSavesNewCustomer() {
        when(customerRepository.findByPhone("123")).thenReturn(Optional.empty());
        when(customerRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Customer customer = customerService.create(new CustomerCreateRequest("Someone", "123", null), EMPLOYEE_ID);

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
    void searchBlankTermIsTreatedAsNoFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        when(customerRepository.search(isNull(), eq(pageable))).thenReturn(Page.empty());

        customerService.search("   ", pageable);

        verify(customerRepository).search(isNull(), eq(pageable));
    }

    @Test
    void searchTrimsTermAndMapsResultsToResponses() {
        Pageable pageable = PageRequest.of(0, 10);
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setName("Someone");
        customer.setPhone("123");
        customer.setCreatedAt(java.time.OffsetDateTime.now());

        when(customerRepository.search(eq("abc"), eq(pageable))).thenReturn(new PageImpl<>(List.of(customer)));
        when(pointTransactionRepository.calculatePointsByCustomerId(customer.getId())).thenReturn(50);

        Page<CustomerPointsResponse> result = customerService.search("  abc  ", pageable);

        assertThat(result.getContent()).containsExactly(CustomerPointsResponse.from(customer, 50));
    }

    @Test
    void deleteByIdWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(customerRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.deleteById(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void getByPhoneReturnsActiveCustomer() {
        Customer customer = new Customer();
        customer.setPhone("123");
        customer.setActive(true);

        when(customerRepository.findByPhone("123")).thenReturn(Optional.of(customer));

        assertThat(customerService.getByPhone("123")).isSameAs(customer);
    }

    @Test
    void getByPhoneWithInactiveCustomerThrowsNotFound() {
        Customer customer = new Customer();
        customer.setPhone("123");
        customer.setActive(false);

        when(customerRepository.findByPhone("123")).thenReturn(Optional.of(customer));

        assertThatThrownBy(() -> customerService.getByPhone("123")).isInstanceOf(NotFoundException.class);
    }

    @Test
    void grantPointsWithInactiveCustomerThrowsNotFound() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setActive(false);

        when(employeeRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employeeWithOrganization()));
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));

        assertThatThrownBy(() -> customerService.grantPoints(new GrantPointsRequest(customerId, 50, null), EMPLOYEE_ID))
            .isInstanceOf(NotFoundException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void claimRewardWithInactiveCustomerThrowsNotFound() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setActive(false);

        UUID rewardId = UUID.randomUUID();

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));

        assertThatThrownBy(() -> customerService.claimReward(new ClaimRewardRequest(customerId, rewardId)))
            .isInstanceOf(NotFoundException.class);

        verify(rewardRepository, never()).findById(any());
        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void grantPointsCreatesDeliveredEarnTransaction() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);
        customer.setName("Someone");

        when(employeeRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employeeWithOrganization()));
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CustomerPointsAwardResponse response = customerService.grantPoints(new GrantPointsRequest(customerId, 50, null), EMPLOYEE_ID);

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
        when(employeeRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employeeWithOrganization()));
        when(customerRepository.findById(customerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.grantPoints(new GrantPointsRequest(customerId, 50, null), EMPLOYEE_ID))
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
        when(pointTransactionRepository.calculatePointsByCustomerId(customerId)).thenReturn(30);
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
    void claimRewardWithInsufficientBalanceThrowsInsufficientPoints() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);

        UUID rewardId = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(rewardId);
        reward.setCostPoints(30);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.of(reward));
        when(pointTransactionRepository.calculatePointsByCustomerId(customerId)).thenReturn(29);

        assertThatThrownBy(() -> customerService.claimReward(new ClaimRewardRequest(customerId, rewardId)))
            .isInstanceOf(InsufficientPointsException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void claimRewardWithDeactivatedRewardThrowsNotFound() {
        UUID customerId = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(customerId);

        UUID rewardId = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(rewardId);
        reward.setCostPoints(30);
        reward.setActive(false);

        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.of(reward));

        assertThatThrownBy(() -> customerService.claimReward(new ClaimRewardRequest(customerId, rewardId)))
            .isInstanceOf(NotFoundException.class);

        verify(pointTransactionRepository, never()).save(any());
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

    private PointTransaction grantTransaction(UUID organizationId) {
        Organization organization = new Organization();
        organization.setId(organizationId);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setOrganization(organization);

        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setName("Someone");

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setEmployee(employee);
        tx.setCustomer(customer);
        tx.setPoints(50);
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx.setCreatedAt(java.time.OffsetDateTime.now());
        return tx;
    }

    @Test
    void updateGrantChangesPointsAndNote() {
        UUID organizationId = UUID.randomUUID();
        PointTransaction tx = grantTransaction(organizationId);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PointActionResponse response = customerService.updateGrant(
            tx.getId(),
            new GrantPointsUpdateRequest(75, "cumpleaños"),
            organizationId
        );

        assertThat(response.amount()).isEqualTo(75);
        assertThat(response.note()).isEqualTo("cumpleaños");
        assertThat(tx.getPoints()).isEqualTo(75);
        assertThat(tx.getNote()).isEqualTo("cumpleaños");
    }

    @Test
    void updateGrantForAnotherOrganizationThrowsAccessDenied() {
        PointTransaction tx = grantTransaction(UUID.randomUUID());
        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> customerService.updateGrant(tx.getId(), new GrantPointsUpdateRequest(75, null), UUID.randomUUID()))
            .isInstanceOf(AccessDeniedException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void updateGrantOnARefundThrowsNotFound() {
        UUID organizationId = UUID.randomUUID();
        PointTransaction refund = new PointTransaction();
        refund.setId(UUID.randomUUID());
        refund.setTransactionType(TransactionType.EARN);
        refund.setState(TransactionState.DELIVERED);
        refund.setPoints(30);

        when(pointTransactionRepository.findById(refund.getId())).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> customerService.updateGrant(refund.getId(), new GrantPointsUpdateRequest(30, null), organizationId))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteGrantRemovesTheTransaction() {
        UUID organizationId = UUID.randomUUID();
        PointTransaction tx = grantTransaction(organizationId);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        customerService.deleteGrant(tx.getId(), organizationId);

        verify(pointTransactionRepository).delete(tx);
    }

    @Test
    void updateChangesNameAndPhone() {
        UUID id = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(id);
        customer.setName("Someone");
        customer.setPhone("123");

        when(customerRepository.findById(id)).thenReturn(Optional.of(customer));
        when(customerRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Customer updated = customerService.update(id, new CustomerUpdateRequest("Someone Else", "456"));

        assertThat(updated.getName()).isEqualTo("Someone Else");
        assertThat(updated.getPhone()).isEqualTo("456");
    }

    @Test
    void updateWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(customerRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customerService.update(id, new CustomerUpdateRequest("Someone", "456")))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateToAPhoneAlreadyUsedByAnotherCustomerThrowsConflict() {
        UUID id = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(id);
        customer.setPhone("123");

        Customer other = new Customer();
        other.setId(UUID.randomUUID());
        other.setPhone("456");

        when(customerRepository.findById(id)).thenReturn(Optional.of(customer));
        when(customerRepository.findByPhone("456")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> customerService.update(id, new CustomerUpdateRequest("Someone", "456")))
            .isInstanceOf(ConflictException.class);

        verify(customerRepository, never()).save(any());
    }

    @Test
    void updateKeepingTheSamePhoneDoesNotCheckForConflicts() {
        UUID id = UUID.randomUUID();
        Customer customer = new Customer();
        customer.setId(id);
        customer.setName("Someone");
        customer.setPhone("123");

        when(customerRepository.findById(id)).thenReturn(Optional.of(customer));
        when(customerRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        customerService.update(id, new CustomerUpdateRequest("Someone New", "123"));

        verify(customerRepository, never()).findByPhone(any());
    }
}
