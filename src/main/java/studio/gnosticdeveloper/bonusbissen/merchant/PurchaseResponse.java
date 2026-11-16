package studio.gnosticdeveloper.bonusbissen.merchant;

/**
 * CREDITED: points were added now. DUPLICATE: this order was already credited, same points
 * echoed back. UNMATCHED: no BonusBissen account for the identifier -- nothing was recorded, so
 * the merchant may resend the same order once the shopper has an account. IGNORED: an authentic
 * notification with nothing to credit.
 */
public record PurchaseResponse(String status, int points) {
    public static final String CREDITED = "CREDITED";
    public static final String DUPLICATE = "DUPLICATE";
    public static final String UNMATCHED = "UNMATCHED";
    public static final String IGNORED = "IGNORED";
}
