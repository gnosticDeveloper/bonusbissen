package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PointTransactionServiceTest {

    @Mock
    private PointTransactionRepository pointTransactionRepository;
    @Mock
    private ExchangeCodeRepository exchangeCodeRepository;
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private PointTransactionService pointTransactionService;

    @Test
    void approveExchangeMarksTransactionAsDeliveredAndAssignsEmployee() {
        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));

        pointTransactionService.approveExchange(new ApproveExchangeRequest(tx.getId(), employee.getId()));

        assertThat(tx.getState()).isEqualTo(TransactionState.DELIVERED);
        assertThat(tx.getEmployee()).isEqualTo(employee);
        verify(pointTransactionRepository).save(tx);
    }

    @Test
    void approveExchangeWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(pointTransactionRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pointTransactionService.approveExchange(new ApproveExchangeRequest(id, UUID.randomUUID())))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void approveExchangeThatIsNotPendingThrowsConflict() {
        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.DELIVERED);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.approveExchange(new ApproveExchangeRequest(tx.getId(), UUID.randomUUID())))
            .isInstanceOf(ConflictException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void cancelExchangeWithoutRefundOnlySavesTheOriginalTransaction() {
        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPoints(-20);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));

        pointTransactionService.cancelExchange(new CancelExchangeRequest(tx.getId(), employee.getId(), false));

        assertThat(tx.getState()).isEqualTo(TransactionState.CANCELLED);
        verify(pointTransactionRepository, times(1)).save(any());
    }

    @Test
    void cancelExchangeThatIsNotPendingThrowsConflict() {
        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.CANCELLED);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.cancelExchange(new CancelExchangeRequest(tx.getId(), UUID.randomUUID(), true)))
            .isInstanceOf(ConflictException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void cancelExchangeWithRefundCreatesAnEarnTransactionForTheAbsoluteAmount() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPoints(-20);
        tx.setCustomer(customer);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        pointTransactionService.cancelExchange(new CancelExchangeRequest(tx.getId(), employee.getId(), true));

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository, times(2)).save(captor.capture());

        PointTransaction refund = captor.getAllValues().get(1);
        assertThat(refund.getPoints()).isEqualTo(20);
        assertThat(refund.getTransactionType()).isEqualTo(TransactionType.EARN);
        assertThat(refund.getState()).isEqualTo(TransactionState.DELIVERED);
        assertThat(refund.getCustomer()).isEqualTo(customer);
    }

    @Test
    void customerCancelExchangeAlwaysRefundsPoints() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPoints(-15);
        tx.setCustomer(customer);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        pointTransactionService.customerCancelExchange(new CustomerCancelExchangeRequest(tx.getId()), customer.getId());

        assertThat(tx.getState()).isEqualTo(TransactionState.CANCELLED);

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository, times(2)).save(captor.capture());

        PointTransaction refund = captor.getAllValues().get(1);
        assertThat(refund.getPoints()).isEqualTo(15);
        assertThat(refund.getTransactionType()).isEqualTo(TransactionType.EARN);
        assertThat(refund.getState()).isEqualTo(TransactionState.DELIVERED);
    }

    @Test
    void customerCancelExchangeForAnotherCustomerThrowsAccessDenied() {
        Customer owner = new Customer();
        owner.setId(UUID.randomUUID());
        UUID caller = UUID.randomUUID();

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPoints(-15);
        tx.setCustomer(owner);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.customerCancelExchange(new CustomerCancelExchangeRequest(tx.getId()), caller))
            .isInstanceOf(AccessDeniedException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void customerCancelExchangeThatIsNotPendingThrowsConflict() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.DELIVERED);
        tx.setCustomer(customer);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.customerCancelExchange(new CustomerCancelExchangeRequest(tx.getId()), customer.getId()))
            .isInstanceOf(ConflictException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void verifyExchangeWithUnknownCodeThrowsNotFound() {
        when(exchangeCodeRepository.findActiveByCode("000000")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pointTransactionService.verifyExchange("000000")).isInstanceOf(NotFoundException.class);
    }
}
