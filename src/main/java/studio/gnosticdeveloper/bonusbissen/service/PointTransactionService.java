package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

@Service
public class PointTransactionService {

    private final PointTransactionRepository pointTransactionRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final EmployeeRepository employeeRepository;

    public PointTransactionService(PointTransactionRepository pointTransactionRepository, ExchangeCodeRepository exchangeCodeRepository, EmployeeRepository employeeRepository) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<ExchangeResponse> getAll() {
        return pointTransactionRepository.findAllWithRelations().stream()
                .map(ExchangeResponse::from)
                .toList();
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
    public List<PendingExchangeReviewResponse> getAllByState(TransactionState state) {
        return pointTransactionRepository.findAllByStateOrderByCreatedAtDesc(state).stream().map(PendingExchangeReviewResponse::from).toList();
    }

    @Transactional
    public Integer countByState(TransactionState state) {
        return pointTransactionRepository.countByState(state);
    }

    @Transactional
    public ExchangeResponse verifyExchange(String code) {
        ExchangeCode exchangeCode = exchangeCodeRepository
            .findByCode(code)
            .orElseThrow(() -> new NotFoundException("No pudimos encontrar el código de intercambio: " + code));

        PointTransaction pointTransaction = exchangeCode.getPointTransaction();
        if (pointTransaction == null) {
            throw new NotFoundException("El código de intercambio no tiene una transacción de puntos hecha: " + code);
        }
        return ExchangeResponse.from(pointTransaction);
    }

    @Transactional
    public void cancelExchange(CancelExchangeRequest request) {
        PointTransaction pointTransaction = pointTransactionRepository
            .findById(request.id())
            .orElseThrow(() -> new NotFoundException("Point transaction not found: " + request.id()));

        pointTransaction.setState(TransactionState.CANCELLED);

        Employee employee = employeeRepository.findById(request.employeeId())
            .orElseThrow(() -> new NotFoundException("Employee not found: " + request.employeeId()));
        pointTransaction.setEmployee(employee);

        pointTransactionRepository.save(pointTransaction);

        ExchangeCode exchangeCode = exchangeCodeRepository.findByPointTransactionId(pointTransaction.getId())
            .orElseThrow(() -> new NotFoundException("Exchange code not found for point transaction: " + pointTransaction.getId()));

        exchangeCodeRepository.delete(exchangeCode);
    }
}
