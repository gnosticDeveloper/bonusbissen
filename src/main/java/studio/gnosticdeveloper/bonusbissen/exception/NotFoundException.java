package studio.gnosticdeveloper.bonusbissen.exception;

public class NotFoundException extends RuntimeException {

    private String publicMessage;

    public NotFoundException(String message, String publicMessage) {
        super(message);
        this.publicMessage = publicMessage;
    }

    public String getPublicMessage() {
        return this.publicMessage;
    }
}
