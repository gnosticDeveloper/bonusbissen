package studio.gnosticdeveloper.bonusbissen.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.response.PendingExchangeResponse;
import studio.gnosticdeveloper.bonusbissen.security.AuthenticatedPrincipal;
import studio.gnosticdeveloper.bonusbissen.service.PointTransactionService;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit coverage for the hand-written ownership check on GET /exchanges/pending/{id}
 * (the @PreAuthorize-only endpoints on this controller are exercised by
 * AdversarialIntegrationTest instead, since method security isn't active
 * outside a Spring context).
 */
@ExtendWith(MockitoExtension.class)
class PointTransactionControllerTest {

    @Mock
    private PointTransactionService pointTransactionService;

    @InjectMocks
    private PointTransactionController controller;

    @Test
    void userRequestingTheirOwnPendingExchangesSucceeds() {
        UUID userId = UUID.randomUUID();
        AuthenticatedPrincipal principal = new AuthenticatedPrincipal(userId, "Someone", "USER", UUID.randomUUID());
        List<PendingExchangeResponse> expected = List.of();
        when(pointTransactionService.getAllPendingExchangesById(userId)).thenReturn(expected);

        List<PendingExchangeResponse> result = controller.getAllPendingExchangesByUserId(userId, principal);

        assertThat(result).isSameAs(expected);
    }

    @Test
    void userRequestingAnotherUsersPendingExchangesIsRejected() {
        UUID ownId = UUID.randomUUID();
        UUID victimId = UUID.randomUUID();
        AuthenticatedPrincipal principal = new AuthenticatedPrincipal(ownId, "Attacker", "USER", UUID.randomUUID());

        assertThatThrownBy(() -> controller.getAllPendingExchangesByUserId(victimId, principal))
            .isInstanceOf(AccessDeniedException.class);

        verify(pointTransactionService, never()).getAllPendingExchangesById(any());
    }

    @Test
    void cashierRequestingAnyUsersPendingExchangesSucceeds() {
        UUID cashierId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AuthenticatedPrincipal principal = new AuthenticatedPrincipal(cashierId, "Cashier", "CASHIER", UUID.randomUUID());
        List<PendingExchangeResponse> expected = List.of();
        when(pointTransactionService.getAllPendingExchangesById(userId)).thenReturn(expected);

        List<PendingExchangeResponse> result = controller.getAllPendingExchangesByUserId(userId, principal);

        assertThat(result).isSameAs(expected);
    }

    @Test
    void adminRequestingAnyUsersPendingExchangesSucceeds() {
        UUID adminId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AuthenticatedPrincipal principal = new AuthenticatedPrincipal(adminId, "Admin", "ADMIN", UUID.randomUUID());
        List<PendingExchangeResponse> expected = List.of();
        when(pointTransactionService.getAllPendingExchangesById(userId)).thenReturn(expected);

        List<PendingExchangeResponse> result = controller.getAllPendingExchangesByUserId(userId, principal);

        assertThat(result).isSameAs(expected);
    }
}
