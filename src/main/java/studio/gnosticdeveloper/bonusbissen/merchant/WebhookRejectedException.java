package studio.gnosticdeveloper.bonusbissen.merchant;

/** The notification could not be authenticated (unknown or revoked integration, bad signature, stale timestamp...). Mapped to a bare 401. */
public class WebhookRejectedException extends RuntimeException {
    public WebhookRejectedException(String message) {
        super(message);
    }
}
