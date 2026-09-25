package studio.gnosticdeveloper.bonusbissen.exception;

/** Self-service password change: the caller's current-password confirmation didn't match. */
public class IncorrectPasswordException extends RuntimeException {
    public IncorrectPasswordException(String message) {
        super(message);
    }
}
