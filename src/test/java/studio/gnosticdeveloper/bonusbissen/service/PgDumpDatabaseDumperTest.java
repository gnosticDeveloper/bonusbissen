package studio.gnosticdeveloper.bonusbissen.service;

import java.io.IOException;
import java.time.Duration;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PgDumpDatabaseDumperTest {

    @Test
    void parseJdbcUrlExtractsHostPortAndDatabase() {
        String[] result = PgDumpDatabaseDumper.parseJdbcUrl("jdbc:postgresql://postgres:5432/bonusbissen");

        assertThat(result).containsExactly("postgres", "5432", "bonusbissen");
    }

    @Test
    void parseJdbcUrlDefaultsPortWhenOmitted() {
        String[] result = PgDumpDatabaseDumper.parseJdbcUrl("jdbc:postgresql://localhost/bonusbissen");

        assertThat(result).containsExactly("localhost", "5432", "bonusbissen");
    }

    @Test
    void runKillsAProcessThatOutlivesTheTimeout() {
        long started = System.nanoTime();

        assertThatThrownBy(() -> PgDumpDatabaseDumper.run(new ProcessBuilder("sleep", "30"), Duration.ofMillis(300)))
            .isInstanceOf(IOException.class)
            .hasMessageContaining("timed out");

        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(15));
    }

    @Test
    void runReportsANonZeroExitWithTheProcessOutput() {
        assertThatThrownBy(() -> PgDumpDatabaseDumper.run(new ProcessBuilder("sh", "-c", "echo connection refused >&2; exit 3"), Duration.ofSeconds(10)))
            .isInstanceOf(IOException.class)
            .hasMessageContaining("exited with code 3")
            .hasMessageContaining("connection refused");
    }

    @Test
    void runCompletesNormallyOnSuccess() throws Exception {
        PgDumpDatabaseDumper.run(new ProcessBuilder("sh", "-c", "echo done"), Duration.ofSeconds(10));
    }
}
