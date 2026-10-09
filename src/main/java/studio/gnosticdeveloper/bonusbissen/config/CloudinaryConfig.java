package studio.gnosticdeveloper.bonusbissen.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Bean
    public Cloudinary cloudinary(
        @Value("${app.cloudinary.cloud-name:unset}") String cloudName,
        @Value("${app.cloudinary.api-key:unset}") String apiKey,
        @Value("${app.cloudinary.api-secret:unset}") String apiSecret
    ) {
        Map config = ObjectUtils.asMap(
            "cloud_name", cloudName,
            "api_key", apiKey,
            "api_secret", apiSecret,
            "secure", true
        );
        return new Cloudinary(config);
    }
}
