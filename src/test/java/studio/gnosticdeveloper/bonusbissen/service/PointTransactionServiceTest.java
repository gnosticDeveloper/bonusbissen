package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.request.ApproveExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.CancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserCancelExchangeRequest;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.OrganizationStaffRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PointTransactionServiceTest {

    @Mock
    private PointTransactionRepository pointTransactionRepository;
    @Mock
    private ExchangeCodeRepository exchangeCodeRepository;
    @Mock
    private OrganizationStaffRepository organizationStaffRepository;
    @Mock
    private PointProgramRepository pointProgramRepository;
    @Mock
    private StorefrontRepository storefrontRepository;
    @Mock
    private TraceabilityService traceabilityService;

    @Mock
    private PointLedgerService pointLedgerService;

    @InjectMocks
    private PointTransactionService pointTransactionService;

    private static Organization organization() {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());
        return organization;
    }

    private static PointProgram programFor(Organization organization) {
        PointProgram program = new PointProgram();
        program.setId(UUID.randomUUID());
        program.setOrganization(organization);
        return program;
    }

    private static Reward rewardFor(PointProgram program) {
        Reward reward = new Reward();
        reward.setId(UUID.randomUUID());
        reward.setPointProgram(program);
        return reward;
    }

    /**
     * A pending REDEEM whose organization resolves (via point_program) to the
     * given org.
     */
    private static PointTransaction pendingRedeem(Organization organization) {
        PointProgram program = programFor(organization);
        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPointProgram(program);
        tx.setReward(rewardFor(program));
        return tx;
    }

    @Test
    void approveExchangeMarksTransactionAsDeliveredAndAssignsEmployee() {
        Organization organization = organization();

        PointTransaction tx = pendingRedeem(organization);
        User user = new User();
        user.setId(UUID.randomUUID());
        tx.setUser(user);
        ExchangeCode code = new ExchangeCode();
        code.setActive(true);
        tx.setExchangeCode(code);

        OrganizationStaff employee = new OrganizationStaff();
        employee.setId(UUID.randomUUID());

        Storefront storefront = new Storefront();
        storefront.setId(UUID.randomUUID());

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));
        when(organizationStaffRepository.findByUserIdAndActiveTrue(employee.getId())).thenReturn(Optional.of(employee));
        when(storefrontRepository.findByIdAndOrganizationId(storefront.getId(), organization.getId())).thenReturn(Optional.of(storefront));

        pointTransactionService.approveExchange(new ApproveExchangeRequest(tx.getId()), organization.getId(), employee.getId(), storefront.getId());

        assertThat(tx.getState()).isEqualTo(TransactionState.DELIVERED);
        assertThat(tx.getEmployee()).isEqualTo(employee);
        assertThat(tx.getStorefront()).isEqualTo(storefront);
        assertThat(code.isActive()).isFalse();
        verify(pointTransactionRepository).save(tx);
    }

    @Test
    void approveExchangeWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(pointTransactionRepository.findByIdForUpdate(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pointTransactionService.approveExchange(new ApproveExchangeRequest(id), UUID.randomUUID(), UUID.randomUUID(), null))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void approveExchangeThatIsNotPendingThrowsConflict() {
        Organization organization = organization();

        PointTransaction tx = pendingRedeem(organization);
        tx.setState(TransactionState.DELIVERED);

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.approveExchange(new ApproveExchangeRequest(tx.getId()), organization.getId(), UUID.randomUUID(), null))
            .isInstanceOf(ConflictException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void cancelExchangeWithoutRefundOnlySavesTheOriginalTransaction() {
        Organization organization = organization();

        PointTransaction tx = pendingRedeem(organization);
        tx.setPoints(-20);
        User user = new User();
        user.setId(UUID.randomUUID());
        tx.setUser(user);

        OrganizationStaff employee = new OrganizationStaff();
        employee.setId(UUID.randomUUID());

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));
        when(organizationStaffRepository.findByUserIdAndActiveTrue(employee.getId())).thenReturn(Optional.of(employee));

        pointTransactionService.cancelExchange(new CancelExchangeRequest(tx.getId(), false), organization.getId(), employee.getId());

        assertThat(tx.getState()).isEqualTo(TransactionState.CANCELLED);
        verify(pointTransactionRepository, times(1)).save(any());
    }

    @Test
    void cancelExchangeThatIsNotPendingThrowsConflict() {
        Organization organization = organization();

        PointTransaction tx = pendingRedeem(organization);
        tx.setState(TransactionState.CANCELLED);

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.cancelExchange(new CancelExchangeRequest(tx.getId(), true), organization.getId(), UUID.randomUUID()))
            .isInstanceOf(ConflictException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void cancelExchangeWithRefundCreatesAnEarnTransactionForTheAbsoluteAmount() {
        Organization organization = organization();

        User user = new User();
        user.setId(UUID.randomUUID());

        PointTransaction tx = pendingRedeem(organization);
        tx.setPoints(-20);
        tx.setUser(user);

        OrganizationStaff employee = new OrganizationStaff();
        employee.setId(UUID.randomUUID());

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));
        when(organizationStaffRepository.findByUserIdAndActiveTrue(employee.getId())).thenReturn(Optional.of(employee));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        pointTransactionService.cancelExchange(new CancelExchangeRequest(tx.getId(), true), organization.getId(), employee.getId());

        assertThat(tx.getState()).isEqualTo(TransactionState.CANCELLED);
        verify(pointTransactionRepository).save(tx);
        // What the refund looks like (one lot per spent lot, original expiry dates) is
        // PointLedgerService's job -- covered end to end in PointTransactionIntegrationTest.
        verify(pointLedgerService).refundRedemption(tx);
    }

    @Test
    void userCancelExchangeAlwaysRefundsPoints() {
        User user = new User();
        user.setId(UUID.randomUUID());

        PointProgram program = new PointProgram();
        program.setId(UUID.randomUUID());

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPoints(-15);
        tx.setUser(user);
        tx.setPointProgram(program);

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        pointTransactionService.userCancelExchange(new UserCancelExchangeRequest(tx.getId()), user.getId());

        assertThat(tx.getState()).isEqualTo(TransactionState.CANCELLED);
        verify(pointTransactionRepository).save(tx);
        verify(pointLedgerService).refundRedemption(tx);
    }

    @Test
    void userCancelExchangeForAnotherUserThrowsAccessDenied() {
        User owner = new User();
        owner.setId(UUID.randomUUID());
        UUID caller = UUID.randomUUID();

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.PENDING);
        tx.setPoints(-15);
        tx.setUser(owner);

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.userCancelExchange(new UserCancelExchangeRequest(tx.getId()), caller))
            .isInstanceOf(AccessDeniedException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void userCancelExchangeThatIsNotPendingThrowsConflict() {
        User user = new User();
        user.setId(UUID.randomUUID());

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setState(TransactionState.DELIVERED);
        tx.setUser(user);

        when(pointTransactionRepository.findByIdForUpdate(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> pointTransactionService.userCancelExchange(new UserCancelExchangeRequest(tx.getId()), user.getId()))
            .isInstanceOf(ConflictException.class);

        verify(pointTransactionRepository, times(0)).save(any());
    }

    @Test
    void verifyExchangeWithUnknownCodeThrowsNotFound() {
        UUID organizationId = UUID.randomUUID();
        when(exchangeCodeRepository.findLatestByCodeAndOrganizationId("000000", organizationId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pointTransactionService.verifyExchange("000000", organizationId, UUID.randomUUID(), UUID.randomUUID()))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void verifyExchangeAtAStorefrontThatDoesNotHonourTheProgramThrowsConflict() {
        Organization organization = organization();
        UUID organizationId = organization.getId();
        UUID storefrontId = UUID.randomUUID();

        PointTransaction tx = pendingRedeem(organization);
        ExchangeCode code = new ExchangeCode();
        code.setPointTransaction(tx);

        when(exchangeCodeRepository.findLatestByCodeAndOrganizationId("1234a5", organizationId)).thenReturn(Optional.of(code));
        when(pointProgramRepository.existsByIdAndStorefronts_Id(tx.getPointProgram().getId(), storefrontId)).thenReturn(false);

        assertThatThrownBy(() -> pointTransactionService.verifyExchange("1234a5", organizationId, storefrontId, UUID.randomUUID()))
            .isInstanceOf(ConflictException.class);
    }

    @Test
    void verifyExchangeAtAParticipatingStorefrontReturnsTheExchange() {
        Organization organization = organization();
        UUID organizationId = organization.getId();
        UUID storefrontId = UUID.randomUUID();

        PointTransaction tx = pendingRedeem(organization);
        tx.setPoints(-10);
        tx.setCreatedAt(OffsetDateTime.now());
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Someone");
        tx.setUser(user);
        ExchangeCode code = new ExchangeCode();
        code.setPointTransaction(tx);

        when(exchangeCodeRepository.findLatestByCodeAndOrganizationId("1234a5", organizationId)).thenReturn(Optional.of(code));
        when(pointProgramRepository.existsByIdAndStorefronts_Id(tx.getPointProgram().getId(), storefrontId)).thenReturn(true);

        assertThat(pointTransactionService.verifyExchange("1234a5", organizationId, storefrontId, UUID.randomUUID())).isNotNull();
    }

    @Test
    void verifyExchangeOfADeliveredCodeReturnsTheExchangeWithItsState() {
        Organization organization = organization();
        UUID organizationId = organization.getId();
        UUID storefrontId = UUID.randomUUID();

        PointTransaction tx = pendingRedeem(organization);
        tx.setState(TransactionState.DELIVERED);
        tx.setPoints(-10);
        tx.setCreatedAt(OffsetDateTime.now());
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Someone");
        tx.setUser(user);
        ExchangeCode code = new ExchangeCode();
        code.setActive(false);
        code.setPointTransaction(tx);

        when(exchangeCodeRepository.findLatestByCodeAndOrganizationId("1234a5", organizationId)).thenReturn(Optional.of(code));
        when(pointProgramRepository.existsByIdAndStorefronts_Id(tx.getPointProgram().getId(), storefrontId)).thenReturn(true);

        assertThat(pointTransactionService.verifyExchange("1234a5", organizationId, storefrontId, UUID.randomUUID()).state()).isEqualTo("delivered");
    }
}
