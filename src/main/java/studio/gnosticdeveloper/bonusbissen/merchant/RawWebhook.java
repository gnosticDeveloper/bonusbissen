package studio.gnosticdeveloper.bonusbissen.merchant;

import org.springframework.http.HttpHeaders;

/** An inbound notification as received: the exact body (signatures cover raw bytes) plus headers. */
public record RawWebhook(String body, HttpHeaders headers) {}
