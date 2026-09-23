package studio.gnosticdeveloper.bonusbissen.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
public class DatabaseBackupService {

    private static final DateTimeFormatter KEY_TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private final DatabaseDumper databaseDumper;
    private final S3Client s3Client;

    @Value("${app.backup.s3.bucket}")
    private String bucket;

    public DatabaseBackupService(DatabaseDumper databaseDumper, S3Client s3Client) {
        this.databaseDumper = databaseDumper;
        this.s3Client = s3Client;
    }

    @Scheduled(cron = "${app.backup.cron}")
    public void runScheduledBackup() {
        try {
            performBackup();
        } catch (Exception e) {
            // A @Scheduled method that throws gets silently deregistered by the
            // scheduler for the rest of the JVM's lifetime, cancelling every
            // future nightly backup. Swallow and log instead.
            System.err.println("Database backup failed: " + e.getMessage());
        }
    }

    public void performBackup() throws IOException, InterruptedException {
        Path dumpFile = databaseDumper.dump();
        try {
            String key = "bonusbissen-" + KEY_TIMESTAMP.format(Instant.now()) + ".sql";
            s3Client.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(key).build(),
                    RequestBody.fromFile(dumpFile)
            );
        } finally {
            Files.deleteIfExists(dumpFile);
        }
    }
}
