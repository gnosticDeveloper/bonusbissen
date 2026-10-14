package studio.gnosticdeveloper.bonusbissen.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "cloudinary")
public class CloudinaryStorageService implements StorageService {


    private final Cloudinary cloudinary;

    public CloudinaryStorageService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    @SuppressWarnings("unchecked")
    public String store(byte[] data, String extension, StorageFolder folder) throws IOException {
        Map<String, Object> options = ObjectUtils.asMap(
            "public_id", folder.path() + "/" + UUID.randomUUID(),
            "asset_folder", folder.path(),
            "resource_type", "image",
            "format", extension,
            "overwrite", false,
            "unique_filename", false,
            "context", ObjectUtils.asMap("source", "web_admin_dashboard")
        );

        try {
            Map<String, Object> result = cloudinary.uploader().upload(data, options);
            return (String) result.get("public_id");
        } catch (RuntimeException e) {
            // El SDK no es consistente: errores de red llegan como IOException,
            // pero errores de la propia API de Cloudinary (api_key inválida,
            // rate limit, parámetros rechazados) llegan como RuntimeException.
            // Normalizamos todo a IOException para que los llamadores
            // traten estos errores como fallas del servicio de almacenamiento.
            throw new IOException(e.getMessage(), e);
        }
    }

    @Override
    public void delete(String storageKey) throws IOException {
        try {
            cloudinary.uploader().destroy(storageKey, ObjectUtils.emptyMap());
        } catch (RuntimeException e) {
            throw new IOException(e.getMessage(), e);
        }
    }

    @Override
    public String resolveUrl(String storageKey, DeliveryVariant variant) {
        Transformation<?> transformation = switch (variant) {
            case CARD -> new Transformation<>().width(800).crop("limit");
            case THUMBNAIL -> new Transformation<>().width(160).height(160).crop("fill");
        };
        transformation.fetchFormat("auto").quality("auto");

        return cloudinary.url().secure(true).transformation(transformation).generate(storageKey);
    }
}
