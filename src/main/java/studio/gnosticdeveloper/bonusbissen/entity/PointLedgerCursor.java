package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;

import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One row per (user, program) pair: where FIFO consumption last reached, and how far into that
 * lot. Every lot older than lastTransaction (by createdAt, tie-broken by id) is fully consumed;
 * every lot newer than it hasn't been touched yet. lastTransaction null means nothing has ever
 * been consumed for this pair. This is the only state consumption needs -- see PointLedgerService.
 */
@Entity
@Table(name = "point_ledger_cursors")
@Getter
@Setter
@NoArgsConstructor
public class PointLedgerCursor {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "point_program_id", nullable = false)
    private PointProgram pointProgram;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_transaction_id")
    private PointTransaction lastTransaction;

    @Column(name = "offset_points", nullable = false)
    private int offsetPoints;
}
