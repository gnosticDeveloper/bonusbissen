package studio.gnosticdeveloper.bonusbissen.integration;

import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.ExchangeVerifyRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CustomerPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.ExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopClientResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.EmployeeRole;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PointTransactionIntegrationTest extends AbstractIntegrationTest {

    private CustomerPointsResponse getBalance(String token, UUID customerId) {
        return restTemplate
            .exchange(baseUrl() + "/customers/" + customerId, HttpMethod.GET, authed(token), CustomerPointsResponse.class)
            .getBody();
    }

    private UUID grant(String cashierToken, UUID customerId, int points) {
        ResponseEntity<CustomerPointsAwardResponse> response = restTemplate.exchange(
            baseUrl() + "/customers/grant",
            HttpMethod.POST,
            authed(cashierToken, new GrantPointsRequest(customerId, points)),
            CustomerPointsAwardResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return customerId;
    }

    private UUID claimReward(String customerToken, UUID customerId, UUID rewardId) {
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/customers/claim-reward",
            HttpMethod.POST,
            authed(customerToken, new ClaimRewardRequest(customerId, rewardId)),
            String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotBlank();
        return customerId;
    }

    private PendingExchangeResponse getSolePendingExchange(String employeeToken, UUID customerId) {
        ResponseEntity<List<PendingExchangeResponse>> pending = restTemplate.exchange(
            baseUrl() + "/exchanges/pending/" + customerId,
            HttpMethod.GET,
            authed(employeeToken),
            new ParameterizedTypeReference<>() {}
        );
        assertThat(pending.getBody()).hasSize(1);
        return pending.getBody().get(0);
    }

    @Test
    void grantPointsIncreasesCustomerBalance() {
        Employee cashier = createEmployee("cashier-grant", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-grant", "password123");
        Customer customer = createCustomer("+5493462001001");

        grant(token, customer.getId(), 100);

        assertThat(getBalance(token, customer.getId()).points()).isEqualTo(100);
    }

    @Test
    void grantPointsRequiresCashierOrAdminRole() {
        Customer customer = createCustomer("+5493462001002");
        String customerToken = loginCustomer("+5493462001002");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/customers/grant",
            HttpMethod.POST,
            authed(customerToken, new GrantPointsRequest(customer.getId(), 50)),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void claimRewardCreatesPendingExchangeAndDecrementsBalance() {
        Employee cashier = createEmployee("cashier-claim", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-claim", "password123");
        Customer customer = createCustomer("+5493462001003");
        grant(cashierToken, customer.getId(), 100);

        Reward reward = createReward("Free Coffee", 30);
        String customerToken = loginCustomer("+5493462001003");
        claimReward(customerToken, customer.getId(), reward.getId());

        assertThat(getBalance(customerToken, customer.getId()).points()).isEqualTo(70);

        PendingExchangeResponse pending = getSolePendingExchange(cashierToken, customer.getId());
        assertThat(pending.rewardTitle()).isEqualTo("Free Coffee");
        assertThat(pending.points()).isEqualTo(-30);
        assertThat(pending.exchangeCode()).hasSize(6);
    }

    @Test
    void employeeApproveExchangeMarksItDelivered() {
        Employee cashier = createEmployee("cashier-approve", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-approve", "password123");
        Customer customer = createCustomer("+5493462001004");
        grant(cashierToken, customer.getId(), 50);

        Reward reward = createReward("Free Muffin", 20);
        String customerToken = loginCustomer("+5493462001004");
        claimReward(customerToken, customer.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, customer.getId()).id();

        ResponseEntity<Void> approve = restTemplate.exchange(
            baseUrl() + "/exchanges/approve",
            HttpMethod.POST,
            authed(cashierToken, new ApproveExchangeRequest(exchangeId, cashier.getId())),
            Void.class
        );
        assertThat(approve.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<List<ExchangeResponse>> all = restTemplate.exchange(
            baseUrl() + "/exchanges",
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );
        ExchangeResponse approved = all.getBody().stream().filter(e -> e.id().equals(exchangeId)).findFirst().orElseThrow();
        assertThat(approved.state()).isEqualTo("delivered");
    }

    @Test
    void employeeCancelExchangeWithRefundRestoresBalance() {
        Employee cashier = createEmployee("cashier-cancel", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-cancel", "password123");
        Customer customer = createCustomer("+5493462001005");
        grant(cashierToken, customer.getId(), 40);

        Reward reward = createReward("Free Tea", 25);
        String customerToken = loginCustomer("+5493462001005");
        claimReward(customerToken, customer.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, customer.getId()).id();

        ResponseEntity<Void> cancel = restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), true)),
            Void.class
        );
        assertThat(cancel.getStatusCode()).isEqualTo(HttpStatus.OK);

        assertThat(getBalance(cashierToken, customer.getId()).points()).isEqualTo(40);
    }

    @Test
    void employeeCancelExchangeWithoutRefundLeavesBalanceReduced() {
        Employee cashier = createEmployee("cashier-cancel-norefund", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-cancel-norefund", "password123");
        Customer customer = createCustomer("+5493462001006");
        grant(cashierToken, customer.getId(), 40);

        Reward reward = createReward("Free Juice", 25);
        String customerToken = loginCustomer("+5493462001006");
        claimReward(customerToken, customer.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, customer.getId()).id();

        restTemplate.exchange(
            baseUrl() + "/exchanges/cancel",
            HttpMethod.POST,
            authed(cashierToken, new CancelExchangeRequest(exchangeId, cashier.getId(), false)),
            Void.class
        );

        assertThat(getBalance(cashierToken, customer.getId()).points()).isEqualTo(15);
    }

    @Test
    void customerCancelExchangeAlwaysRefundsPoints() {
        Employee cashier = createEmployee("cashier-customer-cancel", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-customer-cancel", "password123");
        Customer customer = createCustomer("+5493462001007");
        grant(cashierToken, customer.getId(), 60);

        Reward reward = createReward("Free Sandwich", 45);
        String customerToken = loginCustomer("+5493462001007");
        claimReward(customerToken, customer.getId(), reward.getId());

        UUID exchangeId = getSolePendingExchange(cashierToken, customer.getId()).id();

        ResponseEntity<Void> response = restTemplate.exchange(
            baseUrl() + "/exchanges/customer-cancel",
            HttpMethod.POST,
            authed(customerToken, new studio.gnosticdeveloper.bonusbissen.dto.request.CustomerCancelExchangeRequest(exchangeId)),
            Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getBalance(customerToken, customer.getId()).points()).isEqualTo(60);
    }

    @Test
    void verifyExchangeWithValidCodeReturnsTheTransaction() {
        Employee cashier = createEmployee("cashier-verify-ok", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-verify-ok", "password123");
        Customer customer = createCustomer("+5493462001008");
        grant(cashierToken, customer.getId(), 30);

        Reward reward = createReward("Free Bagel", 15);
        String customerToken = loginCustomer("+5493462001008");
        claimReward(customerToken, customer.getId(), reward.getId());

        String code = getSolePendingExchange(cashierToken, customer.getId()).exchangeCode();

        ResponseEntity<ExchangeResponse> response = restTemplate.exchange(
            baseUrl() + "/exchanges/verify",
            HttpMethod.POST,
            authed(cashierToken, new ExchangeVerifyRequest(code)),
            ExchangeResponse.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().rewardTitle()).isEqualTo("Free Bagel");
        assertThat(response.getBody().state()).isEqualTo("pending");
    }

    @Test
    void verifyExchangeWithUnknownCodeReturnsNotFound() {
        Employee cashier = createEmployee("cashier-verify-404", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-verify-404", "password123");

        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/verify",
            HttpMethod.POST,
            authed(token, new ExchangeVerifyRequest("000000")),
            String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void topRewardsAndTopClientsRequireCashierOrAdminRole() {
        Customer customer = createCustomer("+5493462001009");
        String customerToken = loginCustomer("+5493462001009");

        ResponseEntity<String> topRewards = restTemplate.exchange(
            baseUrl() + "/rewards/top",
            HttpMethod.GET,
            authed(customerToken),
            String.class
        );
        ResponseEntity<String> topClients = restTemplate.exchange(
            baseUrl() + "/customers/top",
            HttpMethod.GET,
            authed(customerToken),
            String.class
        );

        assertThat(topRewards.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(topClients.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void topClientsRanksByPointsEarnedDescending() {
        Employee cashier = createEmployee("cashier-top-clients", "password123", EmployeeRole.CASHIER);
        String token = loginEmployee("cashier-top-clients", "password123");
        Customer bigSpender = createCustomer("+5493462001010");
        Customer smallSpender = createCustomer("+5493462001011");

        grant(token, bigSpender.getId(), 100_000);
        grant(token, smallSpender.getId(), 1);

        ResponseEntity<List<TopClientResponse>> response = restTemplate.exchange(
            baseUrl() + "/customers/top",
            HttpMethod.GET,
            authed(token),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<TopClientResponse> ranking = response.getBody();
        assertThat(ranking).isNotEmpty();
        assertThat(ranking.get(0).id()).isEqualTo(bigSpender.getId());
    }

    @Test
    void topRewardsRanksByClaimCountDescending() {
        Employee cashier = createEmployee("cashier-top-rewards", "password123", EmployeeRole.CASHIER);
        String cashierToken = loginEmployee("cashier-top-rewards", "password123");
        Customer customer = createCustomer("+5493462001012");
        grant(cashierToken, customer.getId(), 1000);
        String customerToken = loginCustomer("+5493462001012");

        Reward popular = createReward("Popular Reward", 10);
        Reward rare = createReward("Rare Reward", 10);

        claimReward(customerToken, customer.getId(), popular.getId());
        claimReward(customerToken, customer.getId(), popular.getId());
        claimReward(customerToken, customer.getId(), rare.getId());

        ResponseEntity<List<studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse>> response = restTemplate.exchange(
            baseUrl() + "/rewards/top",
            HttpMethod.GET,
            authed(cashierToken),
            new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        var ranking = response.getBody();
        var popularEntry = ranking.stream().filter(r -> r.id().equals(popular.getId())).findFirst().orElseThrow();
        var rareEntry = ranking.stream().filter(r -> r.id().equals(rare.getId())).findFirst().orElseThrow();
        assertThat(popularEntry.claimCount()).isEqualTo(2);
        assertThat(rareEntry.claimCount()).isEqualTo(1);
    }
}
