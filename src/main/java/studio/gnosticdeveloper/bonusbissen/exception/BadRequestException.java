package studio.gnosticdeveloper.bonusbissen.exception;

public class BadRequestException extends RuntimeException {
    private String publicMessage;

    public BadRequestException(String message, String publicMessage) {
        super(message);
        this.publicMessage = publicMessage;
    }

    public String getPublicMessage() {
        return this.publicMessage;
    }
}
