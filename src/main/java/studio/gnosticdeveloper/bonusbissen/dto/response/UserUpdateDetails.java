package studio.gnosticdeveloper.bonusbissen.dto.response;

/** Name and email before and after; an email can be absent on either side. */
public record UserUpdateDetails(String previousName, String name, String previousEmail, String email) implements TraceabilityDetails {}
