package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

import org.springframework.security.access.AccessDeniedException;

@Service
public class PointTransactionService {

    private final PointTransactionRepository pointTransactionRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final EmployeeRepository employeeRepository;

    public PointTransactionService(
        PointTransactionRepository pointTransactionRepository,
        ExchangeCodeRepository exchangeCodeRepository,
        EmployeeRepository employeeRepository
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<ExchangeResponse> getAll(UUID organizationId) {
        return pointTransactionRepository.findAllWithRelations(organizationId).stream().map(ExchangeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ExchangeResponse> getResolved(UUID organizationId, Pageable pageable) {
        return pointTransactionRepository.findAllResolvedByOrganizationId(organizationId, pageable).stream().map(ExchangeResponse::from).toList();
    }

    @Transactional
    public List<PendingExchangeResponse> getAllPendingExchangesById(UUID customerId) {
        return pointTransactionRepository
            .findAllPendingByCustomerIdOrderByCreatedAtDesc(customerId, TransactionState.PENDING)
            .stream()
            .map(PendingExchangeResponse::from)
            .toList();
    }

    @Transactional
    public List<PendingExchangeReviewResponse> getAllByState(TransactionState state, UUID organizationId) {
        return pointTransactionRepository
            .findAllByStateAndOrganizationIdOrderByCreatedAtDesc(state, organizationId)
            .stream()
            .map(PendingExchangeReviewResponse::from)
            .toList();
    }

    @Transactional
    public Integer countByState(TransactionState state, UUID organizationId) {
        return pointTransactionRepository.countByStateAndOrganizationId(state, organizationId);
    }

    @Transactional
    public ExchangeResponse verifyExchange(String code, UUID organizationId) {
        ExchangeCode exchangeCode = exchangeCodeRepository
            .findActiveByCodeAndOrganizationId(code, organizationId)
            .orElseThrow(() -> new NotFoundException("No pudimos encontrar el código de intercambio: " + code));

        PointTransaction pointTransaction = exchangeCode.getPointTransaction();
        if (pointTransaction == null) {
            throw new NotFoundException("El código de intercambio no tiene una transacción de puntos hecha: " + code);
        }
        return ExchangeResponse.from(pointTransaction);
    }

    @Transactional
    public void approveExchange(ApproveExchangeRequest request, UUID organizationId) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findById(request.id())
            .orElseThrow(() -> new NotFoundException("Point transaction not found: " + request.id()));
        requireOwnership(pointTransaction, organizationId);

        if (pointTransaction.getState() != TransactionState.PENDING) {
            throw new ConflictException("El canje " + request.id() + " ya fue procesado (" + pointTransaction.getState() + ").");
        }

        Employee employee = employeeRepository
            .findById(request.employeeId())
            .orElseThrow(() -> new NotFoundException("Employee not found: " + request.employeeId()));

        pointTransaction.setState(TransactionState.DELIVERED);
        pointTransaction.setEmployee(employee);
        pointTransactionRepository.save(pointTransaction);
    }

    @Transactional
    public void cancelExchange(CancelExchangeRequest request, UUID organizationId) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findById(request.id())
            .orElseThrow(() -> new NotFoundException("Point transaction not found: " + request.id()));
        requireOwnership(pointTransaction, organizationId);

        if (pointTransaction.getState() != TransactionState.PENDING) {
            throw new ConflictException("El canje " + request.id() + " ya fue procesado (" + pointTransaction.getState() + ").");
        }

        Employee employee = employeeRepository
            .findById(request.employeeId())
            .orElseThrow(() -> new NotFoundException("Employee not found: " + request.employeeId()));

        pointTransaction.setState(TransactionState.CANCELLED);
        pointTransaction.setEmployee(employee);

        if (pointTransaction.getExchangeCode() != null) {
            pointTransaction.getExchangeCode().setActive(false);
        }

        pointTransactionRepository.save(pointTransaction);

        // refund points to customer by creating a new point transaction
        if (request.shouldRefundPoints()) {
            PointTransaction refundTransaction = new PointTransaction();
            refundTransaction.setRefundedTransaction(pointTransaction);
            refundTransaction.setCustomer(pointTransaction.getCustomer());
            refundTransaction.setPoints(Math.abs(pointTransaction.getPoints()));
            refundTransaction.setTransactionType(TransactionType.EARN);
            refundTransaction.setState(TransactionState.DELIVERED);
            pointTransactionRepository.save(refundTransaction);
        }
    }

    private void requireOwnership(PointTransaction pointTransaction, UUID organizationId) {
        if (!pointTransaction.getOrganization().getId().equals(organizationId)) {
            throw new AccessDeniedException("No podés operar sobre un canje de otra organización.");
        }
    }

    @Transactional
    public void customerCancelExchange(CustomerCancelExchangeRequest request, UUID callerId) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findById(request.exchangeId())
            .orElseThrow(() -> new NotFoundException("Point transaction not found: " + request.exchangeId()));

        if (!pointTransaction.getCustomer().getId().equals(callerId)) {
            throw new AccessDeniedException("No podés cancelar el canje de otro cliente.");
        }

        if (pointTransaction.getState() != TransactionState.PENDING) {
            throw new ConflictException("El canje " + request.exchangeId() + " ya fue procesado (" + pointTransaction.getState() + ").");
        }

        pointTransaction.setState(TransactionState.CANCELLED);

        if (pointTransaction.getExchangeCode() != null) {
            pointTransaction.getExchangeCode().setActive(false);
        }

        pointTransactionRepository.save(pointTransaction);

        // refund points to customer by creating a new point transaction
        PointTransaction refundTransaction = new PointTransaction();
        refundTransaction.setRefundedTransaction(pointTransaction);
        refundTransaction.setCustomer(pointTransaction.getCustomer());
        refundTransaction.setPoints(Math.abs(pointTransaction.getPoints()));
        refundTransaction.setTransactionType(TransactionType.EARN);
        refundTransaction.setState(TransactionState.DELIVERED);
        pointTransactionRepository.save(refundTransaction);
    }
}
