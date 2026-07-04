package studio.gnosticdeveloper.bonusbissen.service;

import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.BenefitType;
import studio.gnosticdeveloper.bonusbissen.entity.MenuItem;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.MenuItemRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class RewardService {

    private final RewardRepository rewardRepository;
    private final MenuItemRepository menuItemRepository;

    public RewardService(RewardRepository rewardRepository, MenuItemRepository menuItemRepository) {
        this.rewardRepository = rewardRepository;
        this.menuItemRepository = menuItemRepository;
    }

    @Transactional(readOnly = true)
    public List<Reward> listActive() {
        return rewardRepository.findByActiveTrue();
    }

    @Transactional
    public Reward create(RewardCreateRequest request) {
        validateShape(request.benefitType(), request.menuItemId(), request.discountValue());

        Reward reward = new Reward();
        reward.setName(request.name());
        reward.setDescription(request.description());
        reward.setCostPoints(request.costPoints());
        reward.setBenefitType(request.benefitType());
        reward.setDiscountValue(request.discountValue());
        reward.setMenuItem(resolveMenuItem(request.menuItemId()));
        return rewardRepository.save(reward);
    }

    @Transactional
    public Reward update(UUID id, RewardUpdateRequest request) {
        Reward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Reward not found: " + id));

        BenefitType benefitType = request.benefitType() != null ? request.benefitType() : reward.getBenefitType();
        UUID menuItemId = request.menuItemId() != null
                ? request.menuItemId()
                : (reward.getMenuItem() != null ? reward.getMenuItem().getId() : null);
        BigDecimal discountValue = request.discountValue() != null ? request.discountValue() : reward.getDiscountValue();

        validateShape(benefitType, menuItemId, discountValue);

        if (request.name() != null) {
            reward.setName(request.name());
        }
        if (request.description() != null) {
            reward.setDescription(request.description());
        }
        if (request.costPoints() != null) {
            reward.setCostPoints(request.costPoints());
        }
        reward.setBenefitType(benefitType);
        reward.setDiscountValue(discountValue);
        reward.setMenuItem(resolveMenuItem(menuItemId));
        if (request.active() != null) {
            reward.setActive(request.active());
        }
        return rewardRepository.save(reward);
    }

    private void validateShape(BenefitType benefitType, UUID menuItemId, BigDecimal discountValue) {
        if (benefitType == BenefitType.FREE_ITEM) {
            if (menuItemId == null) {
                throw new BadRequestException("free_item rewards require a menuItemId");
            }
            if (discountValue != null) {
                throw new BadRequestException("free_item rewards must not set discountValue");
            }
        } else {
            if (discountValue == null) {
                throw new BadRequestException(benefitType.dbValue() + " rewards require a discountValue");
            }
        }
    }

    private MenuItem resolveMenuItem(UUID menuItemId) {
        if (menuItemId == null) {
            return null;
        }
        return menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new NotFoundException("Menu item not found: " + menuItemId));
    }
}
