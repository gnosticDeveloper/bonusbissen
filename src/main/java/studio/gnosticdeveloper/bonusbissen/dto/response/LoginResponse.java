package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.List;

/**
 * @param token       the bearer token. For an employee it already carries the
 *                    active storefront when there is exactly one to pick.
 * @param storefronts the employee's assigned storefronts, so the client can
 *                    prompt for one when the token is not yet storefront-scoped.
 *                    Null on the user (loyalty account) path.
 */
public record LoginResponse(
    String token,
    List<StorefrontSummary> storefronts
) {
    public static LoginResponse of(String token) {
        return new LoginResponse(token, null);
    }
}
