package studio.gnosticdeveloper.bonusbissen.integration;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.testcontainers.postgresql.PostgreSQLContainer;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.BenefitType;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MenuItemRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import org.springframework.beans.factory.annotation.Autowired;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
public abstract class AbstractIntegrationTest {

    // Started once and shared for the whole JVM (not JUnit-managed) so it survives
    // across test classes; Spring's test context cache would otherwise reuse a
    // stale ApplicationContext pointing at a container port that JUnit already
    // stopped and replaced between classes.
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withInitScript("schema.sql");

    static {
        POSTGRES.start();
    }

    @LocalServerPort
    protected int port;

    @Autowired
    protected TestRestTemplate restTemplate;

    @Autowired
    protected EmployeeRepository employeeRepository;

    @Autowired
    protected CustomerRepository customerRepository;

    @Autowired
    protected MenuItemRepository menuItemRepository;

    @Autowired
    protected RewardRepository rewardRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    protected String baseUrl() {
        return "http://localhost:" + port;
    }

    protected Employee createEmployee(String username, String password, EmployeeRole role) {
        Employee employee = new Employee();
        employee.setUsername(username);
        employee.setPasswordHash(passwordEncoder.encode(password));
        employee.setName(username);
        employee.setRole(role);
        return employeeRepository.save(employee);
    }

    protected Customer createCustomer(String document) {
        Customer customer = new Customer();
        customer.setDocument(document);
        customer.setName("Test Customer " + document);
        return customerRepository.save(customer);
    }

    protected MenuItem createMenuItem(String name, int pointsValue) {
        MenuItem menuItem = new MenuItem();
        menuItem.setName(name);
        menuItem.setPointsValue(pointsValue);
        return menuItemRepository.save(menuItem);
    }

    protected Reward createFreeItemReward(String name, int costPoints, MenuItem menuItem) {
        Reward reward = new Reward();
        reward.setName(name);
        reward.setCostPoints(costPoints);
        reward.setBenefitType(BenefitType.FREE_ITEM);
        reward.setMenuItem(menuItem);
        return rewardRepository.save(reward);
    }
}
