package studio.gnosticdeveloper.bonusbissen.exception;

import lombok.Getter;

import java.util.UUID;

@Getter
public class InactiveCustomerConflictException extends RuntimeException {

    private final UUID customerId;

    public InactiveCustomerConflictException(String message, UUID customerId) {
        super(message);
        this.customerId = customerId;
    }

}
