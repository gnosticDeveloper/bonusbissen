package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.Customer;

public record CustomerPointsResponse(UUID id, String name, String phone, Integer points, String formattedCreatedAt) {
    private static final ZoneId ZONE_ARGENTINA = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.of("es", "AR"));

    public static CustomerPointsResponse from(Customer customer, Integer points) {
        String formattedDate = customer.getCreatedAt().atZoneSameInstant(ZONE_ARGENTINA).format(DATE_FORMAT);
        return new CustomerPointsResponse(customer.getId(), customer.getName(), customer.getPhone(), points, formattedDate);
    }
}
