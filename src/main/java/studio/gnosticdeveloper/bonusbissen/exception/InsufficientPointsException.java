package studio.gnosticdeveloper.bonusbissen.exception;

public class InsufficientPointsException extends ConflictException {
    public InsufficientPointsException(String message) {
        super(message);
    }
}
