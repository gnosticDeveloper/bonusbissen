package studio.gnosticdeveloper.bonusbissen.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development stand-in for {@link EmailSender}: instead of talking to an SMTP
 * relay it logs the message, so a local environment needs no mail credentials.
 * Active when {@code app.mail.enabled=false} (the docker-compose dev default);
 * {@link SmtpEmailSender} takes over when it is true.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "false")
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void sendVerificationEmail(String toEmail, String toName, String verificationLink) {
        log.info(
            "[mail disabled] verification email NOT sent to {} ({}). Verification link: {}",
            toEmail,
            toName,
            verificationLink
        );
    }
}
