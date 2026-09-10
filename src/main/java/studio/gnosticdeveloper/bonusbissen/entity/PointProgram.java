package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A named pool of points ("Puntos Café", "Club Online"). Belongs to one
 * organization and is honoured at one or more of its storefronts. A user's
 * balance is computed per (user, program).
 */
@Entity
@Table(name = "point_programs")
@Getter
@Setter
@NoArgsConstructor
public class PointProgram {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "unit_label", length = 50)
    private String unitLabel;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "point_program_storefronts",
        joinColumns = @JoinColumn(name = "point_program_id"),
        inverseJoinColumns = @JoinColumn(name = "storefront_id")
    )
    private Set<Storefront> storefronts = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
