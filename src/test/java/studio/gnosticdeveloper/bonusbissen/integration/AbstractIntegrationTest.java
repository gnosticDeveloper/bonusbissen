package studio.gnosticdeveloper.bonusbissen.integration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.testcontainers.postgresql.PostgreSQLContainer;
import studio.gnosticdeveloper.bonusbissen.dto.request.CustomerLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.repository.CustomerRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
public abstract class AbstractIntegrationTest {

    // Started once and shared for the whole JVM (not JUnit-managed) so it survives
    // across test classes; Spring's test context cache would otherwise reuse a
    // stale ApplicationContext pointing at a container port that JUnit already
    // stopped and replaced between classes.
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine").withInitScript("schema.sql");

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
    protected RewardRepository rewardRepository;

    @Autowired
    protected OrganizationRepository organizationRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    // Shared across every test in the suite: existing scenarios assume every
    // employee/reward belongs to "the" business, so all of them are attached
    // to this single organization rather than one each.
    private static volatile Organization sharedOrganization;

    protected Organization defaultOrganization() {
        if (sharedOrganization == null) {
            synchronized (AbstractIntegrationTest.class) {
                if (sharedOrganization == null) {
                    Organization organization = new Organization();
                    organization.setName("Test Org");
                    sharedOrganization = organizationRepository.save(organization);
                }
            }
        }
        return sharedOrganization;
    }

    protected String baseUrl() {
        return "http://localhost:" + port;
    }

    protected Employee createEmployee(String username, String password, EmployeeRole role) {
        Employee employee = new Employee();
        employee.setOrganization(defaultOrganization());
        employee.setUsername(username);
        employee.setPasswordHash(passwordEncoder.encode(password));
        employee.setName(username);
        employee.setRole(role);
        return employeeRepository.save(employee);
    }

    protected Customer createCustomer(String phone) {
        Customer customer = new Customer();
        customer.setPhone(phone);
        customer.setName("Test Customer " + phone);
        return customerRepository.save(customer);
    }

    protected Customer createInactiveCustomer(String phone) {
        Customer customer = createCustomer(phone);
        customer.setActive(false);
        return customerRepository.save(customer);
    }

    protected Reward createReward(String title, int costPoints) {
        Reward reward = new Reward();
        reward.setOrganization(defaultOrganization());
        reward.setTitle(title);
        reward.setCostPoints(costPoints);
        return rewardRepository.save(reward);
    }

    protected String loginEmployee(String username, String password) {
        LoginResponse response = restTemplate
            .postForEntity(baseUrl() + "/auth/login", new LoginRequest(username, password), LoginResponse.class)
            .getBody();
        return response.token();
    }

    protected String loginCustomer(String phone) {
        LoginResponse response = restTemplate
            .postForEntity(baseUrl() + "/auth/customer-login", new CustomerLoginRequest(phone), LoginResponse.class)
            .getBody();
        return response.token();
    }

    protected HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    protected <T> HttpEntity<T> authed(String token, T body) {
        return new HttpEntity<>(body, authHeaders(token));
    }

    protected HttpEntity<Void> authed(String token) {
        return new HttpEntity<>(null, authHeaders(token));
    }
}
