package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

@Service
public class PointTransactionService {

    private final PointTransactionRepository pointTransactionRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final EmployeeRepository employeeRepository;
    private final CustomerRepository customerRepository;

    public PointTransactionService(PointTransactionRepository pointTransactionRepository, ExchangeCodeRepository exchangeCodeRepository, EmployeeRepository employeeRepository, CustomerRepository customerRepository) {
        this.pointTransactionRepository = pointTransactionRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.employeeRepository = employeeRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<PointTransaction> getAll() {
        return pointTransactionRepository.findAll();
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

    // /**
    //  * The customer row lock (SELECT ... FOR UPDATE) serializes concurrent redemptions
    //  * for the same customer so the balance check and the insert are effectively atomic.
    //  */
    // @Transactional
    // public Result create(ExchangeCreateRequest request, UUID employeeId) {
    //     Customer customer = customerRepository.findByPhoneForUpdate(request.customerDocument())
    //             .orElseThrow(() -> new NotFoundException("Customer not found: " + request.customerDocument()));

    //     Employee employee = employeeRepository.findById(employeeId)
    //             .orElseThrow(() -> new NotFoundException("Employee not found: " + employeeId));

    //     Exchange transaction = new Exchange();
    //     transaction.setCustomer(customer);
    //     transaction.setEmployee(employee);
    //     transaction.setType(request.type());
    //     transaction.setNote(request.note());

    //     if (request.type() == TransactionType.PURCHASE) {
    //         if (request.menuItemId() == null) {
    //             throw new BadRequestException("menuItemId is required for a PURCHASE transaction");
    //         }
    //         MenuItem menuItem = menuItemRepository.findById(request.menuItemId())
    //                 .orElseThrow(() -> new NotFoundException("Menu item not found: " + request.menuItemId()));
    //         transaction.setMenuItem(menuItem);

    //         if (request.variantName() != null) {
    //             MenuItemVariant variant = menuItem.findVariant(request.variantName());
    //             if (variant == null) {
    //                 throw new BadRequestException(
    //                         "Unknown variant \"" + request.variantName() + "\" for menu item " + menuItem.getId());
    //             }
    //             transaction.setMenuItemVariant(variant);
    //             transaction.setPointsDelta(variant.getPointsValue());
    //         } else {
    //             transaction.setPointsDelta(menuItem.getPointsValue());
    //         }
    //     } else {
    //         if (request.rewardId() == null) {
    //             throw new BadRequestException("rewardId is required for a REDEMPTION transaction");
    //         }
    //         Reward reward = rewardRepository.findById(request.rewardId())
    //                 .orElseThrow(() -> new NotFoundException("Reward not found: " + request.rewardId()));

    //         int currentBalance = pointTransactionRepository.sumPointsDeltaByCustomerId(customer.getId());
    //         if (currentBalance < reward.getCostPoints()) {
    //             throw new InsufficientPointsException(
    //                     "Insufficient points: balance is " + currentBalance + ", reward costs " + reward.getCostPoints());
    //         }
    //         transaction.setReward(reward);
    //         transaction.setPointsDelta(-reward.getCostPoints());
    //     }

    //     Exchange saved = pointTransactionRepository.save(transaction);
    //     int newBalance = pointTransactionRepository.sumPointsDeltaByCustomerId(customer.getId());
    //     return new Result(saved, newBalance);
    // }

    // public record Result(Exchange transaction, int newBalance) {
    // }
}
