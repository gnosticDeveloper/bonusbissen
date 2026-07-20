package studio.gnosticdeveloper.bonusbissen.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final PrincipalResolver principalResolver;

    public JwtAuthFilter(JwtService jwtService, PrincipalResolver principalResolver) {
        this.jwtService = jwtService;
        this.principalResolver = principalResolver;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        try {
            Claims claims = jwtService.parseClaims(token);
            UUID id = UUID.fromString(claims.getSubject());
            String role = claims.get("role", String.class);

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                principalResolver.resolve(id, role).ifPresent(principal -> {
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()));
                    var authToken = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                });
                // Si resolve() devuelve empty (el id no existe más, o active=false),
                // simplemente no se setea ninguna Authentication — el request
                // sigue como anónimo y cualquier endpoint protegido lo rechaza
                // más adelante en la cadena, sin necesidad de un throw acá.
            }
        } catch (JwtException | IllegalArgumentException e) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
