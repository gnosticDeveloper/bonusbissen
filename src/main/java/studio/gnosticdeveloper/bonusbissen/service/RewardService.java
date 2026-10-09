package studio.gnosticdeveloper.bonusbissen.service;

import java.io.IOException;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardCreateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.request.RewardUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.dto.response.TopRewardResponse;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;
import studio.gnosticdeveloper.bonusbissen.entity.Reward;
import studio.gnosticdeveloper.bonusbissen.entity.Storefront;
import studio.gnosticdeveloper.bonusbissen.exception.NotFoundException;
import studio.gnosticdeveloper.bonusbissen.repository.PointProgramRepository;
import studio.gnosticdeveloper.bonusbissen.repository.RewardRepository;
import studio.gnosticdeveloper.bonusbissen.repository.StorefrontRepository;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

@Service
public class RewardService {

    private static final Logger log = LoggerFactory.getLogger(RewardService.class);

    private final RewardRepository rewardRepository;
    private final PointProgramRepository pointProgramRepository;
    private final StorefrontRepository storefrontRepository;
    private final StorageService storageService;

    private static final long MAX_BYTES = 2 * 1024 * 1024; // 2MB

    private static final Map<String, String> EXTENSIONS_BY_TYPE = Map.of(
        "image/jpeg", "jpg",
        "image/jpg", "jpg",
        "image/png", "png",
        "image/webp", "webp"
    );

    private static final double MIN_ASPECT_RATIO = 1.0; // cuadrada
    private static final double MAX_ASPECT_RATIO = 2.0; // panorámica (ej. 16:9)

    private static final int MAX_DIMENSION_PX = 4000;

    public RewardService(
        RewardRepository rewardRepository,
        PointProgramRepository pointProgramRepository,
        StorefrontRepository storefrontRepository,
        StorageService storageService
    ) {
        this.rewardRepository = rewardRepository;
        this.pointProgramRepository = pointProgramRepository;
        this.storefrontRepository = storefrontRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public Page<Reward> listActive(String search, UUID organizationId, UUID programId, UUID storefrontId, Pageable pageable) {
        String term = search == null || search.isBlank() ? null : search.trim();

        // La query nativa trae su propio ORDER BY fijo; un Pageable con Sort
        // rompe en runtime contra queries nativas (InvalidJpaQueryMethodException),
        // así que solo dejamos pasar page/size y descartamos el sort del cliente.
        Pageable safePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());

        if (storefrontId != null) {
            Storefront sf = storefrontRepository.findById(storefrontId).orElse(null);
            PointProgram program = sf != null ? sf.getPointProgram() : null;

            if (program == null) return Page.empty(safePageable);

            return rewardRepository.findByActiveTrue(term, null, program.getId(), safePageable);
        }

        return rewardRepository.findByActiveTrue(term, organizationId, programId, safePageable);
    }

