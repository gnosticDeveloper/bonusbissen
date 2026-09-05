package studio.gnosticdeveloper.bonusbissen.email;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Sends transactional mail through the configured SMTP relay (Mailgun in
 * production). Active unless {@code app.mail.enabled=false}, which tests set so
 * they don't need a live relay or a JavaMailSender bean.
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SmtpEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailSender.class);

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpEmailSender(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Async
    @Override
    public void sendVerificationEmail(String toEmail, String toName, String verificationLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject("Verificá tu email en bonusbissen");
            helper.setText(buildBody(toName, verificationLink), false);
            mailSender.send(message);
            log.info("Sent verification email to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}", toEmail, e);
        }
    }

    //TODO: we should probably make an adequate message here. This could likely land in spam

    private String buildBody(String name, String link) {
        return """
            Hola %s,

            Creaste una cuenta en bonusbissen, el programa de puntos que funciona en
            todos los comercios adheridos. La cuenta es tuya y es de bonusbissen: no
            pertenece a ningún comercio en particular.

            Para verificar tu email, entrá en este enlace:
            %s

            Si no creaste esta cuenta, podés ignorar este mensaje.

            — El equipo de bonusbissen
            """.formatted(name, link);
    }
}
