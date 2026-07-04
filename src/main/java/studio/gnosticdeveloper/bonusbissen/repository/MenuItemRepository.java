package studio.gnosticdeveloper.bonusbissen.repository;

import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {
    List<MenuItem> findByActiveTrue();
}
