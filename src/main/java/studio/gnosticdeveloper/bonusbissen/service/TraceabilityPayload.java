package studio.gnosticdeveloper.bonusbissen.service;

import java.util.HashMap;
import java.util.Map;

/** Builds an audit payload from alternating keys and values, leaving out null values ({@code Map.copyOf} rejects them). */
final class TraceabilityPayload {

    private TraceabilityPayload() {}

    static Map<String, Object> of(Object... keysAndValues) {
        if (keysAndValues.length % 2 != 0) {
            throw new IllegalArgumentException("Payload needs key/value pairs.");
        }
        Map<String, Object> payload = new HashMap<>();
        for (int i = 0; i < keysAndValues.length; i += 2) {
            if (keysAndValues[i + 1] != null) {
                payload.put((String) keysAndValues[i], keysAndValues[i + 1]);
            }
        }
        return payload;
    }
}
