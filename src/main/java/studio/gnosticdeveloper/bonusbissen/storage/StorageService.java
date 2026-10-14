package studio.gnosticdeveloper.bonusbissen.storage;

import java.io.IOException;

public interface StorageService {

    default String store(byte[] data, String extension) throws IOException {
        return store(data, extension, StorageFolder.REWARDS);
    }

    String store(byte[] data, String extension, StorageFolder folder) throws IOException;

    void delete(String storageKey) throws IOException;

    String resolveUrl(String storageKey, DeliveryVariant variant);
}
