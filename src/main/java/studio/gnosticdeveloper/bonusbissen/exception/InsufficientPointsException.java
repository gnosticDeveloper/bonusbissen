package studio.gnosticdeveloper.bonusbissen.exception;

public class InsufficientPointsException extends ConflictException {

    private String publicMessage;

    public InsufficientPointsException(String message, String publicMessage) {
        super(message, publicMessage);
        this.publicMessage = publicMessage;
    }

    public String getPublicMessage() {
        return this.publicMessage;
    }
}
