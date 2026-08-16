package studio.gnosticdeveloper.bonusbissen.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class PgDumpDatabaseDumper implements DatabaseDumper {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Override
    public Path dump() throws IOException, InterruptedException {
        String[] hostPortDb = parseJdbcUrl(datasourceUrl);
        Path dumpFile = Files.createTempFile("bonusbissen-backup-", ".sql");

        ProcessBuilder processBuilder = new ProcessBuilder(
                "pg_dump",
                "-h", hostPortDb[0],
                "-p", hostPortDb[1],
                "-U", username,
                "-d", hostPortDb[2],
                "-f", dumpFile.toString()
        );
        processBuilder.environment().put("PGPASSWORD", password);
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();
        String output = new String(process.getInputStream().readAllBytes());
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            Files.deleteIfExists(dumpFile);
            throw new IOException("pg_dump exited with code " + exitCode + ": " + output);
        }

        return dumpFile;
    }

    // jdbc:postgresql://host:port/dbname -> {host, port, dbname}
    static String[] parseJdbcUrl(String jdbcUrl) {
        String stripped = jdbcUrl.replaceFirst("^jdbc:postgresql://", "");
        String[] hostPortAndDb = stripped.split("/", 2);
        String[] hostAndPort = hostPortAndDb[0].split(":", 2);
        String host = hostAndPort[0];
        String port = hostAndPort.length > 1 ? hostAndPort[1] : "5432";
        String db = hostPortAndDb.length > 1 ? hostPortAndDb[1] : "";
        return new String[]{host, port, db};
    }
}
