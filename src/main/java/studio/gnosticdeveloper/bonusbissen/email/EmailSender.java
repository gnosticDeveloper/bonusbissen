package studio.gnosticdeveloper.bonusbissen.email;

public interface EmailSender {

    /**
     * Send the address-verification message for a bonusbissen account.
     * Implementations are expected to be best-effort: a delivery failure is
     * logged, not propagated, so it never rolls back the caller's transaction.
     *
     * @param toEmail          recipient address
     * @param toName           recipient display name, for the greeting
     * @param verificationLink absolute URL the recipient opens to verify
     */
    void sendVerificationEmail(String toEmail, String toName, String verificationLink);
}
