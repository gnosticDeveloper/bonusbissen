package studio.gnosticdeveloper.bonusbissen.service;

import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;
import studio.gnosticdeveloper.bonusbissen.storage.StorageFolder;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@Service
public class AccountImageService {

    private static final Logger log = LoggerFactory.getLogger(AccountImageService.class);
    private static final long MAX_BYTES = 2 * 1024 * 1024;
    private static final int MAX_DIMENSION_PX = 4000;
    private static final Map<String, String> FORMATS = Map.of(
        "image/jpeg", "jpg", "image/jpg", "jpg", "image/png", "png", "image/webp", "webp"
    );

    private final StorageService storageService;

    public AccountImageService(StorageService storageService) {
        this.storageService = storageService;
    }

    public String store(MultipartFile file, StorageFolder folder) {
        if (file == null || file.isEmpty()) {
            throw invalid("Seleccioná una imagen para subir.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw invalid("La imagen supera el tamaño máximo de 2MB.");
        }
        String format = FORMATS.get(file.getContentType());
        if (format == null) {
            throw invalid("Usá una imagen WEBP, JPG, JPEG o PNG.");
        }
        String filename = file.getOriginalFilename();
        int dot = filename == null ? -1 : filename.lastIndexOf('.');
        if (dot < 1 || dot == filename.length() - 1) {
            throw invalid("La imagen debe tener extensión .webp, .jpg, .jpeg o .png.");
        }
        String filenameFormat = switch (filename.substring(dot + 1).toLowerCase(Locale.ROOT)) {
            case "jpg", "jpeg" -> "jpg";
            case "png" -> "png";
            case "webp" -> "webp";
            default -> throw invalid("La imagen debe tener extensión .webp, .jpg, .jpeg o .png.");
        };
        if (!format.equals(filenameFormat)) {
            throw invalid("La extensión de la imagen no coincide con su tipo de archivo.");
        }

        byte[] data;
        try {
            data = file.getBytes();
            if (data.length > MAX_BYTES) throw invalid("La imagen supera el tamaño máximo de 2MB.");
            try (ImageInputStream input = ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(data))) {
                if (input == null) throw invalid("No se pudo leer la imagen.");
                Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw invalid("No se pudo leer la imagen.");
                ImageReader reader = readers.next();
                try {
                    String detected = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!(format.equals(detected) || (format.equals("jpg") && detected.equals("jpeg")))) {
                        throw invalid("El contenido de la imagen no coincide con el formato indicado.");
                    }
                    reader.setInput(input);
                    if (reader.getNumImages(true) > 1) throw invalid("No se permiten imágenes animadas.");
                    if (reader.getWidth(0) > MAX_DIMENSION_PX || reader.getHeight(0) > MAX_DIMENSION_PX) {
                        throw invalid("La imagen no puede superar los 4000px de ancho o alto.");
                    }
                    reader.read(0);
                } finally {
                    reader.dispose();
                }
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof BadRequestException badRequest) throw badRequest;
            log.info("No se pudo decodificar la imagen", e);
            throw invalid("No se pudo leer la imagen. Probá con otro archivo.");
        }

        try {
            return storageService.store(ImageMetadataStripper.strip(data, format), format, folder);
        } catch (IOException e) {
            log.warn("No se pudo subir la imagen", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "No se pudo subir la imagen. Probá de nuevo en unos minutos.");
        }
    }

    public void deleteOld(String path) {
        if (path == null) return;
        try {
            storageService.delete(path);
        } catch (IOException e) {
            log.warn("No se pudo borrar la imagen anterior", e);
        }
    }

    private static BadRequestException invalid(String message) {
        return new BadRequestException(message, message);
    }
}
