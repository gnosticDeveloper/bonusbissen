package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import studio.gnosticdeveloper.bonusbissen.dto.request.ClaimRewardRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.UserUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.GrantPointsUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsAwardResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.UserPointsResponse;
import studio.gnosticdeveloper.bonusbissen.dto.response.PointActionResponse;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.entity.Employee;
import studio.gnosticdeveloper.bonusbissen.entity.ExchangeCode;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.exception.ConflictException;
import studio.gnosticdeveloper.bonusbissen.exception.InsufficientPointsException;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.UserRepository;
import studio.gnosticdeveloper.bonusbissen.repository.EmployeeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.ExchangeCodeRepository;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PointTransactionRepository pointTransactionRepository;
    @Mock
    private RewardRepository rewardRepository;
    @Mock
    private ExchangeCodeRepository exchangeCodeRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private EmailVerificationService emailVerificationService;

    @InjectMocks
    private UserService userService;

    private static final UUID EMPLOYEE_ID = UUID.randomUUID();

    private Employee employeeWithOrganization() {
        Organization organization = new Organization();
        organization.setId(UUID.randomUUID());

        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);
        employee.setOrganization(organization);
        return employee;
    }

    @Test
    void deleteByIdMarksUserInactiveInsteadOfRemovingIt() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setActive(true);

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        userService.deleteById(id);

        assertThat(user.isActive()).isFalse();
    }

    @Test
    void searchBlankTermIsTreatedAsNoFilter() {
        Pageable pageable = PageRequest.of(0, 10);
        when(userRepository.search(isNull(), eq(pageable))).thenReturn(Page.empty());

        userService.search("   ", pageable);

        verify(userRepository).search(isNull(), eq(pageable));
    }

    @Test
    void searchTrimsTermAndMapsResultsToResponses() {
        Pageable pageable = PageRequest.of(0, 10);
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Someone");
        user.setUsername("someone");
        user.setCreatedAt(java.time.OffsetDateTime.now());

        when(userRepository.search(eq("abc"), eq(pageable))).thenReturn(new PageImpl<>(List.of(user)));
        when(pointTransactionRepository.calculatePointsByUserId(user.getId())).thenReturn(50);

        Page<UserPointsResponse> result = userService.search("  abc  ", pageable);

        assertThat(result.getContent()).containsExactly(UserPointsResponse.from(user, 50));
    }

    @Test
    void deleteByIdWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.deleteById(id)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void grantPointsWithInactiveUserThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setActive(false);

        when(employeeRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employeeWithOrganization()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.grantPoints(new GrantPointsRequest(userId, 50, null), EMPLOYEE_ID))
            .isInstanceOf(NotFoundException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void claimRewardWithInactiveUserThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setActive(false);

        UUID rewardId = UUID.randomUUID();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.claimReward(new ClaimRewardRequest(userId, rewardId)))
            .isInstanceOf(NotFoundException.class);

        verify(rewardRepository, never()).findById(any());
        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void grantPointsCreatesDeliveredEarnTransaction() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setName("Someone");

        when(employeeRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employeeWithOrganization()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UserPointsAwardResponse response = userService.grantPoints(new GrantPointsRequest(userId, 50, null), EMPLOYEE_ID);

        assertThat(response.pointsGranted()).isEqualTo(50);
        assertThat(response.userName()).isEqualTo("Someone");

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getTransactionType()).isEqualTo(TransactionType.EARN);
        assertThat(captor.getValue().getState()).isEqualTo(TransactionState.DELIVERED);
        assertThat(captor.getValue().getPoints()).isEqualTo(50);
    }

    @Test
    void grantPointsWithUnknownUserThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        when(employeeRepository.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employeeWithOrganization()));
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.grantPoints(new GrantPointsRequest(userId, 50, null), EMPLOYEE_ID))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void claimRewardCreatesPendingRedeemTransactionWithNegativePoints() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);

        UUID rewardId = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(rewardId);
        reward.setCostPoints(30);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.of(reward));
        when(pointTransactionRepository.calculatePointsByUserId(userId)).thenReturn(30);
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        String code = userService.claimReward(new ClaimRewardRequest(userId, rewardId));

        assertThat(code).hasSize(6);

        ArgumentCaptor<PointTransaction> captor = ArgumentCaptor.forClass(PointTransaction.class);
        verify(pointTransactionRepository).save(captor.capture());
        assertThat(captor.getValue().getTransactionType()).isEqualTo(TransactionType.REDEEM);
        assertThat(captor.getValue().getState()).isEqualTo(TransactionState.PENDING);
        assertThat(captor.getValue().getPoints()).isEqualTo(-30);

        verify(exchangeCodeRepository).save(any(ExchangeCode.class));
    }

    @Test
    void claimRewardWithInsufficientBalanceThrowsInsufficientPoints() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);

        UUID rewardId = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(rewardId);
        reward.setCostPoints(30);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.of(reward));
        when(pointTransactionRepository.calculatePointsByUserId(userId)).thenReturn(29);

        assertThatThrownBy(() -> userService.claimReward(new ClaimRewardRequest(userId, rewardId)))
            .isInstanceOf(InsufficientPointsException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void claimRewardWithDeactivatedRewardThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);

        UUID rewardId = UUID.randomUUID();
        Reward reward = new Reward();
        reward.setId(rewardId);
        reward.setCostPoints(30);
        reward.setActive(false);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.of(reward));

        assertThatThrownBy(() -> userService.claimReward(new ClaimRewardRequest(userId, rewardId)))
            .isInstanceOf(NotFoundException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void claimRewardWithUnknownRewardThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);

        UUID rewardId = UUID.randomUUID();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(rewardRepository.findById(rewardId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.claimReward(new ClaimRewardRequest(userId, rewardId)))
            .isInstanceOf(NotFoundException.class);
    }

    private PointTransaction grantTransaction(UUID organizationId) {
        Organization organization = new Organization();
        organization.setId(organizationId);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setOrganization(organization);

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Someone");

        PointTransaction tx = new PointTransaction();
        tx.setId(UUID.randomUUID());
        tx.setEmployee(employee);
        tx.setUser(user);
        tx.setPoints(50);
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx.setCreatedAt(java.time.OffsetDateTime.now());
        return tx;
    }

    @Test
    void updateGrantChangesPointsAndNote() {
        UUID organizationId = UUID.randomUUID();
        PointTransaction tx = grantTransaction(organizationId);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));
        when(pointTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PointActionResponse response = userService.updateGrant(
            tx.getId(),
            new GrantPointsUpdateRequest(75, "cumpleaños"),
            organizationId
        );

        assertThat(response.amount()).isEqualTo(75);
        assertThat(response.note()).isEqualTo("cumpleaños");
        assertThat(tx.getPoints()).isEqualTo(75);
        assertThat(tx.getNote()).isEqualTo("cumpleaños");
    }

    @Test
    void updateGrantForAnotherOrganizationThrowsAccessDenied() {
        PointTransaction tx = grantTransaction(UUID.randomUUID());
        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        assertThatThrownBy(() -> userService.updateGrant(tx.getId(), new GrantPointsUpdateRequest(75, null), UUID.randomUUID()))
            .isInstanceOf(AccessDeniedException.class);

        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    void updateGrantOnARefundThrowsNotFound() {
        UUID organizationId = UUID.randomUUID();
        PointTransaction refund = new PointTransaction();
        refund.setId(UUID.randomUUID());
        refund.setTransactionType(TransactionType.EARN);
        refund.setState(TransactionState.DELIVERED);
        refund.setPoints(30);

        when(pointTransactionRepository.findById(refund.getId())).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> userService.updateGrant(refund.getId(), new GrantPointsUpdateRequest(30, null), organizationId))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteGrantRemovesTheTransaction() {
        UUID organizationId = UUID.randomUUID();
        PointTransaction tx = grantTransaction(organizationId);

        when(pointTransactionRepository.findById(tx.getId())).thenReturn(Optional.of(tx));

        userService.deleteGrant(tx.getId(), organizationId);

        verify(pointTransactionRepository).delete(tx);
    }

    @Test
    void updateChangesNameAndKeepsEmailWhenUnchanged() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setName("Someone");
        user.setEmail("someone@example.com");
        user.setEmailVerified(true);

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.update(id, new UserUpdateRequest("Someone Else", "someone@example.com"));

        assertThat(updated.getName()).isEqualTo("Someone Else");
        assertThat(updated.isEmailVerified()).isTrue();
        verify(emailVerificationService, never()).sendVerification(any());
    }

    @Test
    void updateWithUnknownIdThrowsNotFound() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.update(id, new UserUpdateRequest("Someone", "someone@example.com")))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateToANewEmailResetsVerificationAndSendsMessage() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setName("Someone");
        user.setEmail("old@example.com");
        user.setEmailVerified(true);

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.update(id, new UserUpdateRequest("Someone", "NEW@example.com"));

        assertThat(updated.getEmail()).isEqualTo("new@example.com");
        assertThat(updated.isEmailVerified()).isFalse();
        verify(emailVerificationService).sendVerification(updated);
    }

    @Test
    void updateToAnEmailAlreadyUsedByAnotherUserThrowsConflict() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setEmail("mine@example.com");

        User other = new User();
        other.setId(UUID.randomUUID());
        other.setEmail("taken@example.com");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.findByEmail("taken@example.com")).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> userService.update(id, new UserUpdateRequest("Someone", "taken@example.com")))
            .isInstanceOf(ConflictException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void updateKeepingTheSameEmailDoesNotCheckForConflicts() {
        UUID id = UUID.randomUUID();
        User user = new User();
        user.setId(id);
        user.setName("Someone");
        user.setEmail("same@example.com");

        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        userService.update(id, new UserUpdateRequest("Someone New", "same@example.com"));

        verify(userRepository, never()).findByEmail(any());
    }
}
