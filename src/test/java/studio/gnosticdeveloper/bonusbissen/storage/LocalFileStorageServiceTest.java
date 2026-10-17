package studio.gnosticdeveloper.bonusbissen.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

class LocalFileStorageServiceTest {

    @TempDir Path uploadsDir;

    @Test
    void storesAndDeletesImagesInTheirOwnFolders() throws Exception {
        LocalFileStorageService storage = storage();
        byte[] image = {1, 2, 3};

        for (StorageFolder folder : StorageFolder.values()) {
            String key = storage.store(image, "png", folder);
            assertThat(key).startsWith(folder.path() + "/");
            assertThat(Files.readAllBytes(uploadsDir.resolve(key))).isEqualTo(image);
            assertThat(storage.resolveUrl(key, DeliveryVariant.THUMBNAIL)).isEqualTo("https://example.com/" + key);
            storage.delete(key);
            assertThat(uploadsDir.resolve(key)).doesNotExist();
        }
    }

    @Test
    void defaultStoreAndExistingRewardKeysStayInRewards() throws Exception {
        LocalFileStorageService storage = storage();
        String key = storage.store(new byte[] {4}, "jpg");
        assertThat(key).startsWith("rewards/");
        assertThat(uploadsDir.resolve(key)).exists();
        storage.delete(key);
        assertThat(uploadsDir.resolve(key)).doesNotExist();
    }

    @Test
    void rejectsKeysOutsideTheImageFolders() throws Exception {
        LocalFileStorageService storage = storage();
        for (String key : new String[] {"../other.jpg", "other/file.png", "pfp/../other.png", "pfp/nested/file.png"}) {
            assertThatThrownBy(() -> storage.delete(key)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    private LocalFileStorageService storage() {
        LocalFileStorageService storage = new LocalFileStorageService();
        ReflectionTestUtils.setField(storage, "uploadsDir", uploadsDir.toString());
        ReflectionTestUtils.setField(storage, "assetsUrl", "https://example.com/");
        return storage;
    }
}
