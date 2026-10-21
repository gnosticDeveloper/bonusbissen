package studio.gnosticdeveloper.bonusbissen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.storage.StorageFolder;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@ExtendWith(MockitoExtension.class)
class AccountImageServiceTest {
    @Mock StorageService storage;

    private MockMultipartFile fixture(String filename, String type) throws IOException {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("fixtures/reward-images/" + filename)) {
            return new MockMultipartFile("image", filename, type, in.readAllBytes());
        }
    }

    private MockMultipartFile renamedFixture(String fixture, String filename, String contentType) throws IOException {
        return new MockMultipartFile("image", filename, contentType, fixture(fixture, contentType).getBytes());
    }

    @Test
    void acceptsSupportedFormatsAndStripsJpegMetadata() throws IOException {
        AccountImageService images = new AccountImageService(storage);
        for (String[] item : new String[][] {
            {"exif_jpeg.jpg", "image/jpeg", "jpg"}, {"valid_4x3.jpg", "image/jpg", "jpg"},
            {"valid_square.png", "image/png", "png"}, {"valid_webp.webp", "image/webp", "webp"}
        }) {
            when(storage.store(any(byte[].class), eq(item[2]), eq(StorageFolder.PFP))).thenReturn("pfp/test");
            assertThat(images.store(fixture(item[0], item[1]), StorageFolder.PFP)).isEqualTo("pfp/test");
        }
        ArgumentCaptor<byte[]> data = ArgumentCaptor.forClass(byte[].class);
        verify(storage, times(2)).store(data.capture(), eq("jpg"), eq(StorageFolder.PFP));
        assertThat(new String(data.getAllValues().getFirst(), java.nio.charset.StandardCharsets.ISO_8859_1)).doesNotContain("Exif");
    }

    @Test
    void rejectsOversizeUnsupportedAndSpoofedImagesWithoutStoring() throws IOException {
        AccountImageService images = new AccountImageService(storage);
        assertThatThrownBy(() -> images.store(new MockMultipartFile("image", "big.png", "image/png", new byte[2 * 1024 * 1024 + 1]), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("2MB");
        assertThatThrownBy(() -> images.store(fixture("valid_square.png", "image/gif"), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("WEBP");
        assertThatThrownBy(() -> images.store(fixture("valid_square.png", "image/jpeg"), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("no coincide");
        assertThatThrownBy(() -> images.store(new MockMultipartFile("image", "fake.jpg", "image/jpeg", "not an image".getBytes()), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("leer la imagen");
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void allowsJpegExtensionAndCaseInsensitiveSuffix() throws IOException {
        when(storage.store(any(), eq("jpg"), eq(StorageFolder.PFP))).thenReturn("pfp/jpeg");
        AccountImageService images = new AccountImageService(storage);
        assertThat(images.store(renamedFixture("valid_4x3.jpg", "photo.JPEG", "image/jpg"), StorageFolder.PFP)).isEqualTo("pfp/jpeg");
        verify(storage).store(any(), eq("jpg"), eq(StorageFolder.PFP));
    }

    @Test
    void rejectsDisallowedMissingOrMismatchedFilenameExtensions() throws IOException {
        AccountImageService images = new AccountImageService(storage);
        for (String filename : new String[] {"photo.gif", "photo.exe", "photo", "photo.", ".jpg", ""}) {
            assertThatThrownBy(() -> images.store(renamedFixture("valid_4x3.jpg", filename, "image/jpeg"), StorageFolder.PFP))
                .as("filename: " + filename)
                .isInstanceOf(BadRequestException.class).hasMessageContaining("extensión");
        }
        assertThatThrownBy(() -> images.store(renamedFixture("valid_4x3.jpg", null, "image/jpeg"), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("extensión");
        assertThatThrownBy(() -> images.store(renamedFixture("valid_4x3.jpg", "photo.png", "image/jpeg"), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("no coincide");
        assertThatThrownBy(() -> images.store(renamedFixture("valid_square.png", "photo.jpg", "image/png"), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("no coincide");
        assertThatThrownBy(() -> images.store(renamedFixture("valid_webp.webp", "photo.jpeg", "image/webp"), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("no coincide");
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void rejectsMalformedDataEvenWhenExtensionAndMimeAgree() throws IOException {
        AccountImageService images = new AccountImageService(storage);
        assertThatThrownBy(() -> images.store(new MockMultipartFile("image", "broken.jpeg", "image/jpeg", new byte[] {1, 2, 3, 4}), StorageFolder.PFP))
            .isInstanceOf(BadRequestException.class).hasMessageContaining("leer la imagen");
        verify(storage, never()).store(any(), any(), any());
    }

    @Test
    void storageFailureReturnsFriendlyError() throws IOException {
        when(storage.store(any(), eq("png"), eq(StorageFolder.PFP))).thenThrow(new IOException("secret credentials"));
        assertThatThrownBy(() -> new AccountImageService(storage).store(fixture("valid_square.png", "image/png"), StorageFolder.PFP))
            .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Probá de nuevo").hasMessageNotContaining("secret credentials");
    }
}
