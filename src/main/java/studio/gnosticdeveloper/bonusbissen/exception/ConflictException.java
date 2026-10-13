package studio.gnosticdeveloper.bonusbissen.exception;

public class ConflictException extends RuntimeException {

    private String publicMessage;

    public ConflictException(String message, String publicMessage) {
        super(message);
        this.publicMessage = publicMessage;
    }

    public String getPublicMessage() {
        return this.publicMessage;
    }
}
