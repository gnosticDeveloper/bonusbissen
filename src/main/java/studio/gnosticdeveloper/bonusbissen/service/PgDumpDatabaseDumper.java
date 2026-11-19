package studio.gnosticdeveloper.bonusbissen.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class PgDumpDatabaseDumper implements DatabaseDumper {

    /** Tail of pg_dump's output kept in the failure message. */
    private static final int MAX_OUTPUT_CHARS = 4000;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${app.backup.pg-dump-timeout:30m}")
    private Duration timeout;

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

        try {
            run(processBuilder, timeout);
        } catch (IOException | InterruptedException e) {
            Files.deleteIfExists(dumpFile);
            throw e;
        }
        return dumpFile;
    }

    /**
     * Runs the process and waits at most {@code timeout} (quality report M2: a hung pg_dump used
     * to block its scheduler thread forever). Output goes to a temp file rather than being read
     * here, because reading the stream blocks until the process exits and would defeat the
     * timeout. Throws on a non-zero exit or on timeout, after killing the process.
     */
    static void run(ProcessBuilder processBuilder, Duration timeout) throws IOException, InterruptedException {
        Path log = Files.createTempFile("bonusbissen-pg-dump-", ".log");
        try {
            processBuilder.redirectErrorStream(true);
            processBuilder.redirectOutput(log.toFile());
            Process process = processBuilder.start();
            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                process.waitFor(10, TimeUnit.SECONDS);
                throw new IOException(processBuilder.command().getFirst() + " timed out after " + timeout + ": " + tail(log));
            }
            if (process.exitValue() != 0) {
                throw new IOException(processBuilder.command().getFirst() + " exited with code " + process.exitValue() + ": " + tail(log));
            }
        } finally {
            Files.deleteIfExists(log);
        }
    }

    private static String tail(Path log) throws IOException {
        String output = Files.readString(log);
        return output.length() <= MAX_OUTPUT_CHARS ? output : output.substring(output.length() - MAX_OUTPUT_CHARS);
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
