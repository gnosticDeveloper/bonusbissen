package studio.gnosticdeveloper.bonusbissen.exception;

/**
 * The organization's subscription is unpaid past its grace period; mapped to 402.
 * {@code code} tells clients which audience this is: staff get SUBSCRIPTION_LAPSED
 * (an invoice overdue past grace) or SUBSCRIPTION_ENDED (they cancelled and the paid
 * period ran out), each with a message about billing, customers get BUSINESS_UNAVAILABLE with a neutral
 * message, so a business's payment trouble isn't spelled out to its customers.
 */
public class SubscriptionLapsedException extends RuntimeException {

    public static final String STAFF_CODE = "SUBSCRIPTION_LAPSED";
    public static final String STAFF_ENDED_CODE = "SUBSCRIPTION_ENDED";
    public static final String CUSTOMER_CODE = "BUSINESS_UNAVAILABLE";

    private final String publicMessage;
    private final String code;

    public SubscriptionLapsedException(String message, String publicMessage, String code) {
        super(message);
        this.publicMessage = publicMessage;
        this.code = code;
    }

    public String getPublicMessage() {
        return this.publicMessage;
    }

    public String getCode() {
        return this.code;
    }
}
