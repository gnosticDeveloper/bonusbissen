package studio.gnosticdeveloper.bonusbissen.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/**
 * brotli4j makes Apache HttpClient advertise "br", but its native library is glibc-only and the
 * runtime image is Alpine -- the first brotli response then fails with UnsatisfiedLinkError
 * (Georef, behind Cloudflare, does exactly that). It must stay off the classpath; see the
 * exclusion on httpclient5 in pom.xml.
 */
class NoBrotliOnClasspathTest {

    @Test
    void brotliDecoderIsNotOnTheClasspath() {
        assertThatThrownBy(() -> Class.forName("com.aayushatharva.brotli4j.decoder.BrotliInputStream"))
            .isInstanceOf(ClassNotFoundException.class);
    }
}
