package studio.gnosticdeveloper.bonusbissen.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabaseBackupServiceTest {

    @Mock
    private DatabaseDumper databaseDumper;

    @Mock
    private S3Client s3Client;

    private DatabaseBackupService backupService;
    private Path dumpFile;

    @BeforeEach
    void setUp() throws Exception {
        backupService = new DatabaseBackupService(databaseDumper, s3Client);
        setBucket(backupService, "bonusbissen");
    }

    @AfterEach
    void cleanUp() throws IOException {
        if (dumpFile != null) {
            Files.deleteIfExists(dumpFile);
        }
    }

    @Test
    void performBackupUploadsDumpToConfiguredBucket() throws Exception {
        dumpFile = Files.createTempFile("test-dump-", ".sql");
        Files.writeString(dumpFile, "-- sql dump content");
        when(databaseDumper.dump()).thenReturn(dumpFile);
        when(s3Client.putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        backupService.performBackup();

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(software.amazon.awssdk.core.sync.RequestBody.class));
        assertThat(requestCaptor.getValue().bucket()).isEqualTo("bonusbissen");
        assertThat(requestCaptor.getValue().key()).startsWith("bonusbissen-").endsWith(".sql");
    }

    @Test
    void performBackupDeletesTempFileAfterSuccessfulUpload() throws Exception {
        dumpFile = Files.createTempFile("test-dump-", ".sql");
        when(databaseDumper.dump()).thenReturn(dumpFile);
        when(s3Client.putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        backupService.performBackup();

        assertThat(Files.exists(dumpFile)).isFalse();
    }

    @Test
    void performBackupDeletesTempFileEvenWhenUploadFails() throws Exception {
        dumpFile = Files.createTempFile("test-dump-", ".sql");
        when(databaseDumper.dump()).thenReturn(dumpFile);
        when(s3Client.putObject(any(PutObjectRequest.class), any(software.amazon.awssdk.core.sync.RequestBody.class)))
                .thenThrow(software.amazon.awssdk.core.exception.SdkException.create("upload failed", null));

        assertThatThrownBy(() -> backupService.performBackup())
                .isInstanceOf(software.amazon.awssdk.core.exception.SdkException.class);
        assertThat(Files.exists(dumpFile)).isFalse();
    }

    @Test
    void performBackupPropagatesDumpFailureWithoutTouchingS3() throws Exception {
        when(databaseDumper.dump()).thenThrow(new IOException("pg_dump exited with code 1"));

        assertThatThrownBy(() -> backupService.performBackup())
                .isInstanceOf(IOException.class)
                .hasMessageContaining("pg_dump exited with code 1");
        verifyNoInteractions(s3Client);
    }

    @Test
    void runScheduledBackupSwallowsExceptionsSoTheSchedulerIsNeverDeregistered() throws Exception {
        when(databaseDumper.dump()).thenThrow(new IOException("boom"));

        backupService.runScheduledBackup();

        verifyNoInteractions(s3Client);
    }

    private static void setBucket(DatabaseBackupService service, String bucket) throws Exception {
        Field field = DatabaseBackupService.class.getDeclaredField("bucket");
        field.setAccessible(true);
        field.set(service, bucket);
    }
}
