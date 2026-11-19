package studio.gnosticdeveloper.bonusbissen.integration;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.service.PointExpirationWorker;

/**
 * Quality report B5/B6: refunds, corrections and expiration against the FIFO cursor, end to end.
 * Deadlines are set directly on the rows (the shared test program has no expiration period) and
 * "time passing" is moving a deadline into the past before running the expiration worker.
 */
class LedgerExpiryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PointExpirationWorker worker;

    private record Actors(User user, String userToken, String cashierToken) {}

    private Actors actors() {
        String key = UUID.randomUUID().toString().substring(0, 8);
        createEmployee("ledger-cashier-" + key, "password123", StaffRole.CASHIER);
        User user = createUser("ledger-user-" + key);
        joinProgram(user.getId(), defaultProgram());
        return new Actors(user, loginUser("ledger-user-" + key), loginEmployee("ledger-cashier-" + key, "password123"));
    }

    /** Distinct notes: identical grants within seconds are deduplicated (report M5). */
    private UUID grant(Actors a, int points, String note) {
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/grant", HttpMethod.POST,
            authed(a.cashierToken(), new GrantPointsRequest(a.user().getId(), points, note)), String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return jdbc.queryForObject(
            "select id from point_transactions where user_id = ? and transaction_type = 'earn' and note = ?",
            UUID.class, a.user().getId(), note
        );
    }

    private UUID claim(Actors a, int cost) {
        Reward reward = createReward("Ledger reward " + UUID.randomUUID(), cost);
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/claim-reward", HttpMethod.POST,
            authed(a.userToken(), new ClaimRewardRequest(a.user().getId(), reward.getId())), String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return jdbc.queryForObject(
            "select id from point_transactions where user_id = ? and reward_id = ?", UUID.class, a.user().getId(), reward.getId()
        );
    }

    private void cancel(Actors a, UUID redemptionId) {
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/exchanges/user-cancel", HttpMethod.POST,
            authed(a.userToken(), new UserCancelExchangeRequest(redemptionId)), String.class
        );
        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
    }

    private void correct(Actors a, UUID grantId, int target) {
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/users/grant/" + grantId, HttpMethod.PATCH,
            authed(a.cashierToken(), new GrantPointsUpdateRequest(target, "error de carga")), String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private int balance(Actors a) {
        return restTemplate.exchange(
            baseUrl() + "/users/" + a.user().getId() + "?programId=" + defaultProgram().getId(),
            HttpMethod.GET, authed(a.cashierToken()), UserPointsResponse.class
        ).getBody().points();
    }

    private OffsetDateTime now() {
        return jdbc.queryForObject("select current_timestamp", OffsetDateTime.class);
    }

    private void setDeadline(UUID transactionId, OffsetDateTime deadline) {
        jdbc.update("update point_transactions set expires_at = ? where id = ?", deadline, transactionId);
    }

    /** Moves every unsettled deadline equal to {@code deadline} into the past -- i.e. that day arrives. */
    private void arrive(Actors a, OffsetDateTime deadline) {
        jdbc.update(
            "update point_transactions set expires_at = ? where user_id = ? and expires_at = ? and expiry_settled_at is null",
            now().minusMinutes(1), a.user().getId(), deadline
        );
        worker.processPair(a.user().getId(), defaultProgram().getId());
    }

    private int expiredPoints(Actors a) {
        Integer sum = jdbc.queryForObject(
            "select coalesce(sum(points), 0) from point_transactions where user_id = ? and transaction_type = 'expire'",
            Integer.class, a.user().getId()
        );
        return -sum;
    }

    @Test
    void cancellingAClaimGivesEachPartBackWithTheDeadlineItHad() {
        Actors a = actors();
        OffsetDateTime soon = now().plusDays(2).withNano(0);
        OffsetDateTime later = now().plusDays(90).withNano(0);
        setDeadline(grant(a, 300, "b5 first"), soon);
        setDeadline(grant(a, 200, "b5 second"), later);

        UUID redemption = claim(a, 500);
        cancel(a, redemption);

        List<Map<String, Object>> refunds = jdbc.queryForList(
            "select points, expires_at from point_transactions where refunded_transaction_id = ? order by points desc", redemption
        );
        assertThat(refunds).hasSize(2);
        assertThat(refunds.get(0).get("points")).isEqualTo(300);
        assertThat(jdbc.queryForObject(
            "select expires_at from point_transactions where refunded_transaction_id = ? and points = 300", OffsetDateTime.class, redemption
        ).toInstant()).isEqualTo(soon.toInstant());
        assertThat(jdbc.queryForObject(
            "select expires_at from point_transactions where refunded_transaction_id = ? and points = 200", OffsetDateTime.class, redemption
        ).toInstant()).isEqualTo(later.toInstant());
        assertThat(balance(a)).isEqualTo(500);

        // The first grant's day arrives: its 300 points expire even though they were refunded,
        // exactly as if the claim had never happened. The cursor is past the original lots, so
        // this is the refund lot (ahead of the cursor) expiring out of creation order.
        arrive(a, soon);
        assertThat(expiredPoints(a)).isEqualTo(300);
        assertThat(balance(a)).isEqualTo(200);

        // The remaining 200 are still spendable after that.
        claim(a, 200);
        assertThat(balance(a)).isEqualTo(0);
    }

    @Test
    void claimAndCancelNoLongerKeepsPointsAliveForever() {
        Actors a = actors();
        OffsetDateTime soon = now().plusDays(1).withNano(0);
        setDeadline(grant(a, 500, "b5 loop"), soon);

        for (int i = 0; i < 3; i++) {
            cancel(a, claim(a, 500));
        }

        arrive(a, soon);
        assertThat(balance(a)).isEqualTo(0);
    }

    @Test
    void reversingAGrantTakesItsOwnPointsNotTheOldestGrants() {
        Actors a = actors();
        OffsetDateTime january = now().plusDays(30).withNano(0);
        UUID first = grant(a, 100, "b6 first");
        setDeadline(first, january);
        UUID second = grant(a, 50, "b6 second");
        setDeadline(second, now().plusDays(60).withNano(0));

        correct(a, second, 0);
        assertThat(balance(a)).isEqualTo(100);

        // Before the fix the reversal ate 50 of the first grant, so only 50 expired here and 50
        // points "of the second grant" stayed forever.
        arrive(a, january);
        assertThat(expiredPoints(a)).isEqualTo(100);
        assertThat(balance(a)).isEqualTo(0);
    }

    @Test
    void raisingAGrantExpiresTheExtraPointsWithIt() {
        Actors a = actors();
        OffsetDateTime deadline = now().plusDays(30).withNano(0);
        UUID original = grant(a, 100, "b6 raise");
        setDeadline(original, deadline);

        correct(a, original, 150);
        assertThat(jdbc.queryForObject(
            "select expires_at from point_transactions where corrected_transaction_id = ?", OffsetDateTime.class, original
        ).toInstant()).isEqualTo(deadline.toInstant());

        arrive(a, deadline);
        assertThat(expiredPoints(a)).isEqualTo(150);
        assertThat(balance(a)).isEqualTo(0);
    }

    @Test
    void loweringAPartlySpentGrantOnlyLeavesWhatIsLeftOfItToExpire() {
        Actors a = actors();
        OffsetDateTime deadline = now().plusDays(30).withNano(0);
        UUID original = grant(a, 100, "b6 partly spent");
        setDeadline(original, deadline);
        claim(a, 30);

        correct(a, original, 50);
        assertThat(balance(a)).isEqualTo(20);

        arrive(a, deadline);
        assertThat(expiredPoints(a)).isEqualTo(20);
        assertThat(balance(a)).isEqualTo(0);
    }

    @Test
    void loweringAFullySpentGrantTakesTheDifferenceFromTheNextGrant() {
        Actors a = actors();
        UUID first = grant(a, 100, "b6 spent first");
        setDeadline(first, now().plusDays(10).withNano(0));
        OffsetDateTime secondDeadline = now().plusDays(40).withNano(0);
        setDeadline(grant(a, 100, "b6 spent second"), secondDeadline);
        claim(a, 100);

        // The first grant was all spent, so the 60 it shouldn't have had come off the second.
        correct(a, first, 40);
        assertThat(balance(a)).isEqualTo(40);

        arrive(a, secondDeadline);
        assertThat(expiredPoints(a)).isEqualTo(40);
        assertThat(balance(a)).isEqualTo(0);
    }
}
