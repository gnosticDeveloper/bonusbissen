package studio.gnosticdeveloper.bonusbissen.merchant;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;

/** A third-party online business allowed to credit points through one online storefront (and so into its point program). */
@Entity
@Table(name = "merchant_integrations")
@Getter
@Setter
@NoArgsConstructor
public class MerchantIntegration {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "storefront_id", nullable = false)
    private Storefront storefront;

    @Column(nullable = false, length = 100)
    private String name;

    /** Which PaymentEventSource handles this integration's notifications, e.g. "merchant". */
    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "key_id", nullable = false, unique = true, length = 40)
    private String keyId;

    /** Encrypted, opaque to everything but the provider's own source. */
    @Column(name = "credentials_encrypted", nullable = false, columnDefinition = "text")
    private String credentialsEncrypted;

    @Column(name = "points_per_unit", nullable = false, precision = 12, scale = 4)
    private BigDecimal pointsPerUnit;

    @Column(nullable = false, length = 3)
    private String currency;

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
