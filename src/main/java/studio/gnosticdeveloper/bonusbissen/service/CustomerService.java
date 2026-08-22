package studio.gnosticdeveloper.bonusbissen.service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.HistoricalExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.MovementResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
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

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final RewardRepository rewardRepository;
    private final ExchangeCodeRepository exchangeCodeRepository;
    private final EmployeeRepository employeeRepository;

    public CustomerService(
        CustomerRepository customerRepository,
        PointTransactionRepository pointTransactionRepository,
        RewardRepository rewardRepository,
        ExchangeCodeRepository exchangeCodeRepository,
        EmployeeRepository employeeRepository
    ) {
        this.customerRepository = customerRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.rewardRepository = rewardRepository;
        this.exchangeCodeRepository = exchangeCodeRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public Customer create(CustomerCreateRequest request, UUID employeeId) {
        customerRepository
            .findByPhone(request.phone())
            .ifPresent(existing -> {
                if (existing.isActive()) {
                    throw new ConflictException("Ese número ya está registrado. Por favor, intenta con otro número.");
                }
                throw new InactiveCustomerConflictException(
                    "Ese número pertenece a un cliente que fue borrado. Podés reactivarlo en vez de crear uno nuevo.",
                    existing.getId()
                );
            });
        Customer customer = new Customer();
        customer.setName(request.name());
        customer.setPhone(request.phone());
        customer = customerRepository.save(customer);

        if (request.points() != null && request.points() > 0) {
            grantPoints(new GrantPointsRequest(customer.getId(), request.points(), null), employeeId);
        }

        return customer;
    }

    @Transactional
    public Customer update(UUID id, CustomerUpdateRequest request) {
        Customer customer = customerRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));

        if (!customer.getPhone().equals(request.phone())) {
            customerRepository
                .findByPhone(request.phone())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Ese número ya está registrado. Por favor, intenta con otro número.");
                });
        }

        customer.setName(request.name());
        customer.setPhone(request.phone());
        return customerRepository.save(customer);
    }

    @Transactional
    public Customer reactivate(UUID id) {
        Customer customer = customerRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + id + "."));

        customer.setActive(true);
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
            .filter(Customer::isActive)
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
        return CustomerPointsResponse.from(customer, getBalance(id));
    }

    @Transactional(readOnly = true)
    public CustomerPointsResponse getCustomerPointsByPhone(String phone) {
        Customer customer = getByPhone(phone);
        return CustomerPointsResponse.from(customer, getBalance(customer.getId()));
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

    @Transactional(readOnly = true)
    public Page<CustomerPointsResponse> search(String search, Pageable pageable) {
        String term = search == null || search.isBlank() ? null : search.trim();
        return customerRepository.search(term, pageable).map(customer -> CustomerPointsResponse.from(customer, getBalance(customer.getId())));
    }

    @Transactional(readOnly = true)
    public List<TopClientResponse> getTopClients(UUID organizationId) {
        Pageable topTen = PageRequest.of(0, 10);
        return customerRepository.getTopClients(organizationId, topTen);
    }

    @Transactional(readOnly = true)
    public List<PointActionResponse> getGrantHistory(UUID organizationId, UUID customerId, int size) {
        Pageable pageable = PageRequest.of(0, size);
        return pointTransactionRepository.findGrantHistory(organizationId, customerId, pageable).stream().map(PointActionResponse::from).toList();
    }

    @Transactional
    public CustomerPointsAwardResponse grantPoints(GrantPointsRequest request, UUID employeeId) {
        Employee employee = employeeRepository
            .findById(employeeId)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un empleado con el ID " + employeeId + "."));

        PointTransaction tx = new PointTransaction();
        tx.setEmployee(employee);
        tx.setCustomer(
            customerRepository
                .findById(request.customerId())
                .filter(Customer::isActive)
                .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + request.customerId() + "."))
        );
        tx.setPoints(request.points());
        tx.setNote(request.note());
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx = pointTransactionRepository.save(tx);
        return new CustomerPointsAwardResponse(tx.getCustomer().getName(), request.points());
    }

    @Transactional
    public PointActionResponse updateGrant(UUID transactionId, GrantPointsUpdateRequest request, UUID organizationId) {
        PointTransaction tx = getOwnedGrant(transactionId, organizationId);
        tx.setPoints(request.points());
        tx.setNote(request.note());
        tx = pointTransactionRepository.save(tx);
        return PointActionResponse.from(tx);
    }

    @Transactional
    public void deleteGrant(UUID transactionId, UUID organizationId) {
        pointTransactionRepository.delete(getOwnedGrant(transactionId, organizationId));
    }

    private PointTransaction getOwnedGrant(UUID transactionId, UUID organizationId) {
        PointTransaction tx = pointTransactionRepository
            .findById(transactionId)
            .filter(t -> t.getTransactionType() == TransactionType.EARN && t.getEmployee() != null)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un movimiento de puntos con el ID " + transactionId + "."));

        if (!tx.getEmployee().getOrganization().getId().equals(organizationId)) {
            throw new AccessDeniedException("No podés operar sobre un movimiento de puntos de otra organización.");
        }

        return tx;
    }

    @Transactional
    public String claimReward(ClaimRewardRequest request) {
        PointTransaction tx = new PointTransaction();
        Customer customer = customerRepository
            .findById(request.customerId())
            .filter(Customer::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar un cliente con el ID " + request.customerId() + "."));
        tx.setCustomer(customer);
        Reward reward = rewardRepository
            .findById(request.rewardId())
            .filter(Reward::isActive)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar una recompensa con el ID " + request.rewardId() + "."));
        tx.setReward(reward);

        if (getBalance(customer.getId()) < reward.getCostPoints()) {
            throw new InsufficientPointsException("El cliente no tiene puntos suficientes para canjear \"" + reward.getTitle() + "\".");
        }

        int negativePoints = reward.getCostPoints() * -1;

        tx.setPoints(negativePoints);
        tx.setTransactionType(TransactionType.REDEEM);
        tx.setState(TransactionState.PENDING);
        tx = pointTransactionRepository.save(tx);

        ExchangeCode exchangeCode = new ExchangeCode();
        exchangeCode.setOrganization(reward.getOrganization());
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
