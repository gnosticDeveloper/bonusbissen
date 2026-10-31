package studio.gnosticdeveloper.bonusbissen.mercadopago;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;

@ExtendWith(MockitoExtension.class)
class MercadoPagoSubscriptionServiceTest {

    private static final String BACK_URL = "https://bonusbissen.store/billing";

    @Mock private MercadoPagoClient client;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private InvoiceRepository invoiceRepository;

    private MercadoPagoSubscriptionService service;
    private Organization organization;
    private BillingPlan plan;

    @BeforeEach
    void setUp() {
        service = new MercadoPagoSubscriptionService(client, organizationRepository, invoiceRepository, BACK_URL);

        plan = new BillingPlan();
        plan.setId(UUID.randomUUID());
        plan.setName("Plan Mensual");
        plan.setPrice(new BigDecimal("5000.00"));
        plan.setCurrency("ARS");

        organization = new Organization();
        organization.setId(UUID.randomUUID());
        organization.setBillingPlan(plan);
        organization.setBillingEmail("billing@example.com");
    }

    private void stubCreate() {
        when(client.createPreapproval(any(), eq(plan.getPrice()), eq(plan.getCurrency()), eq(organization.getBillingEmail()), eq(organization.getId().toString()), eq(BACK_URL), any()))
            .thenReturn(Map.of("id", "new-preapproval", "init_point", "https://mp.example/checkout", "status", "pending"));
    }

    @Test
    void rejectsCheckoutWhenOrganizationHasNoPlanSelected() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        organization.setBillingPlan(null);

        assertThatThrownBy(() -> service.createCheckout(organization.getId(), null))
            .isInstanceOf(BadRequestException.class);

        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejectsCheckoutWhenThereIsNoPayerEmailAtAll() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        organization.setBillingEmail(null);

        assertThatThrownBy(() -> service.createCheckout(organization.getId(), null))
            .isInstanceOf(BadRequestException.class);

        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void unknownOrganizationIsNotFound() {
        UUID unknownId = UUID.randomUUID();
        when(organizationRepository.findByIdWithBillingPlan(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createCheckout(unknownId, null)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void checkoutCreatesAPreapprovalFromThePlanAndPersistsItsIdAndStatus() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        stubCreate();

        Map<String, Object> result = service.createCheckout(organization.getId(), null);

        assertThat(result.get("init_point")).isEqualTo("https://mp.example/checkout");
        verify(organizationRepository).updateMercadoPagoPreapproval(organization.getId(), "new-preapproval", "pending");
    }

    @Test
    void firstChargeIsScheduledForTheNextInvoiceDueDateWhenNothingIsOwedYet() {
        OffsetDateTime due = OffsetDateTime.now().plusDays(20);
        organization.setNextInvoiceDueAt(due);
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(invoiceRepository.existsByOrganizationIdAndPaymentStatus(organization.getId(), PaymentStatus.PENDING)).thenReturn(false);
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client).createPreapproval(any(), any(), any(), any(), any(), any(), eq(due));
    }

    @Test
    void firstChargeIsImmediateWhenAnInvoiceIsAlreadyPending() {
        organization.setNextInvoiceDueAt(OffsetDateTime.now().plusDays(20));
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(invoiceRepository.existsByOrganizationIdAndPaymentStatus(organization.getId(), PaymentStatus.PENDING)).thenReturn(true);
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client).createPreapproval(any(), any(), any(), any(), any(), any(), isNull());
    }

    @Test
    void checkoutIsAConflictWhenTheExistingPreapprovalIsAlreadyAuthorized() {
        organization.setMercadoPagoPreapprovalId("old-preapproval");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("old-preapproval")).thenReturn(Map.of("status", "authorized"));

        assertThatThrownBy(() -> service.createCheckout(organization.getId(), null)).isInstanceOf(ConflictException.class);

