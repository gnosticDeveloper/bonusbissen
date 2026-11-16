package studio.gnosticdeveloper.bonusbissen.merchant;

import java.math.BigDecimal;

/**
 * A paid order, in the one shape the points core understands -- whatever the payment source
 * (a merchant's own server, Mercado Pago, a Pix PSP, MODO, ...) sent. {@code identifier} is what the
 * shopper typed or the source carried along: a BonusBissen username or email.
 */
public record PaidOrder(String externalOrderId, String identifier, BigDecimal amount, String currency) {}
