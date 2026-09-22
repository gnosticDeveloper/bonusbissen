package studio.gnosticdeveloper.bonusbissen.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import java.net.URI;

@Configuration
public class BackupConfig {

    @Bean
    public S3Client backupS3Client(
            @Value("${app.backup.s3.endpoint:localhost}") String endpoint,
            @Value("${app.backup.s3.access-key:unset}") String accessKey,
            @Value("${app.backup.s3.secret-key:unset}") String secretKey,
            @Value("${app.backup.s3.region:us-east-1}") String region
    ) {
        return S3Client.builder()
                .endpointOverride(URI.create("https://" + endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .build();
    }
}
