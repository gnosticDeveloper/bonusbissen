package studio.gnosticdeveloper.bonusbissen.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoApiException;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoSignatureVerifier;
import studio.gnosticdeveloper.bonusbissen.mercadopago.MercadoPagoWebhookService;

/**
 * Unit coverage for request parsing + the fail-closed behavior of this
 * controller -- signature verification itself is covered by
 * MercadoPagoSignatureVerifierTest, and that /webhooks/** is actually
 * reachable without auth is SecurityConfig's job, not this class's.
 */
@ExtendWith(MockitoExtension.class)
class MercadoPagoWebhookControllerTest {

    @Mock private MercadoPagoSignatureVerifier signatureVerifier;
    @Mock private MercadoPagoWebhookService webhookService;

    @InjectMocks
    private MercadoPagoWebhookController controller;

    @Test
    void validSignatureDispatchesUsingTypeAndDataIdFromTheJsonBody() {
        Map<String, Object> body = Map.of("type", "subscription_preapproval", "data", Map.of("id", "abc123"));
        when(signatureVerifier.verify("abc123", "req-1", "ts=1,v1=sig")).thenReturn(true);

        ResponseEntity<Void> response = controller.receive(body, null, null, "ts=1,v1=sig", "req-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(webhookService).handle("subscription_preapproval", "abc123");
    }

    @Test
    void fallsBackToQueryParamsWhenNoBodyIsPresent() {
        when(signatureVerifier.verify("abc123", "req-1", "ts=1,v1=sig")).thenReturn(true);

        ResponseEntity<Void> response = controller.receive(null, "abc123", "subscription_authorized_payment", "ts=1,v1=sig", "req-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(webhookService).handle("subscription_authorized_payment", "abc123");
    }

    @Test
    void invalidSignatureIsRejectedWithoutInvokingTheService() {
        Map<String, Object> body = Map.of("type", "subscription_preapproval", "data", Map.of("id", "abc123"));
        when(signatureVerifier.verify("abc123", "req-1", "bad-signature")).thenReturn(false);

        ResponseEntity<Void> response = controller.receive(body, null, null, "bad-signature", "req-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(webhookService, never()).handle(any(), any());
    }

    @Test
    void aBodyWithNoTypePassesNullRatherThanTheStringNull() {
        Map<String, Object> body = Map.of("data", Map.of("id", "abc123"));
        when(signatureVerifier.verify("abc123", "req-1", "ts=1,v1=sig")).thenReturn(true);

        controller.receive(body, null, null, "ts=1,v1=sig", "req-1");

        verify(webhookService).handle(null, "abc123");
    }

    @Test
    void aResourceMercadoPagoDoesNotKnowIsAcknowledgedNotRetried() {
        Map<String, Object> body = Map.of("type", "subscription_preapproval", "data", Map.of("id", "123456"));
        when(signatureVerifier.verify("123456", "req-1", "ts=1,v1=sig")).thenReturn(true);
        doThrow(new MercadoPagoApiException("not found", 404)).when(webhookService).handle("subscription_preapproval", "123456");

        ResponseEntity<Void> response = controller.receive(body, null, null, "ts=1,v1=sig", "req-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void anMpServerErrorIsStillA500SoMercadoPagoRetries() {
        Map<String, Object> body = Map.of("type", "subscription_preapproval", "data", Map.of("id", "abc123"));
        when(signatureVerifier.verify("abc123", "req-1", "ts=1,v1=sig")).thenReturn(true);
        doThrow(new MercadoPagoApiException("bad gateway", 502)).when(webhookService).handle("subscription_preapproval", "abc123");

        ResponseEntity<Void> response = controller.receive(body, null, null, "ts=1,v1=sig", "req-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Test
    void aFailureInsideTheServiceIsA500SoMercadoPagoRetries() {
        Map<String, Object> body = Map.of("type", "subscription_preapproval", "data", Map.of("id", "abc123"));
        when(signatureVerifier.verify("abc123", "req-1", "ts=1,v1=sig")).thenReturn(true);
        doThrow(new RuntimeException("Mercado Pago is down")).when(webhookService).handle("subscription_preapproval", "abc123");

        ResponseEntity<Void> response = controller.receive(body, null, null, "ts=1,v1=sig", "req-1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
