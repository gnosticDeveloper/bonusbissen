package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeReviewResponse;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

@Service
public class PointTransactionService {

    private final PointTransactionRepository pointTransactionRepository;

    public PointTransactionService(
        PointTransactionRepository pointTransactionRepository
    ) {
        this.pointTransactionRepository = pointTransactionRepository;
    }

    @Transactional
    public List<PendingExchangeResponse> getAllPendingExchangesById(UUID customerId) {
        return pointTransactionRepository
            .findAllPendingByCustomerIdOrderByCreatedAtDesc(customerId, "pending")
            .stream()
            .map(PendingExchangeResponse::from)
            .toList();
    }

    @Transactional
    public List<PendingExchangeReviewResponse> getAllByState(String state) {
        return pointTransactionRepository.findAllByStateOrderByCreatedAtDesc(state).stream().map(PendingExchangeReviewResponse::from).toList();
    }

    @Transactional
    public Integer countByState(String state) {
        return pointTransactionRepository.countByState(state);
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
