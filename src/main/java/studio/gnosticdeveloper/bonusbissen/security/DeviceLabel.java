package studio.gnosticdeveloper.bonusbissen.security;

/**
 * Turns {@link DeviceHints} into a short human label (e.g. "Brave en Windows") instead of
 * storing the raw headers or any network-identifying data -- device + last-used time is
 * enough for someone to recognize their own sessions.
 *
 * <p>Client Hints win over the User-Agent when present: Brave (and other Chromium forks)
 * deliberately report a plain Chrome User-Agent and only name themselves in
 * {@code Sec-CH-UA}.
 */
public final class DeviceLabel {

    static final String UNKNOWN_DEVICE = "Dispositivo desconocido";
    private static final String UNKNOWN_BROWSER = "navegador desconocido";
    private static final String UNKNOWN_OS = "dispositivo desconocido";
    private static final int MAX_HEADER_LENGTH = 512;

    private DeviceLabel() {}

    public static String of(DeviceHints hints) {
        if (hints == null) {
            return UNKNOWN_DEVICE;
        }
        String ua = bounded(hints.userAgent());

        String browser = browserFromClientHints(bounded(hints.clientHintsBrands()));
        if (browser == null && ua != null) {
            browser = browserFromUserAgent(ua);
        }
        String os = osFromClientHints(bounded(hints.clientHintsPlatform()));
        if (os == null && ua != null) {
            os = osFromUserAgent(ua);
        }

        if (browser == null && os == null) {
            return UNKNOWN_DEVICE;
        }
        return (browser != null ? browser : UNKNOWN_BROWSER) + " en " + (os != null ? os : UNKNOWN_OS);
    }

    /** {@code "Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"} -> "Brave". */
    static String browserFromClientHints(String brands) {
        if (brands == null) {
            return null;
        }
        String chromiumFallback = null;
        for (String entry : brands.split(",")) {
            String brand = unquote(entry.split(";", 2)[0]);
            if (brand.isEmpty() || isGrease(brand)) {
                continue;
            }
            if (brand.equals("Chromium")) {
                chromiumFallback = "Chrome";
                continue;
            }
            return switch (brand) {
                case "Google Chrome" -> "Chrome";
                case "Microsoft Edge" -> "Edge";
                case "Opera GX" -> "Opera GX";
                default -> brand; // Brave, Opera, Vivaldi, Yandex, ...
            };
        }
        return chromiumFallback;
    }

    /** {@code "Windows"} -> "Windows". "Unknown"/empty means the browser wouldn't say. */
    static String osFromClientHints(String platform) {
        if (platform == null) {
            return null;
        }
        String value = unquote(platform);
        if (value.isEmpty() || value.equalsIgnoreCase("Unknown")) {
            return null;
        }
        return switch (value) {
            case "Chrome OS", "Chromium OS" -> "ChromeOS";
            default -> value; // Windows, macOS, Linux, Android, iOS
        };
    }

    static String browserFromUserAgent(String ua) {
        if (ua.contains("Edg/") || ua.contains("EdgA/") || ua.contains("EdgiOS/")) return "Edge";
        if (ua.contains("OPR/") || ua.contains("Opera")) return "Opera";
        if (ua.contains("SamsungBrowser/")) return "Samsung Internet";
        if (ua.contains("Firefox/") || ua.contains("FxiOS/")) return "Firefox";
        if (ua.contains("CriOS/") || ua.contains("Chrome/")) return "Chrome";
        if (ua.contains("Safari/")) return "Safari";
        return null;
    }

    static String osFromUserAgent(String ua) {
        if (ua.contains("Windows")) return "Windows";
        // Before macOS: iOS User-Agents say "like Mac OS X".
        if (ua.contains("iPhone") || ua.contains("iPad") || ua.contains("iPod")) return "iOS";
        // Before Linux: Android User-Agents say "Linux; Android".
        if (ua.contains("Android")) return "Android";
        if (ua.contains("Mac OS X") || ua.contains("Macintosh")) return "macOS";
        if (ua.contains("CrOS")) return "ChromeOS";
        if (ua.contains("Linux")) return "Linux";
        return null;
    }

    /** GREASE brands look like "Not_A Brand", "Not A(Brand", "Not;A=Brand"... */
    private static boolean isGrease(String brand) {
        return brand.startsWith("Not") && brand.contains("Brand");
    }

    private static String unquote(String value) {
        String trimmed = value.trim();
        if (trimmed.length() >= 2 && trimmed.startsWith("\"") && trimmed.endsWith("\"")) {
            trimmed = trimmed.substring(1, trimmed.length() - 1);
        }
        return trimmed.trim();
    }

    private static String bounded(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        return header.length() > MAX_HEADER_LENGTH ? header.substring(0, MAX_HEADER_LENGTH) : header;
    }
}
