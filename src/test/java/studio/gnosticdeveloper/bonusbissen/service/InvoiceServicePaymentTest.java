package studio.gnosticdeveloper.bonusbissen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.email.EmailSender;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.MercadoPagoPayment;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MercadoPagoPaymentRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;

/** Quality report B12: what Mercado Pago charged is kept on the invoice, and a shortfall is flagged. */
@ExtendWith(MockitoExtension.class)
class InvoiceServicePaymentTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private MercadoPagoPaymentRepository mercadoPagoPaymentRepository;
    @Mock
    private InvoiceDocumentService invoiceDocumentService;
    @Mock
    private EmailSender emailSender;

    @InjectMocks
    private InvoiceService invoiceService;

    private static Invoice invoice(String amount) {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setAmount(new BigDecimal(amount));
        invoice.setCurrency("ARS");
        return invoice;
    }

    private static MercadoPagoPayment payment(String amount, String currency) {
        MercadoPagoPayment payment = new MercadoPagoPayment();
        payment.setAuthorizedPaymentId("mp-" + UUID.randomUUID());
        payment.setAmount(amount == null ? null : new BigDecimal(amount));
        payment.setCurrency(currency);
        return payment;
    }

    @Test
    void exactPaymentMarksPaidWithoutFlag() {
        Invoice invoice = invoice("15000.00");
        MercadoPagoPayment payment = payment("15000", "ARS");

        invoiceService.applyPayment(invoice, payment);

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo("15000");
        assertThat(invoice.getPaidCurrency()).isEqualTo("ARS");
        assertThat(invoice.isNeedsReconciliation()).isFalse();
        assertThat(payment.getInvoice()).isSameAs(invoice);
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void shortPaymentStillMarksPaidButIsFlagged() {
        Invoice invoice = invoice("25000.00");

        invoiceService.applyPayment(invoice, payment("15000.00", "ARS"));

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo("15000");
        assertThat(invoice.isNeedsReconciliation()).isTrue();
    }

    @Test
    void paymentInAnotherCurrencyIsFlagged() {
        Invoice invoice = invoice("15000.00");

        invoiceService.applyPayment(invoice, payment("15000.00", "USD"));

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoice.getPaidCurrency()).isEqualTo("USD");
        assertThat(invoice.isNeedsReconciliation()).isTrue();
    }

    @Test
    void overpaymentIsRecordedButNotFlagged() {
        Invoice invoice = invoice("15000.00");

        invoiceService.applyPayment(invoice, payment("25000.00", "ARS"));

        assertThat(invoice.getPaidAmount()).isEqualByComparingTo("25000");
        assertThat(invoice.isNeedsReconciliation()).isFalse();
    }

    @Test
    void unknownAmountOrCurrencyIsNotTreatedAsAMismatch() {
        Invoice invoice = invoice("15000.00");

        invoiceService.applyPayment(invoice, payment(null, null));

        assertThat(invoice.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(invoice.getPaidAmount()).isNull();
        assertThat(invoice.isNeedsReconciliation()).isFalse();
    }
}
