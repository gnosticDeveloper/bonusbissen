package studio.gnosticdeveloper.bonusbissen.entity;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PointTransactionExpirationTest {

    @Test
    void creationUsesTheLotsCreatedAtAndClampsTheEndOfTheMonth() {
        PointTransaction tx = earn(3);
        tx.setCreatedAt(OffsetDateTime.parse("2023-11-30T16:45:12.123456Z"));

        tx.onCreate();

        assertThat(tx.getExpiresAt()).isEqualTo(OffsetDateTime.parse("2024-02-29T16:45:12.123456Z"));
    }

    @Test
    void creationInitializesCreatedAtBeforeCalculatingExpiration() {
        PointTransaction tx = earn(6);

        tx.onCreate();

        assertThat(tx.getCreatedAt()).isNotNull();
        assertThat(tx.getExpiresAt()).isEqualTo(tx.getPointProgram().computeExpiresAt(tx.getCreatedAt()));
    }

    @Test
    void calendarArithmeticUsesUtcEvenWhenCreationHasAnotherOffset() {
        PointTransaction tx = earn(3);
        tx.setCreatedAt(OffsetDateTime.parse("2024-01-31T23:30:00-03:00"));

        tx.onCreate();

        assertThat(tx.getExpiresAt()).isEqualTo(OffsetDateTime.parse("2024-05-01T02:30:00Z"));
    }

    @Test
    void explicitHistoricalDeadlineIsNotOverwritten() {
        PointTransaction tx = earn(12);
        OffsetDateTime assigned = OffsetDateTime.parse("2024-02-29T16:45:00Z");
        tx.setExpiresAt(assigned);

        tx.onCreate();

        assertThat(tx.getExpiresAt()).isEqualTo(assigned);
    }

    @Test
    void unlimitedEarnsRemainApplicableButHaveNoDeadline() {
        PointTransaction tx = earn(null);

        tx.onCreate();

        assertThat(tx.isExpirationApplicable()).isTrue();
        assertThat(tx.getApplicableExpiresAt()).isNull();
    }

    @Test
    void refundsUseTheirOwnCreationTimeNotTheRedeemedTransactionsCreationTime() {
        PointTransaction redeemed = new PointTransaction();
        redeemed.setCreatedAt(OffsetDateTime.parse("2020-01-01T10:00:00Z"));
        PointTransaction refund = earn(3);
        refund.setRefundedTransaction(redeemed);
        refund.setCreatedAt(OffsetDateTime.parse("2024-01-31T10:00:00Z"));

        refund.onCreate();

        assertThat(refund.getExpiresAt()).isEqualTo(OffsetDateTime.parse("2024-04-30T10:00:00Z"));
    }

    @Test
    void adjustmentsRedemptionsAndVoidedEarnsDoNotReceiveDeadlines() {
        for (TransactionType type : new TransactionType[] {TransactionType.ADJUST, TransactionType.REDEEM}) {
            PointTransaction tx = earn(3);
            tx.setTransactionType(type);
            tx.onCreate();
            assertThat(tx.isExpirationApplicable()).isFalse();
            assertThat(tx.getExpiresAt()).isNull();
        }
        PointTransaction voided = earn(3);
        voided.setVoidedAt(OffsetDateTime.now());
        voided.onCreate();
        assertThat(voided.isExpirationApplicable()).isFalse();
        assertThat(voided.getApplicableExpiresAt()).isNull();
    }

    private PointTransaction earn(Integer months) {
        PointProgram program = new PointProgram();
        program.setExpirationMonths(months);
        PointTransaction tx = new PointTransaction();
        tx.setPointProgram(program);
        tx.setTransactionType(TransactionType.EARN);
        return tx;
    }
}
