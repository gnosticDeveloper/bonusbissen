package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;

public record InvoiceResponse(
    UUID id,
    long invoiceNumber,
    String billingCycle,
    OffsetDateTime dueAt,
    OffsetDateTime createdAt,
    BigDecimal amount,
    String currency,
    List<Map<String, Object>> lineItems,
    String paymentStatus,
    boolean overdue,
    OffsetDateTime paidAt,
    String paymentReference
) {
    public static InvoiceResponse from(Invoice invoice) {
        boolean overdue = invoice.getPaymentStatus() == PaymentStatus.PENDING
            && invoice.getDueAt().isBefore(OffsetDateTime.now());
        return new InvoiceResponse(
            invoice.getId(),
            invoice.getInvoiceNumber(),
            invoice.getBillingCycle().getValue(),
            invoice.getDueAt(),
            invoice.getCreatedAt(),
            invoice.getAmount(),
            invoice.getCurrency(),
            invoice.getLineItems(),
            invoice.getPaymentStatus().getValue(),
            overdue,
            invoice.getPaidAt(),
            invoice.getPaymentReference()
        );
    }
}
