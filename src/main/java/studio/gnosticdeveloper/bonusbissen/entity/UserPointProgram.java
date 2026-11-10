package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A user's membership in a point program -- required before points can be
 * earned there. Joined self-service.
 */
@Entity
@Table(name = "user_point_programs")
@Getter
@Setter
@NoArgsConstructor
public class UserPointProgram {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "point_program_id", nullable = false)
    private PointProgram pointProgram;

    /** Storefront the user joined through; null when the join had none (joined by program id). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storefront_id")
    private Storefront storefront;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private OffsetDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) {
            joinedAt = OffsetDateTime.now();
        }
    }
}
