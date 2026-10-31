package studio.gnosticdeveloper.bonusbissen.mercadopago;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.entity.Invoice;
import studio.gnosticdeveloper.bonusbissen.entity.MercadoPagoPayment;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.MercadoPagoPaymentRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.service.InvoiceService;

@ExtendWith(MockitoExtension.class)
class MercadoPagoWebhookServiceTest {

    @Mock private MercadoPagoClient client;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private MercadoPagoPaymentRepository paymentRepository;
    @Mock private InvoiceService invoiceService;

    private MercadoPagoWebhookService service;
    private Organization organization;

    @BeforeEach
    void setUp() {
        service = new MercadoPagoWebhookService(client, organizationRepository, invoiceRepository, paymentRepository, invoiceService);

        organization = new Organization();
        organization.setId(UUID.randomUUID());
        organization.setMercadoPagoPreapprovalId("preapproval-id");
    }

    private static Map<String, Object> authorizedPayment(String paymentStatus, String preapprovalId) {
        return Map.of(
            "status", "processed",
            "preapproval_id", preapprovalId,
            "transaction_amount", 5000.00,
            "currency_id", "ARS",
            "payment", Map.of("id", 123L, "status", paymentStatus)
        );
    }

    @Test
    void unknownNotificationTypeIsIgnored() {
        service.handle("payment", "some-id");

        verify(client, never()).getPreapproval(any());
        verify(client, never()).getAuthorizedPayment(any());
    }

    @Test
    void notificationWithNoTypeIsIgnored() {
        service.handle(null, "some-id");

        verify(client, never()).getPreapproval(any());
        verify(client, never()).getAuthorizedPayment(any());
    }

    @Test
    void preapprovalUpdateSyncsStatusOntoTheMatchingOrganization() {
        when(client.getPreapproval("preapproval-id")).thenReturn(Map.of("status", "authorized"));
        when(organizationRepository.findByMercadoPagoPreapprovalId("preapproval-id")).thenReturn(Optional.of(organization));

        service.handle("subscription_preapproval", "preapproval-id");

        assertThat(organization.getMercadoPagoPreapprovalStatus()).isEqualTo("authorized");
        verify(organizationRepository).save(organization);
    }

    @Test
    void preapprovalUpdateForAnUnknownPreapprovalIsIgnoredWithoutError() {
        when(client.getPreapproval("unknown-id")).thenReturn(Map.of("status", "authorized"));
        when(organizationRepository.findByMercadoPagoPreapprovalId("unknown-id")).thenReturn(Optional.empty());

        service.handle("subscription_preapproval", "unknown-id");

        verify(organizationRepository, never()).save(any());
    }

    @Test
    void anAlreadyRecordedPaymentIsNotProcessedAgain() {
        when(paymentRepository.existsById("payment-id")).thenReturn(true);

        service.handle("subscription_authorized_payment", "payment-id");

        verify(client, never()).getAuthorizedPayment(any());
        verify(paymentRepository, never()).save(any());
        verify(invoiceService, never()).applyPayment(any(), any());
    }

    @Test
    void paymentWhoseNestedPaymentIsNotApprovedIsNotRecorded() {
        when(client.getAuthorizedPayment("payment-id")).thenReturn(authorizedPayment("rejected", "preapproval-id"));

        service.handle("subscription_authorized_payment", "payment-id");

        verify(organizationRepository, never()).findForUpdateByMercadoPagoPreapprovalId(any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void topLevelStatusAloneIsNotTreatedAsApproval() {
        when(client.getAuthorizedPayment("payment-id")).thenReturn(Map.of("status", "approved", "preapproval_id", "preapproval-id"));

        service.handle("subscription_authorized_payment", "payment-id");

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void approvedPaymentForAnUnknownPreapprovalIsIgnoredWithoutError() {
        when(client.getAuthorizedPayment("payment-id")).thenReturn(authorizedPayment("approved", "unknown-preapproval"));
        when(organizationRepository.findForUpdateByMercadoPagoPreapprovalId("unknown-preapproval")).thenReturn(Optional.empty());

        service.handle("subscription_authorized_payment", "payment-id");

        verify(paymentRepository, never()).save(any());
    }

    @Test
    void approvedPaymentFallsBackToExternalReferenceForAReplacedPreapproval() {
        Map<String, Object> payment = new java.util.HashMap<>(authorizedPayment("approved", "old-preapproval"));
        payment.put("external_reference", organization.getId().toString());
        when(client.getAuthorizedPayment("payment-id")).thenReturn(payment);
        when(organizationRepository.findForUpdateByMercadoPagoPreapprovalId("old-preapproval")).thenReturn(Optional.empty());
        when(organizationRepository.findByIdForUpdate(organization.getId())).thenReturn(Optional.of(organization));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.handle("subscription_authorized_payment", "payment-id");

        verify(paymentRepository).save(any());
    }

    @Test
    void approvedPaymentWithNoPendingInvoiceIsHeldUnapplied() {
        when(client.getAuthorizedPayment("payment-id")).thenReturn(authorizedPayment("approved", "preapproval-id"));
        when(organizationRepository.findForUpdateByMercadoPagoPreapprovalId("preapproval-id")).thenReturn(Optional.of(organization));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.findFirstByOrganizationIdAndPaymentStatusOrderByCreatedAtAsc(organization.getId(), PaymentStatus.PENDING))
            .thenReturn(Optional.empty());

        service.handle("subscription_authorized_payment", "payment-id");

        ArgumentCaptor<MercadoPagoPayment> captor = ArgumentCaptor.forClass(MercadoPagoPayment.class);
        verify(paymentRepository).save(captor.capture());
        MercadoPagoPayment recorded = captor.getValue();
        assertThat(recorded.getAuthorizedPaymentId()).isEqualTo("payment-id");
        assertThat(recorded.getOrganization()).isSameAs(organization);
        assertThat(recorded.getAmount()).isEqualByComparingTo("5000.00");
        assertThat(recorded.getCurrency()).isEqualTo("ARS");
        assertThat(recorded.getInvoice()).isNull();
        verify(invoiceService, never()).applyPayment(any(), any());
    }

    @Test
    void approvedPaymentIsRecordedAndAppliedToTheOldestPendingInvoice() {
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setAmount(new BigDecimal("5000.00"));

        when(client.getAuthorizedPayment("payment-id")).thenReturn(authorizedPayment("approved", "preapproval-id"));
        when(organizationRepository.findForUpdateByMercadoPagoPreapprovalId("preapproval-id")).thenReturn(Optional.of(organization));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceRepository.findFirstByOrganizationIdAndPaymentStatusOrderByCreatedAtAsc(organization.getId(), PaymentStatus.PENDING))
            .thenReturn(Optional.of(invoice));

        service.handle("subscription_authorized_payment", "payment-id");

        ArgumentCaptor<MercadoPagoPayment> captor = ArgumentCaptor.forClass(MercadoPagoPayment.class);
        verify(invoiceService).applyPayment(org.mockito.ArgumentMatchers.eq(invoice), captor.capture());
        assertThat(captor.getValue().getAuthorizedPaymentId()).isEqualTo("payment-id");
    }
}
