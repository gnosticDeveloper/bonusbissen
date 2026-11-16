package studio.gnosticdeveloper.bonusbissen.merchant;

import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;

/**
 * A third-party business's own server notifying us of a paid order. Authenticated by
 * {@code X-BB-Signature} = hex HMAC-SHA256(secret, timestamp + "." + rawBody), with the
 * integration found by {@code X-BB-Key-Id}. Unknown key, revoked key, stale timestamp and bad
 * signature are indistinguishable to the caller.
 */
@Component
public class SignedMerchantSource implements PaymentEventSource {

    public static final String KEY = "merchant";

    /** Wire format of this source's body; deliberately not the internal {@link PaidOrder}. */
    record Payload(String orderId, String identifier, BigDecimal amount, String currency) {}

    private final MerchantIntegrationRepository integrationRepository;
    private final MerchantSecretCipher cipher;
    private final MerchantSignatureVerifier verifier;
    private final ObjectMapper objectMapper;

    public SignedMerchantSource(
        MerchantIntegrationRepository integrationRepository,
        MerchantSecretCipher cipher,
        MerchantSignatureVerifier verifier,
        ObjectMapper objectMapper
    ) {
        this.integrationRepository = integrationRepository;
        this.cipher = cipher;
        this.verifier = verifier;
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return KEY;
    }

    @Override
    public Optional<ReceivedPayment> receive(RawWebhook raw) {
        String keyId = raw.headers().getFirst("X-BB-Key-Id");
        MerchantIntegration integration = keyId == null
            ? null
            : integrationRepository.findByKeyIdAndActiveTrueAndProvider(keyId.trim(), KEY).orElse(null);
        if (integration == null) {
            throw new WebhookRejectedException("Unknown or revoked key id " + keyId);
        }
        boolean authentic = verifier.verify(
            cipher.decrypt(integration.getCredentialsEncrypted()),
            raw.headers().getFirst("X-BB-Timestamp"),
            raw.headers().getFirst("X-BB-Signature"),
            raw.body()
        );
        if (!authentic) {
            throw new WebhookRejectedException("Bad signature or timestamp for integration " + integration.getId());
        }

        Payload payload;
        try {
            payload = objectMapper.readValue(raw.body(), Payload.class);
        } catch (JacksonException e) {
            throw new BadRequestException("Unparseable merchant webhook body from integration " + integration.getId() + ".", "El cuerpo de la solicitud no es válido.");
        }
        return Optional.of(new ReceivedPayment(
            integration.getId(),
            new PaidOrder(payload.orderId(), payload.identifier(), payload.amount(), payload.currency())
        ));
    }
}
