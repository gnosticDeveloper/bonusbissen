package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;
import java.util.UUID;

/** One discover card. {@code points} is 0 when the request carries no user token. */
public record BusinessResponse(
    UUID id,
    String name,
    String category,
    String description,
    String color,
    String logoUrl,
    String pointLabel,
    int points,
    List<RewardResponse> rewards,
    Address address
) {
    public record Address(String street, String city, String province) {}
}
