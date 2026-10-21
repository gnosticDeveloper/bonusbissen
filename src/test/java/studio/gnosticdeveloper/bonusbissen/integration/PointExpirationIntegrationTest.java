package studio.gnosticdeveloper.bonusbissen.integration;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.PointTransaction;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.entity.StaffRole;
import studio.gnosticdeveloper.bonusbissen.entity.OrganizationStaff;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionState;
import studio.gnosticdeveloper.bonusbissen.entity.TransactionType;
import studio.gnosticdeveloper.bonusbissen.entity.User;
import studio.gnosticdeveloper.bonusbissen.repository.PointTransactionRepository;
import studio.gnosticdeveloper.bonusbissen.service.PointExpirationWorker;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class PointExpirationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private PointTransactionRepository transactions;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PointExpirationWorker worker;

    private Organization organization;

    @BeforeEach
    void createIndependentOrganization() {
        organization = new Organization();
        organization.setName("Expiration tests " + UUID.randomUUID());
        organization = organizationRepository.saveAndFlush(organization);
    }

    @Override
    protected Organization defaultOrganization() {
        return organization;
    }

    @Test
    void dueQueriesAndWorkerRespectTheInstantNotJustTheCalendarDate() {
        User user = createUser("expiry-due-" + UUID.randomUUID());
        PointProgram program = program(defaultOrganization());
        OffsetDateTime now = jdbc.queryForObject("select current_timestamp", OffsetDateTime.class);
        PointTransaction due = earn(user, program, null, now.minusHours(1));
        PointTransaction future = earn(user, program, null, now.plusHours(1));
        PointTransaction settled = earn(user, program, null, now.minusDays(1));
        settled.setExpirySettledAt(now);
        transactions.saveAndFlush(settled);

        assertThat(transactions.findDueLots(user.getId(), program.getId()))
            .extracting(PointTransaction::getId).containsExactly(due.getId());
        assertThat(transactions.findPairsWithDueExpiration(PageRequest.of(0, 500)))
            .anySatisfy(pair -> {
                assertThat(pair.getUserId()).isEqualTo(user.getId());
                assertThat(pair.getPointProgramId()).isEqualTo(program.getId());
            });

        worker.processPair(user.getId(), program.getId());
        transactions.flush();

        List<PointTransaction> expires = transactions.findAllByUserIdAndTypeOrderByCreatedAtDesc(user.getId(), TransactionType.EXPIRE);
        assertThat(expires).hasSize(1);
        assertThat(expires.getFirst().getExpiredTransaction().getId()).isEqualTo(due.getId());
        assertThat(expires.getFirst().getPoints()).isEqualTo(-100);
        assertThat(expires.getFirst().getApplicableExpiresAt()).isEqualTo(due.getExpiresAt());
        assertThat(future.getExpirySettledAt()).isNull();
        assertThat(transactions.findDueLots(user.getId(), program.getId())).isEmpty();
        assertThat(transactions.findPairsWithDueExpiration(PageRequest.of(0, 500)))
            .noneSatisfy(pair -> assertThat(pair.getPointProgramId()).isEqualTo(program.getId()));
    }

    @Test
    void backfillUsesCreationTimeAndPreservesAssignedVoidedAndSettledLots() {
        User user = createUser("expiry-backfill-" + UUID.randomUUID());
        PointProgram program = program(defaultOrganization());
        OffsetDateTime created = OffsetDateTime.parse("2023-11-30T16:45:12.123456Z");
        PointTransaction undated = earn(user, program, null, null, created);
        OffsetDateTime assigned = OffsetDateTime.parse("2025-07-20T08:00:00Z");
        PointTransaction dated = earn(user, program, null, assigned, created);
        PointTransaction voided = earn(user, program, null, null, created);
        voided.setVoidedAt(created.plusDays(1));
        transactions.saveAndFlush(voided);
        PointTransaction settled = earn(user, program, null, null, created);
        settled.setExpirySettledAt(created.plusDays(1));
        transactions.saveAndFlush(settled);
        // SQL must not inherit the session timezone for calendar-month arithmetic.
        jdbc.execute("set local time zone 'Pacific/Auckland'");

        transactions.backfillExpiresAt(program.getId(), 3);

        assertThat(deadline(undated)).isEqualTo(OffsetDateTime.parse("2024-02-29T16:45:12.123456Z"));
        assertThat(deadline(dated)).isEqualTo(assigned);
        assertThat(deadline(voided)).isNull();
        assertThat(deadline(settled)).isNull();

        transactions.backfillExpiresAt(program.getId(), 12);
        assertThat(deadline(undated)).isEqualTo(OffsetDateTime.parse("2024-02-29T16:45:12.123456Z"));
        assertThat(deadline(dated)).isEqualTo(assigned);
    }

    @Test
    void clearingExpirationRemovesOnlyTheProgramsUnprocessedDeadlines() {
        User user = createUser("expiry-clear-" + UUID.randomUUID());
        PointProgram program = program(organization);
        PointProgram otherProgram = program(organization);
        OffsetDateTime now = jdbc.queryForObject("select current_timestamp", OffsetDateTime.class);
        PointTransaction due = earn(user, program, null, now.minusHours(1));
        PointTransaction future = earn(user, program, null, now.plusHours(1));
        PointTransaction settled = earn(user, program, null, now.minusDays(1));
        settled.setExpirySettledAt(now);
        transactions.saveAndFlush(settled);
        PointTransaction other = earn(user, otherProgram, null, now.plusHours(1));

        transactions.clearExpiresAt(program.getId());

        assertThat(deadline(due)).isNull();
        assertThat(deadline(future)).isNull();
        assertThat(deadline(settled)).isEqualTo(now.minusDays(1));
        assertThat(deadline(other)).isEqualTo(now.plusHours(1));
        assertThat(transactions.findDueLots(user.getId(), program.getId())).isEmpty();
        assertThat(transactions.findPairsWithDueExpiration(PageRequest.of(0, 500)))
            .noneSatisfy(pair -> assertThat(pair.getPointProgramId()).isEqualTo(program.getId()));
    }

    @Test
    void movementQueryIncludesExpirationLineageWithoutCrossOrganizationOrUserLeaks() {
        User user = createUser("expiry-history-" + UUID.randomUUID());
        User otherUser = createUser("expiry-other-" + UUID.randomUUID());
        PointProgram program = program(defaultOrganization());
        Storefront selected = storefront(defaultOrganization(), program);
        Storefront sibling = storefront(defaultOrganization(), program);
        PointTransaction direct = earn(user, program, selected, null);
        User employee = createEmployee("expiry-staff-" + UUID.randomUUID(), TEST_USER_PASSWORD,
            StaffRole.ADMIN, organization, selected);
        OrganizationStaff staff = organizationStaffRepository.findByUserIdAndActiveTrue(employee.getId()).orElseThrow();
        direct.setEmployee(staff);
        transactions.saveAndFlush(direct);
        PointTransaction correction = new PointTransaction();
        correction.setUser(user);
        correction.setPointProgram(program);
        correction.setEmployee(staff);
        correction.setCorrectedTransaction(direct);
        correction.setTransactionType(TransactionType.ADJUST);
        correction.setState(TransactionState.DELIVERED);
        correction.setPoints(-10);
        correction.setNote("Test correction");
        transactions.saveAndFlush(correction);
        PointTransaction siblingLot = earn(user, program, sibling, null);
        PointTransaction noStorefrontLot = earn(user, program, null, null);
        PointTransaction directExpiration = expire(direct);
        PointTransaction siblingExpiration = expire(siblingLot);
        PointTransaction noStorefrontExpiration = expire(noStorefrontLot);
        PointTransaction otherUsersExpiration = expire(earn(otherUser, program, selected, null));
        Organization otherOrganization = new Organization();
        otherOrganization.setName("Other " + UUID.randomUUID());
        otherOrganization = organizationRepository.saveAndFlush(otherOrganization);
        PointProgram foreignProgram = program(otherOrganization);
        // Even an inconsistent historical storefront association must not leak another org's rows.
        PointTransaction foreignLot = earn(user, foreignProgram, selected, null);
        PointTransaction foreignExpiration = expire(foreignLot);

        List<UUID> ids = transactions.findAllByUserIdAndStorefrontIdOrderByCreatedAtDesc(user.getId(), selected.getId())
            .stream().map(PointTransaction::getId).toList();

        assertThat(ids).containsExactlyInAnyOrder(direct.getId(), correction.getId(), directExpiration.getId(),
            siblingExpiration.getId(), noStorefrontExpiration.getId());
        assertThat(ids).doesNotContain(siblingLot.getId(), foreignLot.getId(), foreignExpiration.getId(), otherUsersExpiration.getId());
        assertThat(transactions.findGrantHistory(organization.getId(), user.getId(), PageRequest.of(0, 100)))
            .extracting(PointTransaction::getId).containsExactlyInAnyOrder(direct.getId(), correction.getId());

        // Original-storefront lineage survives a storefront switching to a different program.
        selected.setPointProgram(program(defaultOrganization()));
        storefrontRepository.saveAndFlush(selected);
        assertThat(transactions.findAllByUserIdAndStorefrontIdOrderByCreatedAtDesc(user.getId(), selected.getId()))
            .extracting(PointTransaction::getId).containsExactlyInAnyOrder(direct.getId(), directExpiration.getId());
    }

    @Test
    void migrationPreservesAssignedDateAndOriginalUtcTimeRegardlessOfSessionTimezone() throws Exception {
        // A transaction-local legacy-shaped table shadows the real table only in this test.
        jdbc.execute("create temporary table point_transactions (created_at timestamptz not null, expires_at date) on commit drop");
        jdbc.execute("set local time zone 'Pacific/Auckland'");
        jdbc.update("insert into point_transactions values ('2024-01-31T23:45:12.123456-03:00', '2024-04-30'), ('2024-01-01T10:00:00Z', null)");
        String migration = new ClassPathResource("db/migration/10__point_expiration_timestamps.sql")
            .getContentAsString(StandardCharsets.UTF_8);

        jdbc.execute(migration);

        assertThat(jdbc.queryForObject("select expires_at from point_transactions where expires_at is not null", OffsetDateTime.class))
            .isEqualTo(OffsetDateTime.parse("2024-04-30T02:45:12.123456Z"));
        assertThat(jdbc.queryForObject("select count(*) from point_transactions where expires_at is null", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select pg_typeof(expires_at)::text from point_transactions limit 1", String.class))
            .isEqualTo("timestamp with time zone");
    }

    private PointProgram program(Organization organization) {
        PointProgram program = new PointProgram();
        program.setOrganization(organization);
        program.setName("Expiry " + UUID.randomUUID());
        return pointProgramRepository.saveAndFlush(program);
    }

    private Storefront storefront(Organization organization, PointProgram program) {
        Storefront storefront = new Storefront();
        storefront.setOrganization(organization);
        storefront.setName("Expiry store " + UUID.randomUUID());
        storefront.setAddress("123 Test St");
        storefront.setPointProgram(program);
        return storefrontRepository.saveAndFlush(storefront);
    }

    private PointTransaction earn(User user, PointProgram program, Storefront storefront, OffsetDateTime expiresAt) {
        return earn(user, program, storefront, expiresAt, OffsetDateTime.now().minusMonths(3));
    }

    private PointTransaction earn(User user, PointProgram program, Storefront storefront, OffsetDateTime expiresAt, OffsetDateTime createdAt) {
        PointTransaction tx = new PointTransaction();
        tx.setUser(user);
        tx.setPointProgram(program);
        tx.setStorefront(storefront);
        tx.setTransactionType(TransactionType.EARN);
        tx.setState(TransactionState.DELIVERED);
        tx.setPoints(100);
        tx.setCreatedAt(createdAt);
        tx.setExpiresAt(expiresAt);
        return transactions.saveAndFlush(tx);
    }

    private PointTransaction expire(PointTransaction lot) {
        PointTransaction tx = new PointTransaction();
        tx.setUser(lot.getUser());
        tx.setPointProgram(lot.getPointProgram());
        tx.setTransactionType(TransactionType.EXPIRE);
        tx.setState(TransactionState.DELIVERED);
        tx.setPoints(-100);
        tx.setExpiredTransaction(lot);
        return transactions.saveAndFlush(tx);
    }

    private OffsetDateTime deadline(PointTransaction tx) {
        return jdbc.queryForObject("select expires_at from point_transactions where id = ?", OffsetDateTime.class, tx.getId());
    }
}
