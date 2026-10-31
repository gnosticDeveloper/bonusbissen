package studio.gnosticdeveloper.bonusbissen.mercadopago;

public class MercadoPagoApiException extends RuntimeException {

    private final int statusCode;

    public MercadoPagoApiException(String message) {
        this(message, 0);
    }

    /** {@code statusCode} is MP's HTTP status, or 0 when there wasn't a usable response at all. */
    public MercadoPagoApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    /** MP says the resource doesn't exist -- retrying can't change that. */
    public boolean isNotFound() {
        return statusCode == 404;
    }
}