        verify(client, never()).updatePreapproval(any(), anyMap());
        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aStillPendingPreapprovalIsCancelledBeforeItsReplacementIsCreated() {
        organization.setMercadoPagoPreapprovalId("old-preapproval");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("old-preapproval")).thenReturn(Map.of("status", "pending"));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        InOrder order = inOrder(client);
        order.verify(client).updatePreapproval("old-preapproval", Map.of("status", "cancelled"));
        order.verify(client).createPreapproval(any(), any(), any(), any(), any(), any(), any());
        verify(organizationRepository).updateMercadoPagoPreapproval(organization.getId(), "new-preapproval", "pending");
    }

    @Test
    void anAlreadyCancelledPreapprovalIsReplacedWithoutCancellingAgain() {
        organization.setMercadoPagoPreapprovalId("old-preapproval");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("old-preapproval")).thenReturn(Map.of("status", "cancelled"));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client, never()).updatePreapproval(any(), anyMap());
    }

    @Test
    void planChangePushesTheNewPriceOntoALivePreapproval() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        organization.setMercadoPagoPreapprovalStatus("authorized");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));

        service.syncPlanAmount(organization.getId());

        verify(client).updatePreapproval("preapproval-id", Map.of(
            "auto_recurring", Map.of("transaction_amount", plan.getPrice(), "currency_id", plan.getCurrency())
        ));
    }

    @Test
    void planChangeSkipsSyncWithNoLivePreapproval() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        organization.setMercadoPagoPreapprovalStatus("cancelled");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));

        service.syncPlanAmount(organization.getId());

        verify(client, never()).updatePreapproval(any(), anyMap());
    }

    @Test
    void planChangeSyncFailureIsSwallowed() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        organization.setMercadoPagoPreapprovalStatus("authorized");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        doThrow(new MercadoPagoApiException("down")).when(client).updatePreapproval(eq("preapproval-id"), anyMap());

        service.syncPlanAmount(organization.getId());
    }

    @Test
    void aGivenPayerEmailIsUsedInsteadOfTheBillingEmailAndSaved() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.createPreapproval(any(), any(), any(), eq("payer@example.com"), any(), any(), any()))
            .thenReturn(Map.of("id", "new-preapproval", "init_point", "https://mp.example/checkout", "status", "pending"));

        service.createCheckout(organization.getId(), " payer@example.com ");

        verify(organizationRepository).updateMercadoPagoPayerEmail(organization.getId(), "payer@example.com");
    }

    @Test
    void theSavedPayerEmailIsReusedWhenNoneIsGiven() {
        organization.setMercadoPagoPayerEmail("saved@example.com");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.createPreapproval(any(), any(), any(), eq("saved@example.com"), any(), any(), any()))
            .thenReturn(Map.of("id", "new-preapproval", "init_point", "https://mp.example/checkout", "status", "pending"));

        service.createCheckout(organization.getId(), null);

        verify(organizationRepository, never()).updateMercadoPagoPayerEmail(any(), any());
    }

    @Test
    void billingEmailIsOnlyTheLastResortPayerEmail() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        stubCreate();

        service.createCheckout(organization.getId(), "  ");

        verify(client).createPreapproval(any(), any(), any(), eq("billing@example.com"), any(), any(), any());
        verify(organizationRepository, never()).updateMercadoPagoPayerEmail(any(), any());
    }

    @Test
    void cancelSubscriptionCancelsALiveSubscriptionAtMercadoPagoAndStoresIt() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("preapproval-id")).thenReturn(Map.of("status", "authorized"));

        service.cancelSubscription(organization.getId());

        verify(client).updatePreapproval("preapproval-id", Map.of("status", "cancelled"));
        verify(organizationRepository).updateMercadoPagoPreapproval(organization.getId(), "preapproval-id", "cancelled");
    }

    @Test
    void cancelSubscriptionIsIdempotentForAnAlreadyCancelledSubscription() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("preapproval-id")).thenReturn(Map.of("status", "cancelled"));

        service.cancelSubscription(organization.getId());

        verify(client, never()).updatePreapproval(any(), anyMap());
        verify(organizationRepository).updateMercadoPagoPreapproval(organization.getId(), "preapproval-id", "cancelled");
    }

    @Test
    void cancelSubscriptionWithNoSubscriptionIsNotFound() {
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));

        assertThatThrownBy(() -> service.cancelSubscription(organization.getId())).isInstanceOf(NotFoundException.class);

        verify(client, never()).updatePreapproval(any(), anyMap());
    }

    @Test
    void aSecondCheckoutForTheSameOrgWhileOneIsInFlightIsAConflictAndCreatesNothing() throws Exception {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        CountDownLatch firstIsCallingMp = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        when(client.createPreapproval(any(), any(), any(), any(), any(), any(), any())).thenAnswer(invocation -> {
            firstIsCallingMp.countDown();
            releaseFirst.await(5, TimeUnit.SECONDS);
            return Map.of("id", "new-preapproval", "init_point", "https://mp.example/checkout", "status", "pending");
        });

        CompletableFuture<Map<String, Object>> first = CompletableFuture.supplyAsync(() -> service.createCheckout(organization.getId(), null));
        assertThat(firstIsCallingMp.await(5, TimeUnit.SECONDS)).isTrue();

        assertThatThrownBy(() -> service.createCheckout(organization.getId(), null)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.cancelSubscription(organization.getId())).isInstanceOf(ConflictException.class);

        releaseFirst.countDown();
        assertThat(first.get(5, TimeUnit.SECONDS)).containsEntry("id", "new-preapproval");
        verify(client, org.mockito.Mockito.times(1)).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void theGuardIsReleasedAfterAFailedCheckoutSoTheNextOneCanRun() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.createPreapproval(any(), any(), any(), any(), any(), any(), any()))
            .thenThrow(new MercadoPagoApiException("boom", 500))
            .thenReturn(Map.of("id", "new-preapproval", "init_point", "https://mp.example/checkout", "status", "pending"));

        assertThatThrownBy(() -> service.createCheckout(organization.getId(), null)).isInstanceOf(MercadoPagoApiException.class);

        assertThat(service.createCheckout(organization.getId(), null)).containsEntry("id", "new-preapproval");
    }

    @Test
    void cancellingAPreapprovalMpAlreadyCancelledIsTreatedAsSuccess() {
        organization.setMercadoPagoPreapprovalId("pre-1");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("pre-1")).thenReturn(Map.of("status", "authorized")).thenReturn(Map.of("status", "cancelled"));
        doThrow(new MercadoPagoApiException("You can not modify a cancelled preapproval", 400))
            .when(client).updatePreapproval(eq("pre-1"), anyMap());

        service.cancelSubscription(organization.getId());

        verify(organizationRepository).updateMercadoPagoPreapproval(organization.getId(), "pre-1", "cancelled");
    }

    @Test
    void aFailedCancelWhereMpIsNotCancelledIsStillAnError() {
        organization.setMercadoPagoPreapprovalId("pre-1");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("pre-1")).thenReturn(Map.of("status", "authorized"));
        doThrow(new MercadoPagoApiException("something else is wrong", 400))
            .when(client).updatePreapproval(eq("pre-1"), anyMap());

        assertThatThrownBy(() -> service.cancelSubscription(organization.getId())).isInstanceOf(MercadoPagoApiException.class);

        verify(organizationRepository, never()).updateMercadoPagoPreapproval(any(), any(), any());
    }
}
