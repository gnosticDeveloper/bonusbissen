package studio.gnosticdeveloper.bonusbissen.repository;

/**
 * The rules for "this organization is lapsed" as SQL predicates, so the guard's queries and the
 * discovery queries can't drift apart. Each one reads from an {@code organizations} row aliased
 * {@code o} and compares against the database's {@code now()}. See SubscriptionGuard for what
 * lapsing means.
 */
final class LapseSql {

    private LapseSql() {}

    /** Cancelled, and the period it had paid for has run out. No grace on top: leaving was its own choice. */
    static final String ENDED = "(o.subscription_ends_at is not null and o.subscription_ends_at <= now())";

    /** Has a PENDING invoice more than its grace tier's days past due. */
    static final String OVERDUE = """
        exists (
            select 1 from invoices i
            join grace_tiers g on g.name = o.grace_tier
            where i.organization_id = o.id
              and i.payment_status = 'pending'
              and i.due_at + make_interval(days => g.grace_days) < now()
        )""";

    /** For a query over {@code storefronts s}: leaves out the ones whose organization is lapsed. */
    static final String STOREFRONT_NOT_LAPSED = """
        and not exists (
            select 1 from organizations o
            where o.id = s.organization_id and (""" + ENDED + " or " + OVERDUE + "))";
}
