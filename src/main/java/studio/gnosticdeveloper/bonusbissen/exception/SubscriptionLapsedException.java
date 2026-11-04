package studio.gnosticdeveloper.bonusbissen.exception;

/** The organization's subscription is unpaid past its grace period; mapped to 402 for the staff who hit it. */
public class SubscriptionLapsedException extends RuntimeException {

    private final String publicMessage;

    public SubscriptionLapsedException(String message, String publicMessage) {
        super(message);
        this.publicMessage = publicMessage;
    }

    public String getPublicMessage() {
        return this.publicMessage;
    }
}
