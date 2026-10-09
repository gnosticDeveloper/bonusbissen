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

    private static final String FOLDER = "rewards";

    @Value("${app.uploads.dir}")
    private String uploadsDir;

    @Override
    public String store(byte[] data, String extension) throws IOException {
        String filename = UUID.randomUUID() + "." + extension;
        Path destino = Paths.get(uploadsDir, filename);
        Files.createDirectories(destino.getParent());
        Files.write(destino, data);
        return FOLDER + "/" + filename;
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Path filePath = Paths.get(uploadsDir, storageKey.replaceFirst("^" + FOLDER + "/", ""));
        Files.deleteIfExists(filePath);
    }
}
