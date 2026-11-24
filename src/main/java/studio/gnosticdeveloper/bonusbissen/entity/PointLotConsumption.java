package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;

import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * How many points a redemption spent from one lot. Cancelling the redemption gives each part back
 * as a new lot carrying the original lot's expiry date (see PointTransactionService), so claiming
 * and cancelling can't push points past the date they were due to expire.
 */
@Entity
@Table(name = "point_lot_consumptions")
@Getter
@Setter
@NoArgsConstructor
public class PointLotConsumption {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consumer_transaction_id", nullable = false)
    private PointTransaction consumerTransaction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lot_transaction_id", nullable = false)
    private PointTransaction lotTransaction;

    @Column(nullable = false)
    private int points;
}
