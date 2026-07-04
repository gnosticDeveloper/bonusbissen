package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "menu_items")
@Getter
@Setter
@NoArgsConstructor
public class MenuItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "points_value", nullable = false)
    private int pointsValue;

    @Column(nullable = false)
    private boolean active = true;

    @Setter(AccessLevel.NONE)
    @OneToMany(mappedBy = "menuItem", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<MenuItemVariant> variants = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    // Mutates the managed collection in place rather than replacing it, so
    // Hibernate's cascade="all-delete-orphan" tracking stays intact.
    public void replaceVariants(List<MenuItemVariant> newVariants) {
        variants.clear();
        for (MenuItemVariant variant : newVariants) {
            variant.setMenuItem(this);
            variants.add(variant);
        }
    }

    public MenuItemVariant findVariant(String name) {
        return variants.stream()
                .filter(v -> v.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
    }
}
