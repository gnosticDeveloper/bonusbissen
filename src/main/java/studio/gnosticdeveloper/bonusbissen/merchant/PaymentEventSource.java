package studio.gnosticdeveloper.bonusbissen.merchant;

import java.util.Optional;

/**
 * One way payment notifications reach us. Everything source-specific lives behind this: how the
 * sender is authenticated (HMAC header, Mercado Pago's x-signature, a PSP's mTLS or token), how
 * the payload is read, and -- for "thin" notifications that only carry an id -- the follow-up API
 * call that fetches the real payment. Everything after that (idempotency, shopper lookup, points,
 * join, tracing) is the same for every source and lives in OnlinePurchaseService.
 *
 * Implementations are Spring beans; WebhookController finds them by {@link #key()}, which is the
 * {@code {source}} segment of {@code POST /webhooks/{source}} and the integration's provider.
 */
public interface PaymentEventSource {

    String key();

    /**
     * Authenticates the notification and extracts the paid order it describes.
     *
     * @return empty for an authentic notification that is nothing to credit (e.g. an order that
     *         isn't paid yet) -- acknowledged, not retried
     * @throws WebhookRejectedException if the sender can't be authenticated
     */
    Optional<ReceivedPayment> receive(RawWebhook raw);
}
