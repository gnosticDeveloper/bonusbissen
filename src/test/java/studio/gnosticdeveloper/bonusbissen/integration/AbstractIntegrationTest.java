package studio.gnosticdeveloper.bonusbissen.integration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserLoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@TestPropertySource(properties = "app.mail.enabled=false")
@Import(TestMailConfig.class)
public abstract class AbstractIntegrationTest {

    protected static final String TEST_USER_PASSWORD = "test-password-123";

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
    protected UserRepository userRepository;

    @Autowired
    protected RewardRepository rewardRepository;

    @Autowired
    protected OrganizationRepository organizationRepository;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected RecordingEmailSender recordingEmailSender;

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

    /**
     * Creates an active user whose username is {@code usernameKey} (lower-cased)
     * and whose password is {@link #TEST_USER_PASSWORD}. Callers pass the same
     * key to {@link #loginUser(String)}.
     */
    protected User createUser(String usernameKey) {
        User user = new User();
        user.setUsername(usernameKey.toLowerCase());
        user.setName("Test User " + usernameKey);
        user.setPasswordHash(passwordEncoder.encode(TEST_USER_PASSWORD));
        user.setEmailVerified(false);
        return userRepository.save(user);
    }

    protected User createInactiveUser(String usernameKey) {
        User user = createUser(usernameKey);
        user.setActive(false);
        return userRepository.save(user);
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

    protected String loginUser(String usernameKey) {
        LoginResponse response = restTemplate
            .postForEntity(
                baseUrl() + "/auth/user-login",
                new UserLoginRequest(usernameKey.toLowerCase(), TEST_USER_PASSWORD),
                LoginResponse.class
            )
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
