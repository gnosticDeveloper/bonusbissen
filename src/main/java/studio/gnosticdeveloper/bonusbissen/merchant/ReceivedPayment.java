package studio.gnosticdeveloper.bonusbissen.merchant;

import java.util.UUID;

/** An authenticated notification: which integration it belongs to and the paid order it describes. */
public record ReceivedPayment(UUID integrationId, PaidOrder order) {}
