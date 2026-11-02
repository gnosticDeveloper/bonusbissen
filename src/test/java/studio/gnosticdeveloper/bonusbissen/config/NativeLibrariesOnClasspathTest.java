package studio.gnosticdeveloper.bonusbissen.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import org.junit.jupiter.api.Test;

/**
 * A jar that ships native libraries usually ships glibc builds, and they fail to load on our Alpine (musl)
 * runtime image -- while working on every dev machine and in CI. That's how brotli4j (dragged in by OpenPDF)
 * broke storefront creation only inside the container.
 *
 * If this fails, a new native-library jar joined the classpath. Check that it works on Alpine (or exclude it
 * in the pom if nothing uses it), then add it below.
 */
class NativeLibrariesOnClasspathTest {

    /** Checked: these ship musl builds / are only used in ways that don't touch the native code. */
    private static final Set<String> REVIEWED = Set.of("jna", "byte-buddy-agent");

    @Test
    void noUnreviewedJarShipsNativeLibraries() throws Exception {
        List<File> jars = new ArrayList<>();
        for (String entry : System.getProperty("java.class.path").split(File.pathSeparator)) {
            if (entry.endsWith(".jar")) jars.add(new File(entry));
        }
        // Guards against the scan silently seeing nothing (e.g. a manifest-only classpath jar).
        assertThat(jars).as("jars on the test classpath").hasSizeGreaterThan(20);

        List<String> unreviewed = new ArrayList<>();
        for (File jar : jars) {
            if (!hasNativeLibrary(jar) || isReviewed(jar.getName())) continue;
            unreviewed.add(jar.getName());
        }

        assertThat(unreviewed).as("jars with native libraries that nobody has checked on Alpine/musl").isEmpty();
    }

    private static boolean hasNativeLibrary(File jar) throws Exception {
        try (ZipFile zip = new ZipFile(jar)) {
            return zip.stream().map(ZipEntry::getName).anyMatch(n -> n.matches(".*\\.(so|dylib|dll|jnilib)(\\.\\d+)*$"));
        }
    }

    private static boolean isReviewed(String jarName) {
        return REVIEWED.stream().anyMatch(name -> jarName.startsWith(name + "-"));
    }
}
