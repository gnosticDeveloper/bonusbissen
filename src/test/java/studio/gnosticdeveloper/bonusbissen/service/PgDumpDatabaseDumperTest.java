package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

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
}
