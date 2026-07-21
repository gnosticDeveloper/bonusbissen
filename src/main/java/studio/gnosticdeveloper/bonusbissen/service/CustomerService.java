package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
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

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final RewardRepository rewardRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;

    public CustomerService(
        CustomerRepository customerRepository,
        PointTransactionRepository pointTransactionRepository,
        RewardRepository rewardRepository,
        ExchangeCodeRepository exchangeCodeRepository
    ) {
        this.customerRepository = customerRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.rewardRepository = rewardRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
    }

    @Transactional
    public Customer create(CustomerCreateRequest request) {
        if (customerRepository.existsByPhone(request.phone())) {
            throw new ConflictException("El número de teléfono " + request.phone() + " ya está registrado. Por favor, intenta con otro número.");
        }
        Customer customer = new Customer();
        customer.setName(request.name());
        customer.setPhone(request.phone());
        return customerRepository.save(customer);
    }

    @Transactional
    public void deleteById(UUID id) {
        Customer customer = customerRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));

        customer.setActive(false);
        customerRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public Customer getByPhone(String phone) {
        return customerRepository
            .findByPhone(phone)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el número de teléfono " + phone + "."));
    }

    @Transactional(readOnly = true)
    public int getBalance(UUID customerId) {
        return pointTransactionRepository.calculatePointsByCustomerId(customerId);
    }

    @Transactional(readOnly = true)
    public CustomerPointsResponse getCustomerPointsById(UUID id) {
        Customer customer = customerRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));
        return new CustomerPointsResponse(customer.getId(), customer.getName(), customer.getPhone(), getBalance(id));
    }

    @Transactional(readOnly = true)
    public CustomerPointsResponse getCustomerPointsByPhone(String phone) {
        Customer customer = getByPhone(phone);
        return new CustomerPointsResponse(customer.getId(), customer.getName(), customer.getPhone(), getBalance(customer.getId()));
    }

    @Transactional(readOnly = true)
    public List<HistoricalExchangeResponse> getHistoricalExchangesByCustomerId(UUID customerId) {
        List<PointTransaction> allExchangesByCustomerId = pointTransactionRepository.findAllByCustomerIdAndTypeOrderByCreatedAtDesc(
            customerId,
            TransactionType.REDEEM
        );
        return allExchangesByCustomerId.stream().map(HistoricalExchangeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByCustomerId(UUID customerId) {
        List<PointTransaction> movements = pointTransactionRepository.findAllByCustomerIdOrderByCreatedAtDesc(customerId);
        return movements.stream().map(MovementResponse::from).toList();
    }

    @Transactional
    public CustomerPointsAwardResponse grantPoints(GrantPointsRequest request) {
        PointTransaction tx = new PointTransaction();
        tx.setCustomer(
            customerRepository
                .findById(request.customerId())
                .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + request.customerId() + "."))
        );
        tx.setPoints(request.points());
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx = pointTransactionRepository.save(tx);
        return new CustomerPointsAwardResponse(tx.getCustomer().getName(), request.points());
    }

    @Transactional
    public String claimReward(ClaimRewardRequest request) {
        PointTransaction tx = new PointTransaction();
        Customer customer = customerRepository
            .findById(request.customerId())
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + request.customerId() + "."));
        tx.setCustomer(customer);
        Reward reward = rewardRepository
            .findById(request.rewardId())
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar una recompensa con el ID " + request.rewardId() + "."));
        tx.setReward(reward);

        int negativePoints = reward.getCostPoints() * -1;

        tx.setPoints(negativePoints);
        tx.setTransactionType(TransactionType.REDEEM);
        tx.setState(TransactionState.PENDING);
        tx = pointTransactionRepository.save(tx);

        // generate code
        ExchangeCode exchangeCode = new ExchangeCode();
        exchangeCode.setPointTransaction(tx);
        exchangeCode.setCustomer(customer);
        exchangeCode.setCode(generateExchangeCode());
        exchangeCodeRepository.save(exchangeCode);
        return exchangeCode.getCode();
    }

    private String generateExchangeCode() {
        ThreadLocalRandom random = ThreadLocalRandom.current();

        StringBuilder code = new StringBuilder(6);

        // First 4 characters: digits
        for (int i = 0; i < 4; i++) {
            code.append(random.nextInt(10));
        }

        // Fifth character: lowercase letter
        code.append((char) ('a' + random.nextInt(26)));

        // Sixth character: digit
        code.append(random.nextInt(10));

        return code.toString();
    }
}
