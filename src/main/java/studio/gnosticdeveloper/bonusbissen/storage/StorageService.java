package studio.gnosticdeveloper.bonusbissen.storage;

import java.io.IOException;

public interface StorageService {

    String store(byte[] data, String extension) throws IOException;

    void delete(String storageKey) throws IOException;
}