    @Transactional(readOnly = true)
    public Reward findById(UUID id) {
        return rewardRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("Reward not found: " + id, "No pudimos encontrar la recompensa seleccionada."));
    }

    @Transactional(readOnly = true)
    public List<TopRewardResponse> getTopRewards(UUID organizationId) {
        Pageable topTen = PageRequest.of(0, 10);
        return rewardRepository.getTopRewards(organizationId, topTen);
    }

    @Transactional
    public Reward create(RewardCreateRequest request, UUID organizationId) {
        String imagePath = null;
        String imageError = null;

        if (request.image() != null && !request.image().isEmpty()) {
            try {
                imagePath = saveImage(request.image());
            } catch (IllegalArgumentException | IOException e) {
                // La imagen no es un campo obligatorio: la recompensa se crea
                // igual, sin imagen. Se avisa en la respuesta, con el motivo
                // específico, para que el admin sepa qué pasó y si tiene sentido
                // reintentar.
                log.warn("No se pudo guardar la imagen de la recompensa", e);
                imageError = describeImageFailure(e);
            }
        }

        PointProgram program = pointProgramRepository
            .findByIdAndOrganizationId(request.pointProgramId(), organizationId)
            .orElseThrow(() ->
                new NotFoundException(
                    "No se pudo encontrar el programa de puntos con ID " + request.pointProgramId() + ".",
                    "Parece que el programa de puntos seleccionado no existe o no es válido."
                )
            );

        Reward reward = new Reward();
        reward.setPointProgram(program);
        reward.setTitle(request.title());
        reward.setDescription(request.description());
        reward.setCostPoints(request.costPoints());
        reward.setDiscountValue(request.discountValue());
        reward.setImagePath(imagePath);
        reward = rewardRepository.save(reward);
        reward.setImageUploadError(imageError);
        return reward;
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        Reward reward = rewardRepository
            .findById(id)
            .orElseThrow(() ->
                new NotFoundException("No se encontró la recompensa con id: " + id, "No pudimos encontrar la recompensa seleccionada.")
            );
        requireOwnership(reward, organizationId);
        reward.setActive(false);
        rewardRepository.save(reward);
    }

    private void requireOwnership(Reward reward, UUID organizationId) {
        if (!reward.getPointProgram().getOrganization().getId().equals(organizationId)) {
            throw new AccessDeniedException("No podés modificar recompensas de otra organización.");
        }
    }

    private String describeImageFailure(Exception e) {
        if (e instanceof IllegalArgumentException) {
            // Falló alguna de nuestras propias validaciones (tipo no permitido,
            // tamaño, relación de aspecto, dimensión máxima, archivo corrupto,
            // animación) -- el mensaje de la excepción ya es específico y seguro
            // de mostrar tal cual.
            return e.getMessage();
        }

        // No es un problema del archivo: no se pudo llegar a Cloudinary (red,
        // timeout, caído). No depende de lo que el admin suba, tiene sentido
        // sugerir reintentar más tarde en vez de pedir otro archivo.
        return "No se pudo subir la imagen a Cloudinary. Probá de nuevo en unos minutos.";
    }

    private String saveImage(MultipartFile file) throws IOException {
        String extension = EXTENSIONS_BY_TYPE.get(file.getContentType());
        if (extension == null) {
            throw new IllegalArgumentException("Tipo de archivo no permitido.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("La imagen supera el tamaño máximo de 2MB.");
        }

        int[] dimensions = readDimensions(file);
        int width = dimensions[0];
        int height = dimensions[1];

        if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
            throw new IllegalArgumentException("La imagen no puede superar los " + MAX_DIMENSION_PX + "px de ancho o alto.");
        }

        double ratio = (double) width / height;
        if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
            throw new IllegalArgumentException("La imagen debe tener una relación de aspecto entre 1:1 y 2:1 (horizontal).");
        }

        byte[] cleaned = ImageMetadataStripper.strip(file.getBytes(), extension);
        return storageService.store(cleaned, extension);
    }

    @Transactional
    public Reward update(UUID id, RewardUpdateRequest request, UUID organizationId) {
        Reward reward = rewardRepository
            .findById(id)
            .orElseThrow(() -> new NotFoundException("Reward not found: " + id, "No pudimos encontrar la recompensa seleccionada."));
        requireOwnership(reward, organizationId);

        reward.setTitle(request.title());
        reward.setDescription(request.description());
        reward.setCostPoints(request.costPoints());
        reward.setDiscountValue(request.discountValue());

        String oldImagePath = reward.getImagePath();
        String imageError = null;

        if (request.image() != null && !request.image().isEmpty()) {
            // Caso 2: imagen nueva. Guardamos primero, actualizamos la fila
            // después, borramos la vieja al final, en ese orden, para nunca
            // quedarnos sin ninguna imagen válida si algo falla a mitad de camino.
            try {
                String newImagePath = saveImage(request.image());
                reward.setImagePath(newImagePath);
                reward = rewardRepository.save(reward);
                deleteImageFile(oldImagePath);
            } catch (IllegalArgumentException | IOException e) {
                // Mismo criterio que en el alta: si la imagen no se pudo guardar,
                // la app sigue funcionando con el resto de los campos actualizados,
                // conservando la imagen anterior.
                log.warn("No se pudo guardar la imagen de la recompensa", e);
                imageError = describeImageFailure(e);
                if (oldImagePath != null) {
                    imageError += " Se conservó la imagen anterior.";
                }
                reward = rewardRepository.save(reward);
            }
        } else if (Boolean.TRUE.equals(request.removeImage())) {
            // Caso 3: sacar imagen sin poner otra.
            reward.setImagePath(null);
            reward = rewardRepository.save(reward);
            deleteImageFile(oldImagePath);
        } else {
            // Caso 1: no tocar la imagen. Ni un solo I/O de archivos acá.
            reward = rewardRepository.save(reward);
        }

        reward.setImageUploadError(imageError);
        return reward;
    }

    private int[] readDimensions(MultipartFile file) throws IOException {
        try (ImageInputStream iis = ImageIO.createImageInputStream(file.getInputStream())) {
            if (iis == null) {
                throw new IllegalArgumentException("No se pudo leer la imagen.");
            }

            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("No se pudo leer la imagen.");
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(iis);
                if (reader.getNumImages(true) > 1) {
                    throw new IllegalArgumentException("No se permiten imágenes animadas.");
                }

                return new int[] { reader.getWidth(0), reader.getHeight(0) };
            } finally {
                reader.dispose();
            }
        }
    }

    private void deleteImageFile(String imagePath) {
        if (imagePath == null) return;
        try {
            storageService.delete(imagePath);
        } catch (IOException e) {
            // No relanzamos: si la imagen vieja no se pudo borrar en Cloudinary,
            // queda huérfana ahí, molesto pero no corrompe datos. La fila de la
            // base ya quedó correcta en cualquiera de los dos casos que llaman
            // a este método.
            log.warn("Error al borrar la imagen anterior", e);
        }
    }
}
