package studio.gnosticdeveloper.bonusbissen.exception;

public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
