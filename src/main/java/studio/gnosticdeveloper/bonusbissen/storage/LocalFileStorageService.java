package studio.gnosticdeveloper.bonusbissen.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements StorageService {

    @Value("${app.uploads.dir}")
    private String uploadsDir;

    @Value("${app.storage.assets-url}")
    private String assetsUrl;

    @Override
    public String store(byte[] data, String extension, StorageFolder folder) throws IOException {
        String filename = UUID.randomUUID() + "." + extension;
        Path destination = Paths.get(uploadsDir, folder.path(), filename);
        Files.createDirectories(destination.getParent());
        Files.write(destination, data);
        return folder.path() + "/" + filename;
    }

    @Override
    public void delete(String storageKey) throws IOException {
        String[] parts = storageKey.split("/", -1);
        if (parts.length != 2 || parts[1].isBlank() || !parts[1].matches("[a-zA-Z0-9-]+\\.(?:jpg|jpeg|png|webp)")) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        boolean knownFolder = java.util.Arrays.stream(StorageFolder.values()).anyMatch(folder -> folder.path().equals(parts[0]));
        if (!knownFolder) throw new IllegalArgumentException("Invalid storage folder");
        Files.deleteIfExists(Paths.get(uploadsDir, parts[0], parts[1]));
    }

    @Override
    public String resolveUrl(String storageKey, DeliveryVariant variant) {
        // Sin transformaciones en el mock local: nginx sirve el archivo tal
        // cual. A diferencia de Cloudinary, acá armamos nosotros mismos la URL
        // absoluta -- el caller ya no antepone ningún prefijo por su cuenta.
        String base = assetsUrl.endsWith("/") ? assetsUrl : assetsUrl + "/";
        return base + storageKey;
    }
}
