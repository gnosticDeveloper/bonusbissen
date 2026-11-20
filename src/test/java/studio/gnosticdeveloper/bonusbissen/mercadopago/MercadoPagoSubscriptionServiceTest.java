package studio.gnosticdeveloper.bonusbissen.mercadopago;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import studio.gnosticdeveloper.bonusbissen.entity.BillingPlan;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PaymentStatus;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.InvoiceRepository;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationRepository;
import studio.gnosticdeveloper.bonusbissen.repository.SubscriptionOperationLockRepository;

@ExtendWith(MockitoExtension.class)
class MercadoPagoSubscriptionServiceTest {

    private static final String BACK_URL = "https://bonusbissen.store/billing";

    @Mock private MercadoPagoClient client;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private SubscriptionOperationLockRepository operationLockRepository;

    private MercadoPagoSubscriptionService service;
    private Organization organization;
    private BillingPlan plan;

    @BeforeEach
    void setUp() {
        service = new MercadoPagoSubscriptionService(client, organizationRepository, invoiceRepository, operationLockRepository, BACK_URL);
        // By default nobody else holds the lease; the tests about contention override this.
        lenient().when(operationLockRepository.tryAcquire(any(), any(), anyDouble())).thenReturn(1);

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

    /**
     * Shaped like MP's real GET for a pending subscription: payer_email is an empty string unless
     * {@code echoedPayerEmail} is given, and start_date is always present -- the creation time when
     * {@code startDate} is null (i.e. "charge on authorization").
     */
    private Map<String, Object> livePending(Object amount, String echoedPayerEmail, String startDate) {
        Map<String, Object> recurring = new HashMap<>(Map.of(
            "transaction_amount", amount, "currency_id", "ARS",
            "start_date", startDate != null ? startDate : OffsetDateTime.now().minusSeconds(30).toString()));
        return new HashMap<>(Map.of(
            "id", "existing-pending", "status", "pending", "init_point", "https://mp.example/existing",
            "payer_email", echoedPayerEmail == null ? "" : echoedPayerEmail, "auto_recurring", recurring));
    }

    private void givenExistingPending(Map<String, Object> live) {
        organization.setMercadoPagoPreapprovalId("existing-pending");
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("existing-pending")).thenReturn(live);
    }

    @Test
    void aPendingCheckoutThatStillMatchesIsReturnedInsteadOfBeingReplaced() {
        Map<String, Object> live = livePending(5000.0, null, null);
        givenExistingPending(live);

        Map<String, Object> result = service.createCheckout(organization.getId(), null);

        assertThat(result).isSameAs(live);
        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
        verify(client, never()).updatePreapproval(any(), anyMap());
    }

