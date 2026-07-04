package studio.gnosticdeveloper.bonusbissen.service;

import studio.gnosticdeveloper.bonusbissen.dto.request.PointTransactionCreateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItemVariant;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.InsufficientPointsException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MenuItemRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PointTransactionService {

    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final MenuItemRepository menuItemRepository;
    private final RewardRepository rewardRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public PointTransactionService(
            CustomerRepository customerRepository,
            EmployeeRepository employeeRepository,
            MenuItemRepository menuItemRepository,
            RewardRepository rewardRepository,
            PointTransactionRepository pointTransactionRepository) {
        this.customerRepository = customerRepository;
        this.employeeRepository = employeeRepository;
        this.menuItemRepository = menuItemRepository;
        this.rewardRepository = rewardRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    /**
     * The customer row lock (SELECT ... FOR UPDATE) serializes concurrent redemptions
     * for the same customer so the balance check and the insert are effectively atomic.
     */
    @Transactional
    public Result create(PointTransactionCreateRequest request, UUID employeeId) {
        Customer customer = customerRepository.findByDocumentForUpdate(request.customerDocument())
                .orElseThrow(() -> new NotFoundException("Customer not found: " + request.customerDocument()));

        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("Employee not found: " + employeeId));

        PointTransaction transaction = new PointTransaction();
        transaction.setCustomer(customer);
        transaction.setEmployee(employee);
        transaction.setType(request.type());
        transaction.setNote(request.note());

        if (request.type() == TransactionType.PURCHASE) {
            if (request.menuItemId() == null) {
                throw new BadRequestException("menuItemId is required for a PURCHASE transaction");
            }
            MenuItem menuItem = menuItemRepository.findById(request.menuItemId())
                    .orElseThrow(() -> new NotFoundException("Menu item not found: " + request.menuItemId()));
            transaction.setMenuItem(menuItem);

            if (request.variantName() != null) {
                MenuItemVariant variant = menuItem.findVariant(request.variantName());
                if (variant == null) {
                    throw new BadRequestException(
                            "Unknown variant \"" + request.variantName() + "\" for menu item " + menuItem.getId());
                }
                transaction.setMenuItemVariant(variant);
                transaction.setPointsDelta(variant.getPointsValue());
            } else {
                transaction.setPointsDelta(menuItem.getPointsValue());
            }
        } else {
            if (request.rewardId() == null) {
                throw new BadRequestException("rewardId is required for a REDEMPTION transaction");
            }
            Reward reward = rewardRepository.findById(request.rewardId())
                    .orElseThrow(() -> new NotFoundException("Reward not found: " + request.rewardId()));

            int currentBalance = pointTransactionRepository.sumPointsDeltaByCustomerId(customer.getId());
            if (currentBalance < reward.getCostPoints()) {
                throw new InsufficientPointsException(
                        "Insufficient points: balance is " + currentBalance + ", reward costs " + reward.getCostPoints());
            }
            transaction.setReward(reward);
            transaction.setPointsDelta(-reward.getCostPoints());
        }

        PointTransaction saved = pointTransactionRepository.save(transaction);
        int newBalance = pointTransactionRepository.sumPointsDeltaByCustomerId(customer.getId());
        return new Result(saved, newBalance);
    }

    public record Result(PointTransaction transaction, int newBalance) {
    }
}
