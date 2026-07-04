package studio.gnosticdeveloper.bonusbissen.integration;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.LoginRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.PointTransactionCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.LoginResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointTransactionResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class PointTransactionIntegrationTest extends AbstractIntegrationTest {

    private String loginAsCashier(String username) {
        createEmployee(username, "password123", EmployeeRole.CASHIER);
        ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
                baseUrl() + "/auth/login", new LoginRequest(username, "password123"), LoginResponse.class);
        return response.getBody().token();
    }

    private HttpEntity<PointTransactionCreateRequest> authed(String token, PointTransactionCreateRequest body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(body, headers);
    }

    @Test
    void purchaseIncreasesBalance() {
        String token = loginAsCashier("cashier-purchase");
        MenuItem menuItem = createMenuItem("Coffee", 10);
        Customer customer = createCustomer("doc-purchase-1");

        ResponseEntity<PointTransactionResponse> response = restTemplate.exchange(
                baseUrl() + "/point-transactions",
                org.springframework.http.HttpMethod.POST,
                authed(token, new PointTransactionCreateRequest(customer.getDocument(), TransactionType.PURCHASE, menuItem.getId(), null, null, null)),
                PointTransactionResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().newBalance()).isEqualTo(10);
    }

    @Test
    void redemptionWithSufficientPointsSucceeds() {
        String token = loginAsCashier("cashier-redeem-ok");
        MenuItem menuItem = createMenuItem("Cake", 20);
        Reward reward = createFreeItemReward("Free Cake", 15, menuItem);
        Customer customer = createCustomer("doc-redeem-ok");

        restTemplate.exchange(baseUrl() + "/point-transactions", org.springframework.http.HttpMethod.POST,
                authed(token, new PointTransactionCreateRequest(customer.getDocument(), TransactionType.PURCHASE, menuItem.getId(), null, null, null)),
                PointTransactionResponse.class);

        ResponseEntity<PointTransactionResponse> redemption = restTemplate.exchange(
                baseUrl() + "/point-transactions", org.springframework.http.HttpMethod.POST,
                authed(token, new PointTransactionCreateRequest(customer.getDocument(), TransactionType.REDEMPTION, null, reward.getId(), null, null)),
                PointTransactionResponse.class);

        assertThat(redemption.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(redemption.getBody().newBalance()).isEqualTo(5);
    }

    @Test
    void redemptionWithInsufficientPointsIsRejected() {
        String token = loginAsCashier("cashier-redeem-fail");
        MenuItem menuItem = createMenuItem("Cake2", 20);
        Reward reward = createFreeItemReward("Free Cake 2", 100, menuItem);
        Customer customer = createCustomer("doc-redeem-fail");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl() + "/point-transactions", org.springframework.http.HttpMethod.POST,
                authed(token, new PointTransactionCreateRequest(customer.getDocument(), TransactionType.REDEMPTION, null, reward.getId(), null, null)),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void concurrentRedemptionsOnlyOneSucceedsWhenBalanceCoversOne() throws Exception {
        String token = loginAsCashier("cashier-race");
        MenuItem menuItem = createMenuItem("Cake3", 10);
        Reward reward = createFreeItemReward("Free Cake 3", 10, menuItem);
        Customer customer = createCustomer("doc-race");

        // give the customer exactly enough points for one redemption
        restTemplate.exchange(baseUrl() + "/point-transactions", org.springframework.http.HttpMethod.POST,
                authed(token, new PointTransactionCreateRequest(customer.getDocument(), TransactionType.PURCHASE, menuItem.getId(), null, null, null)),
                PointTransactionResponse.class);

        Callable<Integer> redeem = () -> restTemplate.exchange(
                baseUrl() + "/point-transactions", org.springframework.http.HttpMethod.POST,
                authed(token, new PointTransactionCreateRequest(customer.getDocument(), TransactionType.REDEMPTION, null, reward.getId(), null, null)),
                String.class).getStatusCode().value();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Integer>> futures = executor.invokeAll(List.of(redeem, redeem));
            List<Integer> statusCodes = futures.stream().map(f -> {
                try {
                    return f.get();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }).collect(Collectors.toList());

            long successCount = statusCodes.stream().filter(code -> code == 201).count();
            long conflictCount = statusCodes.stream().filter(code -> code == 409).count();

            assertThat(successCount).isEqualTo(1);
            assertThat(conflictCount).isEqualTo(1);
        } finally {
            executor.shutdown();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }
}
