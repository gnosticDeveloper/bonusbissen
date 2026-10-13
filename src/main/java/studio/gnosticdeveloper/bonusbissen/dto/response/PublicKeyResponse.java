package studio.gnosticdeveloper.bonusbissen.dto.response;

/**
 * @param algorithm the JWT signing algorithm the key pairs with (JWS alg name).
 * @param format    the encoding of {@code publicKey} (X.509/SPKI DER, base64).
 * @param publicKey base64-encoded X.509/SPKI DER of the ECDSA verification key.
 */
public record PublicKeyResponse(
    String algorithm,
    String format,
    String publicKey
) {
    public static PublicKeyResponse of(String publicKeyBase64) {
        return new PublicKeyResponse("ES256", "X.509", publicKeyBase64);
    }
}
