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

    /**
     * Send a one-time passwordless sign-in link for a customer/loyalty account.
     * Same best-effort delivery contract as {@link #sendVerificationEmail}.
     *
     * @param toEmail    recipient address
     * @param toName     recipient display name, for the greeting
     * @param loginLink  absolute URL the recipient opens to sign in
     * @param ttlMinutes how long the link stays valid, stated explicitly in the copy
     */
    void sendUserLoginLinkEmail(String toEmail, String toName, String loginLink, long ttlMinutes);

    /**
     * Send a one-time passwordless sign-in link for a dashboard staff account.
     * Distinct copy from {@link #sendUserLoginLinkEmail} -- this grants access to
     * an organization's admin panel, not a loyalty account. Same best-effort
     * delivery contract as {@link #sendVerificationEmail}.
     *
     * @param toEmail    recipient address
     * @param toName     recipient display name, for the greeting
     * @param loginLink  absolute URL the recipient opens to sign in
     * @param ttlMinutes how long the link stays valid, stated explicitly in the copy
     */
    void sendDashboardLoginLinkEmail(String toEmail, String toName, String loginLink, long ttlMinutes);

    /**
     * Send a generated invoice PDF to an organization's billing contact.
     * Same best-effort delivery contract as {@link #sendVerificationEmail}.
     *
     * @param toEmail  billing contact address
     * @param toName   organization name, for the greeting
     * @param pdf      the invoice document bytes
     * @param fileName attachment file name
     */
    void sendInvoiceEmail(String toEmail, String toName, byte[] pdf, String fileName);
}
