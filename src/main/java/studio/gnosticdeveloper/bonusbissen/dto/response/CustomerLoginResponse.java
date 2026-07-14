package studio.gnosticdeveloper.bonusbissen.dto.response;

public record CustomerLoginResponse(String token, String phone, String name, int points) {}
