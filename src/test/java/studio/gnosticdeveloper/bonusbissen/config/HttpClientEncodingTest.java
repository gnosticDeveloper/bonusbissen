package studio.gnosticdeveloper.bonusbissen.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.service.GeorefClient;

/**
 * The runtime image is Alpine (musl), where the native decoders for brotli/zstd don't load. A client that
 * merely <i>offers</i> those encodings gets them back from Cloudflare-fronted APIs (Georef) and then dies with
 * UnsatisfiedLinkError -- but only in the container, never on a dev machine or in CI. So assert what the
 * clients offer, whichever dependency happens to put a native decoder on the classpath.
 */
class HttpClientEncodingTest {

    /**
     * Encodings whose decoders are native libraries (brotli4j, zstd-jni). The pure-Java ones HttpClient also
     * offers when commons-compress is present (lz4, bzip2, deflate64, ...) are fine on musl.
     */
    private static final List<String> NATIVE_BACKED = List.of("br", "zstd");

    private HttpServer server;
    private final AtomicReference<String> acceptEncoding = new AtomicReference<>();

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            acceptEncoding.set(exchange.getRequestHeaders().getFirst("Accept-Encoding"));
            byte[] body = "{\"direcciones\":[]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private void assertNoNativeBackedEncoding(String header) {
        // No header at all means "identity" -- also fine.
        if (header == null) return;
        List<String> offered = Arrays.stream(header.split(",")).map(e -> e.split(";")[0].trim().toLowerCase()).toList();
        assertThat(offered).as("Accept-Encoding sent to the server").doesNotContainAnyElementsOf(NATIVE_BACKED);
    }

    @Test
    void georefClientDoesNotOfferNativeBackedEncodings() {
        GeorefClient client = new GeorefClient(baseUrl(), true);

        // The empty result is reported as a BadRequest -- irrelevant here, we only want the request to go out.
        try {
            client.resolve("Av. Corrientes 1234", "Buenos Aires", "Ciudad Autónoma de Buenos Aires");
        } catch (BadRequestException expected) {
            // ignored
        }

        assertNoNativeBackedEncoding(acceptEncoding.get());
    }

    @Test
    void aDefaultApacheHttpClientDoesNotOfferNativeBackedEncodings() throws Exception {
        // Cloudinary's client is built the same way (defaults), so this covers it too.
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            client.execute(new HttpGet(baseUrl() + "/"), response -> response.getCode());
        }

        assertNoNativeBackedEncoding(acceptEncoding.get());
    }
}
