package studio.gnosticdeveloper.bonusbissen.service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

final class ImageMetadataStripper {

    private static final Logger log = LoggerFactory.getLogger(ImageMetadataStripper.class);

    private static final Set<String> PNG_METADATA_CHUNKS = Set.of("eXIf", "tEXt", "zTXt", "iTXt");
    private static final Set<String> WEBP_METADATA_CHUNKS = Set.of("EXIF", "XMP ");

    private ImageMetadataStripper() {}

    static byte[] strip(byte[] data, String extension) {
        try {
            return switch (extension) {
                case "jpg" -> stripJpeg(data);
                case "png" -> stripPng(data);
                case "webp" -> stripWebp(data);
                default -> data;
            };
        } catch (RuntimeException e) {
            log.warn("No se pudo limpiar metadata de la imagen, se conserva el archivo original", e);
            return data;
        }
    }

    private static byte[] stripJpeg(byte[] data) {
        if (data.length < 4 || (data[0] & 0xFF) != 0xFF || (data[1] & 0xFF) != 0xD8) return data;

        ByteArrayOutputStream out = new ByteArrayOutputStream(data.length);
        out.write(data[0]);
        out.write(data[1]);

        int i = 2;
        while (i + 1 < data.length) {
            if ((data[i] & 0xFF) != 0xFF) {
                out.write(data, i, data.length - i);
                return out.toByteArray();
            }

            int marker = data[i + 1] & 0xFF;

            if (marker == 0xD8 || marker == 0xD9 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                out.write(data, i, 2);
                i += 2;
                continue;
            }

            if (marker == 0xDA) {
                out.write(data, i, data.length - i);
                return out.toByteArray();
            }

            if (i + 3 >= data.length) {
                out.write(data, i, data.length - i);
                return out.toByteArray();
            }

            int length = ((data[i + 2] & 0xFF) << 8) | (data[i + 3] & 0xFF);
            if (length < 2 || i + 2 + length > data.length) {
                out.write(data, i, data.length - i);
                return out.toByteArray();
            }

            if (marker == 0xE1) {
                i += 2 + length;
                continue;
            }

            out.write(data, i, 2 + length);
            i += 2 + length;
        }

        return out.toByteArray();
    }

    private static byte[] stripPng(byte[] data) {
        byte[] signature = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };
        if (data.length < 8 || !matches(data, 0, signature)) return data;

        ByteArrayOutputStream out = new ByteArrayOutputStream(data.length);
        out.write(data, 0, 8);

        int i = 8;
        while (i + 8 <= data.length) {
            long length = readUint32BE(data, i);
            String type = new String(data, i + 4, 4, StandardCharsets.US_ASCII);
            int chunkTotalLength = 12 + (int) length;

            if (length < 0 || i + chunkTotalLength > data.length) {
                out.write(data, i, data.length - i);
                return out.toByteArray();
            }

            if (!PNG_METADATA_CHUNKS.contains(type)) {
                out.write(data, i, chunkTotalLength);
            }

            i += chunkTotalLength;
            if ("IEND".equals(type)) break;
        }

        return out.toByteArray();
    }

    private static byte[] stripWebp(byte[] data) {
        if (data.length < 12 || !matches(data, 0, "RIFF".getBytes(StandardCharsets.US_ASCII)) || !matches(data, 8, "WEBP".getBytes(StandardCharsets.US_ASCII))) {
            return data;
        }

        ByteArrayOutputStream chunks = new ByteArrayOutputStream(data.length);
        int i = 12;
        while (i + 8 <= data.length) {
            String fourCc = new String(data, i, 4, StandardCharsets.US_ASCII);
            long chunkSize = readUint32LE(data, i + 4);
            int padding = (chunkSize % 2 == 1) ? 1 : 0;
            long totalChunkLength = 8L + chunkSize + padding;

            if (chunkSize < 0 || i + totalChunkLength > data.length) {
                return data;
            }

            if (!WEBP_METADATA_CHUNKS.contains(fourCc)) {
                chunks.write(data, i, (int) totalChunkLength);
            }

            i += (int) totalChunkLength;
        }

        byte[] chunkBytes = chunks.toByteArray();
        long riffSize = 4L + chunkBytes.length;

        ByteArrayOutputStream out = new ByteArrayOutputStream(12 + chunkBytes.length);
        out.write("RIFF".getBytes(StandardCharsets.US_ASCII), 0, 4);
        out.write((int) (riffSize & 0xFF));
        out.write((int) ((riffSize >> 8) & 0xFF));
        out.write((int) ((riffSize >> 16) & 0xFF));
        out.write((int) ((riffSize >> 24) & 0xFF));
        out.write("WEBP".getBytes(StandardCharsets.US_ASCII), 0, 4);
        out.write(chunkBytes, 0, chunkBytes.length);

        return out.toByteArray();
    }

    private static boolean matches(byte[] data, int offset, byte[] expected) {
        if (offset + expected.length > data.length) return false;
        for (int j = 0; j < expected.length; j++) {
            if (data[offset + j] != expected[j]) return false;
        }
        return true;
    }

    private static long readUint32BE(byte[] data, int offset) {
        return ((data[offset] & 0xFFL) << 24) | ((data[offset + 1] & 0xFFL) << 16) | ((data[offset + 2] & 0xFFL) << 8) | (data[offset + 3] & 0xFFL);
    }

    private static long readUint32LE(byte[] data, int offset) {
        return (data[offset] & 0xFFL) | ((data[offset + 1] & 0xFFL) << 8) | ((data[offset + 2] & 0xFFL) << 16) | ((data[offset + 3] & 0xFFL) << 24);
    }
}
