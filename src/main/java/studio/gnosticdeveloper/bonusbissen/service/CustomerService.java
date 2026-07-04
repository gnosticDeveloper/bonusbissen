package studio.gnosticdeveloper.bonusbissen.service;

import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCreateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public CustomerService(CustomerRepository customerRepository, PointTransactionRepository pointTransactionRepository) {
        this.customerRepository = customerRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    @Transactional
    public Customer create(CustomerCreateRequest request) {
        if (customerRepository.existsByDocument(request.document())) {
            throw new ConflictException("Customer with document " + request.document() + " already exists");
        }
        Customer customer = new Customer();
        customer.setDocument(request.document());
        customer.setName(request.name());
        customer.setPhone(request.phone());
        return customerRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public Customer getByDocument(String document) {
        return customerRepository.findByDocument(document)
                .orElseThrow(() -> new NotFoundException("Customer not found: " + document));
    }

    @Transactional(readOnly = true)
    public int getBalance(UUID customerId) {
        return pointTransactionRepository.sumPointsDeltaByCustomerId(customerId);
    }

    @Transactional(readOnly = true)
    public Page<PointTransaction> getTransactions(String document, Pageable pageable) {
        Customer customer = getByDocument(document);
        return pointTransactionRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId(), pageable);
    }
}
