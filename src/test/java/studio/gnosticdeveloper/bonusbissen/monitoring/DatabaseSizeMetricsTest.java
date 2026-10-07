package studio.gnosticdeveloper.bonusbissen.monitoring;

import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import studio.gnosticdeveloper.bonusbissen.integration.AbstractIntegrationTest;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseSizeMetricsTest extends AbstractIntegrationTest {

    @Autowired
    private MeterRegistry meterRegistry;

    @Test
    void databaseSizeGaugeReportsAPositiveByteCount() {
        double size = meterRegistry.get("db.size.bytes").gauge().value();
        assertThat(size).isGreaterThan(0);
    }

    @Test
    void traceabilityLogsTableSizeGaugeReportsANonNegativeByteCount() {
        double size = meterRegistry.get("db.table.size.bytes").tag("table", "traceability_logs").gauge().value();
        assertThat(size).isGreaterThanOrEqualTo(0);
    }

    @Test
    void traceabilityLogsRowEstimateGaugeIsRegistered() {
        double rows = meterRegistry.get("db.table.row.estimate").tag("table", "traceability_logs").gauge().value();
        assertThat(rows).isGreaterThanOrEqualTo(0);
    }
}
