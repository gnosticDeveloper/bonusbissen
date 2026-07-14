package studio.gnosticdeveloper.bonusbissen.service;

import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final RewardRepository rewardRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;


    public CustomerService(CustomerRepository customerRepository, PointTransactionRepository pointTransactionRepository, RewardRepository rewardRepository, ExchangeCodeRepository exchangeCodeRepository) {
        this.customerRepository = customerRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.rewardRepository = rewardRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
    }

    @Transactional
    public Customer create(CustomerCreateRequest request) {
        if (customerRepository.existsByPhone(request.phone())) {
            throw new ConflictException("Customer with phone " + request.phone() + " already exists");
        }
        Customer customer = new Customer();
        customer.setName(request.name());
        customer.setPhone(request.phone());
        return customerRepository.save(customer);
    }

    @Transactional
    public void deleteById(UUID id) {
        customerRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Customer getByPhone(String phone) {
        return customerRepository.findByPhone(phone)
                .orElseThrow(() -> new NotFoundException("Customer not found: " + phone));
    }

    @Transactional(readOnly = true)
    public int getBalance(UUID customerId) {
        return pointTransactionRepository.calculatePointsByCustomerId(customerId);
    }

    @Transactional(readOnly = true)
    public CustomerPointsResponse getCustomerPointsById(UUID id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Customer not found: " + id));
        return new CustomerPointsResponse(customer.getId(), customer.getName(), customer.getPhone(), getBalance(id));
    }

    @Transactional(readOnly = true)
    public CustomerPointsResponse getCustomerPointsByPhone(String phone) {
        Customer customer = getByPhone(phone);
        return new CustomerPointsResponse(customer.getId(), customer.getName(), customer.getPhone(), getBalance(customer.getId()));
    }

    @Transactional(readOnly = true)
    public List<HistoricalExchangeResponse> getHistoricalExchangesByCustomerId(UUID customerId) {
        List<PointTransaction> allExchangesByCustomerId = pointTransactionRepository.findAllByCustomerIdAndTypeOrderByCreatedAtDesc(customerId, TransactionType.REDEEM);
        return allExchangesByCustomerId.stream().map(HistoricalExchangeResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByCustomerId(UUID customerId) {
        List<PointTransaction> movements = pointTransactionRepository.findAllByCustomerIdOrderByCreatedAtDesc(customerId);
        return movements.stream().map(MovementResponse::from).toList();
    }

    @Transactional
    public CustomerPointsResponse grantPoints(GrantPointsRequest request) {
        PointTransaction tx = new PointTransaction();
        tx.setCustomer(customerRepository.findById(request.customerId())
                .orElseThrow(() -> new NotFoundException("Customer not found: " + request.customerId())));
        tx.setPoints(request.points());
        tx.setTransactionType(TransactionType.EARN);
        tx.setState("delivered");
        tx = pointTransactionRepository.save(tx);
        return new CustomerPointsResponse(tx.getCustomer().getId(), tx.getCustomer().getName(), tx.getCustomer().getPhone(), getBalance(tx.getCustomer().getId()));
    }

    @Transactional
    public String claimReward(ClaimRewardRequest request) {
        PointTransaction tx = new PointTransaction();
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new NotFoundException("Customer not found: " + request.customerId()));
        tx.setCustomer(customer);
        Reward reward = rewardRepository.findById(request.rewardId())
                .orElseThrow(() -> new NotFoundException("Reward not found: " + request.rewardId()));
        tx.setReward(reward);
        tx.setPoints(reward.getCostPoints());
        tx.setTransactionType(TransactionType.REDEEM);
        tx.setState("pending");
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
