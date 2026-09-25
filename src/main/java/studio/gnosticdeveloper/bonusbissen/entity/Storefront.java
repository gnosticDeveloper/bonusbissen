package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A single point of contact with customers: a physical branch or an online
 * shop. When {@code online} is true there is no street address; a physical
 * storefront must carry one (enforced by a DB CHECK and re-checked in the
 * service layer).
 */
@Entity
@Table(name = "storefronts")
@Getter
@Setter
@NoArgsConstructor
public class Storefront {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "point_program_id")
    private PointProgram pointProgram;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false)
    private boolean online = false;

    @Column(length = 255)
    private String address;

    /** Canonical locality (localidad censal), derived via georef-ar. */
    @Column(length = 120)
    private String city;

    /** Canonical provincia, derived via georef-ar. */
    @Column(length = 120)
    private String province;

    @Column(length = 80)
    private String category;

    @Column(length = 9)
    private String color;

    @Column()
    private String hours;

    @Column(length = 30)
    private String phone;

    @Column(name = "icon_path")
    private String iconPath;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