    @Test
    void aMatchingPendingCheckoutIsReusedWhenMpEchoesTheSamePayerEmail() {
        givenExistingPending(livePending(new BigDecimal("5000.00"), "BILLING@example.com", null));

        service.createCheckout(organization.getId(), null);

        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aPendingCheckoutWithTheFirstChargeDateStillMatchingIsReused() {
        OffsetDateTime due = OffsetDateTime.now().plusDays(20).withNano(0);
        organization.setNextInvoiceDueAt(due);
        when(invoiceRepository.existsByOrganizationIdAndPaymentStatus(organization.getId(), PaymentStatus.PENDING)).thenReturn(false);
        givenExistingPending(livePending(5000, null, due.toString()));

        service.createCheckout(organization.getId(), null);

        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aPendingCheckoutMadeForAnotherPriceIsReplaced() {
        givenExistingPending(livePending(9000.0, null, null));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client).updatePreapproval("existing-pending", Map.of("status", "cancelled"));
        verify(client).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aPendingCheckoutWhoseEchoedPayerEmailDiffersIsReplaced() {
        givenExistingPending(livePending(5000.0, "someone-else@example.com", null));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client).updatePreapproval("existing-pending", Map.of("status", "cancelled"));
        verify(client).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aPendingCheckoutWhoseFirstChargeDateNoLongerMatchesIsReplaced() {
        // made while the first invoice was still ahead (start_date set); an invoice is pending now, so it must charge on authorization
        when(invoiceRepository.existsByOrganizationIdAndPaymentStatus(organization.getId(), PaymentStatus.PENDING)).thenReturn(true);
        givenExistingPending(livePending(5000.0, null, OffsetDateTime.now().plusDays(20).toString()));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client).updatePreapproval("existing-pending", Map.of("status", "cancelled"));
        verify(client).createPreapproval(any(), any(), any(), any(), any(), any(), isNull());
    }

    @Test
    void aGivenPayerEmailEqualToTheSavedOneStillReusesThePendingCheckout() {
        organization.setMercadoPagoPayerEmail("billing@example.com");
        givenExistingPending(livePending(5000.0, null, null));

        service.createCheckout(organization.getId(), "Billing@Example.com");

        verify(client, never()).createPreapproval(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aPendingCheckoutMadeToChargeNowIsReplacedOnceTheNextChargeIsScheduledForLater() {
        organization.setNextInvoiceDueAt(OffsetDateTime.now().plusDays(20));
        when(invoiceRepository.existsByOrganizationIdAndPaymentStatus(organization.getId(), PaymentStatus.PENDING)).thenReturn(false);
        givenExistingPending(livePending(5000.0, null, null));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        verify(client).updatePreapproval("existing-pending", Map.of("status", "cancelled"));
    }

    @Test
    void aGivenPayerEmailDifferentFromTheSavedOneReplacesThePendingCheckout() {
        organization.setMercadoPagoPayerEmail("billing@example.com");
        givenExistingPending(livePending(5000.0, null, null));
        when(client.createPreapproval(any(), any(), any(), eq("new@example.com"), any(), any(), any()))
            .thenReturn(Map.of("id", "new-preapproval", "init_point", "https://mp.example/new", "status", "pending"));

        Map<String, Object> result = service.createCheckout(organization.getId(), "new@example.com");

        assertThat(result.get("init_point")).isEqualTo("https://mp.example/new");
        verify(client).updatePreapproval("existing-pending", Map.of("status", "cancelled"));
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
        verify(organizationRepository).endSubscriptionAtPaidThrough(organization.getId());
    }

    @Test
    void cancellingASubscriptionThatWasNeverAuthorizedDoesNotScheduleTheEndOfAccess() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        organization.setMercadoPagoPreapprovalStatus("pending");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("preapproval-id")).thenReturn(Map.of("status", "pending"));

        service.cancelSubscription(organization.getId());

        verify(client).updatePreapproval("preapproval-id", Map.of("status", "cancelled"));
        verify(organizationRepository, never()).endSubscriptionAtPaidThrough(any());
    }

    @Test
    void cancellingAfterMpAlreadyCancelledAnActiveSubscriptionStillSchedulesTheEndWhenTheWebhookWasMissed() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        organization.setMercadoPagoPreapprovalStatus("authorized");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("preapproval-id")).thenReturn(Map.of("status", "cancelled"));

        service.cancelSubscription(organization.getId());

        verify(client, never()).updatePreapproval(any(), anyMap());
        verify(organizationRepository).endSubscriptionAtPaidThrough(organization.getId());
    }

    @Test
    void cancelSubscriptionIsIdempotentForAnAlreadyCancelledSubscription() {
        organization.setMercadoPagoPreapprovalId("preapproval-id");
        when(organizationRepository.findById(organization.getId())).thenReturn(Optional.of(organization));
        when(client.getPreapproval("preapproval-id")).thenReturn(Map.of("status", "cancelled"));

        service.cancelSubscription(organization.getId());

        verify(client, never()).updatePreapproval(any(), anyMap());
        verify(organizationRepository).updateMercadoPagoPreapproval(organization.getId(), "preapproval-id", "cancelled");
        verify(organizationRepository, never()).endSubscriptionAtPaidThrough(any());
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
        // the first caller gets the lease; the checkout and the cancel that follow find it taken
        when(operationLockRepository.tryAcquire(any(), any(), anyDouble())).thenReturn(1, 0, 0);
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
        verify(client, Mockito.times(1)).createPreapproval(any(), any(), any(), any(), any(), any(), any());
        // only the caller that acquired the lease releases it
        verify(operationLockRepository, Mockito.times(1)).release(eq(organization.getId()), any());
    }

    @Test
    void theLeaseIsAcquiredAndReleasedByTheSameHolder() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        stubCreate();

        service.createCheckout(organization.getId(), null);

        ArgumentCaptor<UUID> acquired = ArgumentCaptor.forClass(UUID.class);
        ArgumentCaptor<UUID> released = ArgumentCaptor.forClass(UUID.class);
        verify(operationLockRepository).tryAcquire(eq(organization.getId()), acquired.capture(), anyDouble());
        verify(operationLockRepository).release(eq(organization.getId()), released.capture());
        assertThat(released.getValue()).isEqualTo(acquired.getValue());
    }

    @Test
    void aFailureReleasingTheLeaseDoesNotFailAnOperationThatSucceeded() {
        when(organizationRepository.findByIdWithBillingPlan(organization.getId())).thenReturn(Optional.of(organization));
        stubCreate();
        when(operationLockRepository.release(any(), any())).thenThrow(new IllegalStateException("db down"));

        assertThat(service.createCheckout(organization.getId(), null)).containsEntry("id", "new-preapproval");
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
