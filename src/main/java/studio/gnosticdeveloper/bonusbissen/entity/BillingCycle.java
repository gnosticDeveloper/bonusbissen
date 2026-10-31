package studio.gnosticdeveloper.bonusbissen.entity;

import java.time.Period;
import lombok.Getter;

// Only MONTHLY exists for now -- other cadences deliberately left out until needed.
@Getter
public enum BillingCycle {
    MONTHLY("monthly", Period.ofMonths(1));

    private final String value;
    private final Period period;

    BillingCycle(String value, Period period) {
        this.value = value;
        this.period = period;
    }
}
