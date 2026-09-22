package studio.gnosticdeveloper.bonusbissen.service;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.dto.response.BusinessResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.CityOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.RewardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.StorefrontDiscoverResponse;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;

/** Public "negocios cerca" feed: active storefronts, each with its cheapest rewards. */
@Service
public class DiscoveryService {

    private static final String DEFAULT_COLOR = "#232027";
    private static final String DEFAULT_POINT_LABEL = "puntos";
    private static final int MAX_REWARDS_PER_CARD = 3;

    private final StorefrontRepository storefrontRepository;
    private final RewardRepository rewardRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public DiscoveryService(
        StorefrontRepository storefrontRepository,
        RewardRepository rewardRepository,
        PointTransactionRepository pointTransactionRepository
    ) {
        this.storefrontRepository = storefrontRepository;
        this.rewardRepository = rewardRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    @Transactional(readOnly = true)
    public PagedResponse<BusinessResponse> discover(String city, UUID viewerUserId, Pageable pageable) {
        String cityFilter = city == null || city.isBlank() ? null : city.trim();
        Page<BusinessResponse> page = storefrontRepository
            .findDiscoverable(cityFilter, pageable)
            .map(storefront -> toBusiness(storefront, viewerUserId));
        return PagedResponse.from(page);
    }

    @Transactional(readOnly = true)
    public BusinessResponse discoverBusinessById(UUID storefrontId, UUID viewerUserId) {
        BusinessResponse business = storefrontRepository
            .findById(storefrontId)
            .map(storefront -> toBusiness(storefront, viewerUserId))
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la sucursal con ID " + storefrontId + "."));
        return business;
    }

    @Transactional(readOnly = true)
    public List<CityOption> cities() {
        return storefrontRepository
            .findDistinctActiveCities()
            .stream()
            .map(name -> new CityOption(name, name))
            .toList();
    }

    @Transactional(readOnly = true)
    public StorefrontDiscoverResponse getStorefrontBasicInfoById(UUID id) {
        return storefrontRepository
            .getBasicInfoById(id)
            .orElseThrow(() -> new NotFoundException("No se pudo encontrar la sucursal con ID " + id + "."));
    }

    private BusinessResponse toBusiness(Storefront storefront, UUID viewerUserId) {
        PointProgram program = storefront.getPointProgram();

        String pointLabel = DEFAULT_POINT_LABEL;
        int points = 0;
        List<RewardResponse> rewards = List.of();

        if (program != null) {
            if (program.getUnitLabel() != null && !program.getUnitLabel().isBlank()) {
                pointLabel = program.getUnitLabel();
            }
            if (viewerUserId != null) {
                points = pointTransactionRepository.calculateBalance(viewerUserId, program.getId());
            }
            rewards = rewardRepository
                .findByActiveTrue(null, null, program.getId())
                .stream()
                .sorted(Comparator.comparingInt(Reward::getCostPoints))
                .limit(MAX_REWARDS_PER_CARD)
                .map(RewardResponse::from)
                .toList();
        }

        return new BusinessResponse(
            storefront.getId(),
            storefront.getName(),
            storefront.getCategory(),
            storefront.getDescription(),
            storefront.getColor() != null ? storefront.getColor() : DEFAULT_COLOR,
            storefront.getIconPath(),
            pointLabel,
            points,
            rewards,
            new BusinessResponse.Address(storefront.getAddress(), storefront.getCity(), storefront.getProvince())
        );
    }
}
