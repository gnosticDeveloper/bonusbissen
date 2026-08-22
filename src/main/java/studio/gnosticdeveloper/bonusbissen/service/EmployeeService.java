package studio.gnosticdeveloper.bonusbissen.service;

import studio.gnosticdeveloper.bonusbissen.dto.response.HomeStatsResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(EmployeeRepository employeeRepository, PointTransactionRepository pointTransactionRepository, CustomerRepository customerRepository, PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void resetPassword(UUID employeeId, String newPassword) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("Employee not found: " + employeeId));
        employee.setPasswordHash(passwordEncoder.encode(newPassword));
        employeeRepository.save(employee);
    }

    @Transactional
    public HomeStatsResponse getHomeStats(UUID organizationId) {
        int totalExchanges = pointTransactionRepository.countByTransactionType(TransactionType.REDEEM, organizationId);
        int pendingExchanges = pointTransactionRepository.countByTransactionTypeStatePending(TransactionType.REDEEM, organizationId);
        //This should use a many to many once we add subscription mechanics to org's point stores
        int totalCustomers = (int) customerRepository.count();
        int totalPointsAwarded = pointTransactionRepository.calculatePointsAwarded(TransactionType.EARN, organizationId);

        return new HomeStatsResponse(totalExchanges, pendingExchanges, totalCustomers, totalPointsAwarded);
    }
}
