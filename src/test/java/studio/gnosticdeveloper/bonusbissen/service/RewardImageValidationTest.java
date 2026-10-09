package studio.gnosticdeveloper.bonusbissen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RewardImageValidationTest {

    private static final String FIXTURES_CLASSPATH = "fixtures/reward-images/";

    @Mock
    private RewardRepository rewardRepository;

    @Mock
    private PointProgramRepository pointProgramRepository;

    @Mock
    private StorefrontRepository storefrontRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private RewardService rewardService;

    @Captor
    private ArgumentCaptor<byte[]> dataCaptor;

    @Captor
    private ArgumentCaptor<String> extensionCaptor;

    private PointProgram program;

    @BeforeEach
    void setUp() throws IOException {
        UUID organizationId = UUID.randomUUID();
        Organization organization = new Organization();
        organization.setId(organizationId);
        program = new PointProgram();
        program.setId(UUID.randomUUID());
        program.setOrganization(organization);

        when(pointProgramRepository.findByIdAndOrganizationId(program.getId(), organizationId)).thenReturn(Optional.of(program));
        when(rewardRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(storageService.store(any(byte[].class), anyString())).thenAnswer(invocation -> "rewards/" + UUID.randomUUID());
    }

    private MockMultipartFile loadFixture(String filename, String contentType) throws IOException {
        String resourcePath = FIXTURES_CLASSPATH + filename;
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
            if (in == null) throw new IOException("Fixture no encontrada en el classpath: " + resourcePath);
            return new MockMultipartFile("image", filename, contentType, in.readAllBytes());
        }
    }

    private void expectAccepted(String filename, String contentType) throws IOException {
        var image = loadFixture(filename, contentType);
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        var reward = rewardService.create(request, program.getOrganization().getId());
        assertThat(reward.getImagePath()).as(filename + " should have been accepted and stored").isNotNull();
        assertThat(reward.getImageUploadError()).as(filename + " should not report an upload error").isNull();
    }

    private void expectRejected(String filename, String contentType, String expectedMessageFragment) throws IOException {
        var image = loadFixture(filename, contentType);
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        var reward = rewardService.create(request, program.getOrganization().getId());

        assertThat(reward.getImagePath()).as(filename + " should have been created without an image").isNull();
        assertThat(reward.getImageUploadError())
            .as(filename + " should report the specific reason the image was rejected")
            .isNotNull()
            .contains(expectedMessageFragment);
    }

    @Test
    void acceptsLandscapeJpeg4x3() throws IOException {
        expectAccepted("valid_4x3.jpg", "image/jpeg");
    }

    @Test
    void acceptsLandscapeJpeg16x9() throws IOException {
        expectAccepted("valid_16x9.jpg", "image/jpeg");
    }

    @Test
    void acceptsSquarePngAndPassesPngFormatToStorage() throws IOException {
        var image = loadFixture("valid_square.png", "image/png");
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        rewardService.create(request, program.getOrganization().getId());

        verify(storageService).store(any(byte[].class), extensionCaptor.capture());
        assertThat(extensionCaptor.getValue()).isEqualTo("png");
    }

    @Test
    void acceptsWebpAndPassesWebpFormatToStorage() throws IOException {
        var image = loadFixture("valid_webp.webp", "image/webp");
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        rewardService.create(request, program.getOrganization().getId());

        verify(storageService).store(any(byte[].class), extensionCaptor.capture());
        assertThat(extensionCaptor.getValue()).isEqualTo("webp");
    }

    @Test
    void rejectsPortraitImage() throws IOException {
        expectRejected("invalid_portrait.jpg", "image/jpeg", "relación de aspecto");
    }

    @Test
    void rejectsUltrawideImage() throws IOException {
        expectRejected("invalid_ultrawide.jpg", "image/jpeg", "relación de aspecto");
    }

    @Test
    void rejectsImageAboveMaxDimension() throws IOException {
        expectRejected("invalid_toolarge.jpg", "image/jpeg", "4000px");
    }

    @Test
    void rejectsFileAboveByteSizeCap() throws IOException {
        expectRejected("invalid_toobig_bytes.jpg", "image/jpeg", "2MB");
    }

    @Test
    void rejectsDecompressionBombWithoutHangingOrCrashing() throws IOException {
        long start = System.currentTimeMillis();
        expectRejected("bomb_attempt.png", "image/png", "4000px");
        long elapsedMs = System.currentTimeMillis() - start;
        assertThat(elapsedMs).as("dimension check should reject via header read, not a full decode").isLessThan(2000);
    }

    @Test
    void rejectsUnsupportedContentType() throws IOException {
        expectRejected("valid_4x3.jpg", "application/pdf", "Tipo de archivo");
    }

    @Test
    void rejectsAnimatedWebp() throws IOException {
        expectRejected("animated.webp", "image/webp", "animadas");
    }

    @Test
    void createStillSavesRewardAndReportsErrorWhenStorageFails() throws IOException {
        when(storageService.store(any(byte[].class), anyString())).thenThrow(new IOException("Cloudinary timeout"));

        var image = loadFixture("valid_4x3.jpg", "image/jpeg");
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        var reward = rewardService.create(request, program.getOrganization().getId());

        assertThat(reward.getImagePath()).as("reward should be created without an image, not rejected").isNull();
        assertThat(reward.getImageUploadError())
            .as("the caller should be told the upload failed, even though the reward still saved")
            .isNotNull();
    }

    private static boolean containsAscii(byte[] data, String needle) {
        return new String(data, StandardCharsets.ISO_8859_1).contains(needle);
    }

    private static void assertColorCloseTo(int actualRgb, java.awt.Color expected, int tolerance) {
        java.awt.Color actual = new java.awt.Color(actualRgb);
        assertThat(Math.abs(actual.getRed() - expected.getRed())).isLessThanOrEqualTo(tolerance);
        assertThat(Math.abs(actual.getGreen() - expected.getGreen())).isLessThanOrEqualTo(tolerance);
        assertThat(Math.abs(actual.getBlue() - expected.getBlue())).isLessThanOrEqualTo(tolerance);
    }

    @Test
    void stripsGpsExifFromJpegWithoutAlteringPixels() throws IOException {
        var image = loadFixture("exif_jpeg.jpg", "image/jpeg");
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        rewardService.create(request, program.getOrganization().getId());

        verify(storageService).store(dataCaptor.capture(), anyString());
        byte[] stored = dataCaptor.getValue();
        assertThat(containsAscii(stored, "Exif")).as("Exif marker should be gone from stored JPEG").isFalse();

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(stored));
        assertThat(decoded.getWidth()).isEqualTo(800);
        assertThat(decoded.getHeight()).isEqualTo(600);
        assertColorCloseTo(decoded.getRGB(400, 300), new java.awt.Color(120, 60, 200), 3);
    }

    @Test
    void stripsExifFromPngWithoutAlteringPixels() throws IOException {
        var image = loadFixture("exif_png.png", "image/png");
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        rewardService.create(request, program.getOrganization().getId());

        verify(storageService).store(dataCaptor.capture(), anyString());
        byte[] stored = dataCaptor.getValue();
        assertThat(containsAscii(stored, "eXIf")).as("eXIf chunk should be gone from stored PNG").isFalse();

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(stored));
        assertThat(decoded.getWidth()).isEqualTo(1000);
        assertThat(decoded.getHeight()).isEqualTo(1000);
        assertThat(decoded.getRGB(500, 500) & 0xFFFFFF).isEqualTo(new java.awt.Color(10, 200, 10).getRGB() & 0xFFFFFF);
    }

    @Test
    void stripsExifFromWebpWithoutAlteringPixels() throws IOException {
        var image = loadFixture("exif_webp.webp", "image/webp");
        var request = new RewardCreateRequest("Test", "desc", image, 10, null, program.getId());
        rewardService.create(request, program.getOrganization().getId());

        verify(storageService).store(dataCaptor.capture(), anyString());
        byte[] stored = dataCaptor.getValue();
        assertThat(containsAscii(stored, "EXIF")).as("EXIF chunk should be gone from stored WebP").isFalse();

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(stored));
        assertThat(decoded.getWidth()).isEqualTo(800);
        assertThat(decoded.getHeight()).isEqualTo(600);
        assertColorCloseTo(decoded.getRGB(400, 300), new java.awt.Color(200, 10, 10), 3);
    }
}
