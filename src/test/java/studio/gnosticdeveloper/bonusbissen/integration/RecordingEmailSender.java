package studio.gnosticdeveloper.bonusbissen.integration;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import studio.gnosticdeveloper.bonusbissen.email.EmailSender;

/**
 * Test double for {@link EmailSender}: records every message instead of sending
 * it, so integration tests can assert on verification mail and pull the token
 * straight out of the link.
 */
public class RecordingEmailSender implements EmailSender {

    public record Sent(String email, String name, String link) {}

    private final List<Sent> sent = new CopyOnWriteArrayList<>();

    @Override
    public void sendVerificationEmail(String toEmail, String toName, String verificationLink) {
        sent.add(new Sent(toEmail, toName, verificationLink));
    }

    public List<Sent> sent() {
        return sent;
    }

    public Sent last() {
        if (sent.isEmpty()) {
            throw new AssertionError("no verification email was sent");
        }
        return sent.get(sent.size() - 1);
    }

    public String tokenFromLastLink() {
        String link = last().link();
        int idx = link.indexOf("token=");
        if (idx < 0) {
            throw new AssertionError("no token in verification link: " + link);
        }
        return link.substring(idx + "token=".length());
    }

    public void clear() {
        sent.clear();
    }
}
