package studio.gnosticdeveloper.bonusbissen.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import studio.gnosticdeveloper.bonusbissen.storage.StorageFolder;

/**
 * Dev-only stand-in for nginx's uploads location: serves the files
 * LocalFileStorageService writes under app.uploads.dir at /uploads/**, so
 * images render when the backend runs outside docker compose. Never loaded
 * without the "dev" profile, so production (nginx / Cloudinary) is unaffected.
 */
@Configuration
@Profile("dev")
public class DevUploadsConfig implements WebMvcConfigurer {

    private static final Logger log = LoggerFactory.getLogger(DevUploadsConfig.class);

    private final Path uploadsRoot;

    public DevUploadsConfig(@Value("${app.uploads.dir}") String uploadsDir) {
        this.uploadsRoot = Paths.get(uploadsDir).toAbsolutePath().normalize();
        log.info("Dev profile: serving uploaded images from {} at /uploads/**", uploadsRoot);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // One handler per known folder, mirroring nginx's whitelist, rather
        // than exposing everything under the uploads root.
        for (StorageFolder folder : StorageFolder.values()) {
            registry.addResourceHandler("/uploads/" + folder.path() + "/**")
                .addResourceLocations(uploadsRoot.resolve(folder.path()).toUri().toString())
                .setCacheControl(CacheControl.noCache());
        }
    }

    // Separate chain matched before the main one in SecurityConfig, so the
    // public image paths don't need any dev-specific branching there.
    @Bean
    @Order(0)
    public SecurityFilterChain devUploadsSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/uploads/**")
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
