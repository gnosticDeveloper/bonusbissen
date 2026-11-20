package studio.gnosticdeveloper.bonusbissen.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;
import studio.gnosticdeveloper.bonusbissen.entity.BillingCycle;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.IvaCondition;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;

class InvoiceDocumentServiceTest {

    private final InvoiceDocumentService service = new InvoiceDocumentService();

    private Organization org() {
        Organization org = new Organization();
        org.setName("Café Demo");
        org.setFiscalName("Café Demo S.R.L.");
        org.setTaxId("30-71234567-8");
        org.setIvaCondition(IvaCondition.RESPONSABLE_INSCRIPTO);
        return org;
    }

    private Invoice invoice(long number) {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(number);
        invoice.setBillingCycle(BillingCycle.MONTHLY);
        invoice.setDueAt(OffsetDateTime.of(2026, 10, 29, 20, 38, 0, 0, ZoneOffset.UTC));
        invoice.setAmount(new BigDecimal("15000.00"));
        invoice.setCurrency("ARS");
        // JSONB hands numbers back as Double, which is what used to print as "15000.0".
        invoice.setLineItems(List.of(Map.of("label", "Plan Básico", "amount", 15000.0)));
        return invoice;
    }

    private String text(byte[] pdf) throws Exception {
        PdfReader reader = new PdfReader(pdf);
        try {
            return new PdfTextExtractor(reader).getTextFromPage(1);
        } finally {
            reader.close();
        }
    }

    @Test
    void moneyUsesArgentineSeparatorsAndAlwaysTwoDecimals() {
        assertThat(InvoiceDocumentService.formatMoney("ARS", 15000.0)).isEqualTo("ARS 15.000,00");
        assertThat(InvoiceDocumentService.formatMoney("ARS", new BigDecimal("1234567.5"))).isEqualTo("ARS 1.234.567,50");
        assertThat(InvoiceDocumentService.formatMoney("ARS", 15000)).isEqualTo("ARS 15.000,00");
    }

    @Test
    void invoiceNumbersArePaddedSoFilenamesSortInIssueOrder() {
        assertThat(InvoiceDocumentService.formatInvoiceNumber(invoice(7))).isEqualTo("000007");
        assertThat(InvoiceDocumentService.formatInvoiceNumber(invoice(123456))).isEqualTo("123456");
    }

    @Test
    void aPendingInvoiceShowsItsNumberAmountsAndPendingStatus() throws Exception {
        String text = text(service.generate(org(), invoice(42)));

        assertThat(text).contains("Factura N.º 000042");
        assertThat(text).contains("Estado: Pendiente de pago");
        assertThat(text).contains("ARS 15.000,00");
        assertThat(text).doesNotContain("15000.0");
        assertThat(text).doesNotContain("Referencia de pago");
    }

    @Test
    void aPaidInvoiceShowsWhenAndHowItWasPaid() throws Exception {
        Invoice invoice = invoice(43);
        invoice.setPaymentStatus(PaymentStatus.PAID);
        invoice.setPaidAt(OffsetDateTime.of(2026, 10, 29, 21, 50, 0, 0, ZoneOffset.UTC));
        invoice.setPaymentReference("7033406403");

        String text = text(service.generate(org(), invoice));

        assertThat(text).contains("Estado: Pagada el 29/10/2026");
        assertThat(text).contains("Referencia de pago (Mercado Pago): 7033406403");
    }

    @Test
    void datesAreShownInArgentinaTimeNotUtc() throws Exception {
        Invoice invoice = invoice(44);
        // 01:30 UTC on the 30th is still 22:30 on the 29th in Buenos Aires.
        invoice.setDueAt(OffsetDateTime.of(2026, 10, 30, 1, 30, 0, 0, ZoneOffset.UTC));

        assertThat(text(service.generate(org(), invoice))).contains("Vencimiento: 29/10/2026");
    }
}
