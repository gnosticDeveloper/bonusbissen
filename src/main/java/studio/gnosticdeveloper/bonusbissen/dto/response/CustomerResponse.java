package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Customer;

import java.util.UUID;

public record CustomerResponse(
        UUID id,
        String document,
        String name,
        String phone
) {
    public static CustomerResponse from(Customer customer) {
        return new CustomerResponse(customer.getId(), customer.getDocument(), customer.getName(), customer.getPhone());
    }
}
