package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Whether a {@link User} is currently staff somewhere, and with what role. At most one row per user is active at a time. */
@Entity
@Table(name = "organization_staff")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationStaff {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 20)
    private StaffRole role;

    @Column(nullable = false)
    private boolean active = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "staff_storefronts",
        joinColumns = @JoinColumn(name = "staff_id"),
        inverseJoinColumns = @JoinColumn(name = "storefront_id")
    )
    private Set<Storefront> storefronts = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * The storefronts this person can work in. A cashier never gets a deactivated one; an admin
     * still does, so a business whose only storefront was deactivated can sign in and reactivate it.
     */
    public List<Storefront> selectableStorefronts() {
        return storefronts.stream().filter(s -> role != StaffRole.CASHIER || s.isActive()).toList();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
