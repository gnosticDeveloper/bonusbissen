package studio.gnosticdeveloper.bonusbissen.security;

/**
 * The browser-identifying headers of a sign-in request: {@code User-Agent} plus the
 * low-entropy User-Agent Client Hints ({@code Sec-CH-UA}, {@code Sec-CH-UA-Platform})
 * that Chromium browsers send by default. Any of them may be null. Only used to
 * build a human session label (see {@link DeviceLabel}); never for security decisions,
 * since every one of them is client-controlled.
 */
public record DeviceHints(String userAgent, String clientHintsBrands, String clientHintsPlatform) {

    public static final DeviceHints NONE = new DeviceHints(null, null, null);
}
