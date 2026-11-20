package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.Email;

/**
 * Optional body of the checkout call. {@code payerEmail} is the email of the
 * Mercado Pago account that will pay -- left out, the one used last time (or
 * the billing email, the first time) is reused.
 */
public record MercadoPagoCheckoutRequest(@Email String payerEmail) {}
