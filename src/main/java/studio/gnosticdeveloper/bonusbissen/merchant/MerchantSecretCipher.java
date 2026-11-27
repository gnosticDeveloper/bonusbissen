package studio.gnosticdeveloper.bonusbissen.merchant;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * AES-256-GCM for merchant signing secrets at rest. Stored as base64(iv || ciphertext+tag).
 * The key is {@code app.merchant.encryption-key}: base64 of 32 random bytes
 * ({@code openssl rand -base64 32}). Unset fails closed -- creating or verifying anything
 * throws -- same posture as the Mercado Pago webhook secret.
 */
@Component
public class MerchantSecretCipher {

    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final String encodedKey;
    private final SecureRandom random = new SecureRandom();

    public MerchantSecretCipher(@Value("${app.merchant.encryption-key}") String encodedKey) {
        this.encodedKey = encodedKey;
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt merchant secret", e);
        }
    }

    public String decrypt(String stored) {
        try {
            byte[] all = Base64.getDecoder().decode(stored);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, all, 0, IV_BYTES));
            return new String(cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Could not decrypt merchant secret", e);
        }
    }

    private SecretKeySpec key() {
        if ("unset".equals(encodedKey)) {
            throw new IllegalStateException("app.merchant.encryption-key is not configured");
        }
        byte[] bytes = Base64.getDecoder().decode(encodedKey);
        if (bytes.length != 32) {
            throw new IllegalStateException("app.merchant.encryption-key must be 32 bytes (base64)");
        }
        return new SecretKeySpec(bytes, "AES");
    }
}
