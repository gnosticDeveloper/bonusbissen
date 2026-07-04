package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "menu_item_variants")
@Getter
@Setter
@NoArgsConstructor
public class MenuItemVariant {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "points_value", nullable = false)
    private int pointsValue;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public MenuItemVariant(String name, int pointsValue) {
        this.name = name;
        this.pointsValue = pointsValue;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
