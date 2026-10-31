package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.Map;

/** MP's hosted checkout link for the org to authorize the recurring charge at. */
public record MercadoPagoCheckoutResponse(String initPoint, String status) {
    public static MercadoPagoCheckoutResponse from(Map<String, Object> preapproval) {
        return new MercadoPagoCheckoutResponse(
            String.valueOf(preapproval.get("init_point")),
            String.valueOf(preapproval.get("status"))
        );
    }
}
