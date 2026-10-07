package studio.gnosticdeveloper.bonusbissen.monitoring;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Exposes Postgres size metrics to Prometheus/Grafana so database growth is
 * actually visible over time -- in particular traceability_logs, the one table
 * under an active retention policy (TraceabilityRetentionService). Without this,
 * there's no way to tell whether the nightly purge is keeping pace with inserts.
 */
@Component
public class DatabaseSizeMetrics {

    private final JdbcTemplate jdbcTemplate;
    private final MeterRegistry meterRegistry;

    public DatabaseSizeMetrics(JdbcTemplate jdbcTemplate, MeterRegistry meterRegistry) {
        this.jdbcTemplate = jdbcTemplate;
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    void registerGauges() {
        Gauge.builder("db.size.bytes", this, DatabaseSizeMetrics::databaseSizeBytes)
            .description("Total size of the current database, in bytes")
            .register(meterRegistry);

        Gauge.builder("db.table.size.bytes", this, m -> m.tableSizeBytes("traceability_logs"))
            .description("Total size of a table including indexes and TOAST, in bytes")
            .tag("table", "traceability_logs")
            .register(meterRegistry);

        Gauge.builder("db.table.row.estimate", this, m -> m.rowEstimate("traceability_logs"))
            .description("Planner's row-count estimate for a table (cheap -- avoids a full scan as the table grows)")
            .tag("table", "traceability_logs")
            .register(meterRegistry);
    }

    private double databaseSizeBytes() {
        Long size = jdbcTemplate.queryForObject("SELECT pg_database_size(current_database())", Long.class);
        return size == null ? 0 : size;
    }

    private double tableSizeBytes(String tableName) {
        Long size = jdbcTemplate.queryForObject("SELECT pg_total_relation_size(?)", Long.class, tableName);
        return size == null ? 0 : size;
    }

    private double rowEstimate(String tableName) {
        Long estimate = jdbcTemplate.queryForObject("SELECT reltuples::bigint FROM pg_class WHERE relname = ?", Long.class, tableName);
        return estimate == null || estimate < 0 ? 0 : estimate;
    }
}
