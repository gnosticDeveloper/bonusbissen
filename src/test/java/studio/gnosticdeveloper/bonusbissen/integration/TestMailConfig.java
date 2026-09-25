package studio.gnosticdeveloper.bonusbissen.integration;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Supplies the {@link RecordingEmailSender} that stands in for real SMTP in
 * integration tests. Paired with {@code app.mail.enabled=false}, which also
 * activates {@code LoggingEmailSender}; {@code @Primary} makes the recording
 * one win for injection while tests still read it back by its concrete type.
 */
@TestConfiguration
public class TestMailConfig {

    @Bean
    @Primary
    RecordingEmailSender recordingEmailSender() {
        return new RecordingEmailSender();
    }
}
