package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.entity.User;

import static org.assertj.core.api.Assertions.assertThat;

class PointActionResponseTest {

    @Test
    void earnExposesTheAssignedOffsetTimestampWithoutLosingSubDayPrecision() {
        PointTransaction tx = transaction(TransactionType.EARN);
        OffsetDateTime deadline = tx.getCreatedAt().plusHours(23).plusMinutes(59);
        tx.setExpiresAt(deadline);

        PointActionResponse response = PointActionResponse.from(tx);

        assertThat(response.expirationApplicable()).isTrue();
        assertThat(response.expiresAt()).isEqualTo(deadline.toString());
        assertThat(OffsetDateTime.parse(response.expiresAt())).isEqualTo(deadline);
    }

    @Test
    void unlimitedEarnAndVoidedEarnAreDistinguishable() {
        PointTransaction tx = transaction(TransactionType.EARN);
        assertThat(PointActionResponse.from(tx).expirationApplicable()).isTrue();
        assertThat(PointActionResponse.from(tx).expiresAt()).isNull();

        tx.setExpiresAt(tx.getCreatedAt().plusMonths(3));
        tx.setVoidedAt(tx.getCreatedAt().plusHours(1));
        assertThat(PointActionResponse.from(tx).expirationApplicable()).isFalse();
        assertThat(PointActionResponse.from(tx).expiresAt()).isNull();
    }

    @Test
    void correctionExposesTheOriginalsExpirationWithoutMakingTheAdjustmentApplicable() {
        PointTransaction original = transaction(TransactionType.EARN);
        original.setExpiresAt(original.getCreatedAt().plusMonths(3));
        PointTransaction correction = transaction(TransactionType.ADJUST);
        correction.setCorrectedTransaction(original);

        PointActionResponse response = PointActionResponse.from(correction);

        assertThat(response.type()).isEqualTo("edit");
        assertThat(response.expirationApplicable()).isFalse();
        assertThat(response.expiresAt()).isNull();
        assertThat(response.correctedTransaction().expirationApplicable()).isTrue();
        assertThat(response.correctedTransaction().expiresAt()).isEqualTo(original.getExpiresAt().toString());
        original.setVoidedAt(original.getCreatedAt().plusHours(1));
        assertThat(PointActionResponse.from(correction).correctedTransaction().expirationApplicable()).isFalse();
        assertThat(PointActionResponse.from(correction).correctedTransaction().expiresAt()).isNull();
    }

    @Test
    void expireUsesTheExpiredLotsDeadlineRatherThanItsOwnTimestamp() {
        PointTransaction lot = transaction(TransactionType.EARN);
        lot.setExpiresAt(lot.getCreatedAt().plusMonths(3));
        PointTransaction expired = transaction(TransactionType.EXPIRE);
        expired.setExpiredTransaction(lot);
        expired.setCreatedAt(lot.getExpiresAt().plusHours(8));

        PointActionResponse response = PointActionResponse.from(expired);

        assertThat(response.expirationApplicable()).isTrue();
        assertThat(response.expiresAt()).isEqualTo(lot.getExpiresAt().toString());
    }

    @Test
    void redeemAndAdjustDoNotExposeExpirationEvenIfADeadlineIsPresent() {
        for (TransactionType type : new TransactionType[] {TransactionType.REDEEM, TransactionType.ADJUST}) {
            PointTransaction tx = transaction(type);
            tx.setExpiresAt(tx.getCreatedAt().plusMonths(3));
            PointActionResponse response = PointActionResponse.from(tx);
            assertThat(response.expirationApplicable()).isFalse();
            assertThat(response.expiresAt()).isNull();
        }
    }

    private PointTransaction transaction(TransactionType type) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Customer");
        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setUser(user);
        tx.setTransactionType(type);
        tx.setPoints(type == TransactionType.EARN ? 100 : -20);
        tx.setCreatedAt(OffsetDateTime.parse("2024-01-31T10:15:12.123456-03:00"));
        return tx;
    }
}
