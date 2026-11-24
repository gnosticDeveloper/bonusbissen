package studio.gnosticdeveloper.bonusbissen.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class DeviceLabelTest {

    private static final String CHROME_WINDOWS_UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    @Test
    void braveIsNamedFromClientHintsEvenThoughItsUserAgentSaysChrome() {
        DeviceHints hints = new DeviceHints(
            CHROME_WINDOWS_UA,
            "\"Brave\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
            "\"Windows\""
        );

        assertThat(DeviceLabel.of(hints)).isEqualTo("Brave en Windows");
    }

    @Test
    void chromeAndEdgeBrandsMapToShortNames() {
        assertThat(DeviceLabel.of(new DeviceHints(null, "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"", "\"macOS\"")))
            .isEqualTo("Chrome en macOS");
        assertThat(DeviceLabel.of(new DeviceHints(null, "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Microsoft Edge\";v=\"132\"", "\"Windows\"")))
            .isEqualTo("Edge en Windows");
    }

    @Test
    void onlyChromiumAndGreaseFallsBackToChrome() {
        assertThat(DeviceLabel.of(new DeviceHints(null, "\"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"", "\"Linux\"")))
            .isEqualTo("Chrome en Linux");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        CHROME_WINDOWS_UA + "|Chrome en Windows",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0|Firefox en Windows",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0|Edge en Windows",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15|Safari en macOS",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1|Safari en iOS",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15|Firefox en iOS",
        "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1|Chrome en iOS",
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36|Chrome en Android",
        "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36|Samsung Internet en Android",
        "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0|Firefox en Linux",
        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36|Chrome en ChromeOS",
    })
    void userAgentAloneIsParsedWhenThereAreNoClientHints(String userAgent, String expected) {
        assertThat(DeviceLabel.of(new DeviceHints(userAgent, null, null))).isEqualTo(expected);
    }

    @Test
    void serverRuntimeUserAgentWithNothingRecognizableIsUnknownDevice() {
        // What the backend saw before the Next server forwarded the browser's headers.
        assertThat(DeviceLabel.of(new DeviceHints("Bun/1.3.0", null, null))).isEqualTo("Dispositivo desconocido");
        assertThat(DeviceLabel.of(new DeviceHints("node", null, null))).isEqualTo("Dispositivo desconocido");
    }

    @Test
    void missingHeadersAreUnknownDevice() {
        assertThat(DeviceLabel.of(DeviceHints.NONE)).isEqualTo("Dispositivo desconocido");
        assertThat(DeviceLabel.of(new DeviceHints("", " ", ""))).isEqualTo("Dispositivo desconocido");
        assertThat(DeviceLabel.of(null)).isEqualTo("Dispositivo desconocido");
    }

    @Test
    void unknownPlatformHintFallsBackToUserAgent() {
        assertThat(DeviceLabel.of(new DeviceHints(CHROME_WINDOWS_UA, "\"Brave\";v=\"131\"", "\"Unknown\"")))
            .isEqualTo("Brave en Windows");
    }

    @Test
    void partiallyRecognizedDeviceKeepsTheKnownHalf() {
        assertThat(DeviceLabel.of(new DeviceHints("SomeBot/1.0 (Windows)", null, null))).isEqualTo("navegador desconocido en Windows");
    }
}
