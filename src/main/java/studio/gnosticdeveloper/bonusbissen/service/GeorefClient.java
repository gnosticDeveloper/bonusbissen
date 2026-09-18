package studio.gnosticdeveloper.bonusbissen.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import studio.gnosticdeveloper.bonusbissen.exception.BadRequestException;

/**
 * Validates a street address against the georef-ar API and derives its
 * "Localidad, Provincia" city. Disabled via {@code app.georef.enabled=false}
 * (tests): the address is then passed through untouched and city left null.
 */
@Component
public class GeorefClient {

    private static final Logger log = LoggerFactory.getLogger(GeorefClient.class);

    private final RestClient restClient;
    private final boolean enabled;

    public GeorefClient(
        @Value("${app.georef.base-url:https://apis.datos.gob.ar/georef/api}") String baseUrl,
        @Value("${app.georef.enabled:true}") boolean enabled
    ) {
        this.restClient = RestClient.create(baseUrl);
        this.enabled = enabled;
    }

    public ResolvedAddress resolve(String rawAddress) {
        if (rawAddress == null || rawAddress.isBlank()) {
            throw new BadRequestException("Un local físico necesita una dirección.");
        }
        String trimmed = rawAddress.trim();
        if (!enabled) {
            return new ResolvedAddress(trimmed, null);
        }

        GeorefResponse response;
        try {
            response = restClient
                .get()
                .uri(uri ->
                    uri.path("/direcciones")
                        .queryParam("direccion", trimmed)
                        .queryParam("campos", "calle.nombre,altura.valor,localidad_censal.nombre,provincia.nombre")
                        .queryParam("max", 1)
                        .build()
                )
                .retrieve()
                .body(GeorefResponse.class);
        } catch (RestClientException e) {
            log.warn("Georef call failed for address '{}'", trimmed, e);
            throw new BadRequestException("No pudimos validar esa dirección en este momento. Probá de nuevo en unos minutos.");
        }

        if (response == null || response.direcciones() == null || response.direcciones().isEmpty()) {
            throw new BadRequestException("No pudimos validar esa dirección. Revisá que la calle y la altura sean reales.");
        }

        return toResolvedAddress(response.direcciones().get(0), trimmed);
    }

    // Built from the response's structured fields (calle/altura for the street,
    // localidad_censal/provincia for the city) rather than `nomenclatura`: that
    // field embeds `departamento`, a coarser division than localidad_censal, so
    // using it here would make `address` disagree with the `city` we derive.
    private static ResolvedAddress toResolvedAddress(Direccion d, String fallbackAddress) {
        String street = d.calle() != null ? d.calle().nombre() : null;
        Integer number = d.altura() != null ? d.altura().valor() : null;
        String address = street != null ? (number != null ? street + " " + number : street) : fallbackAddress;

        String locality = d.localidadCensal() != null ? d.localidadCensal().nombre() : null;
        String province = d.provincia() != null ? d.provincia().nombre() : null;
        String city = locality != null && province != null ? locality + ", " + province : (province != null ? province : locality);

        return new ResolvedAddress(address, city);
    }

    public record ResolvedAddress(String address, String city) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeorefResponse(List<Direccion> direcciones) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Direccion(Calle calle, Altura altura, @JsonProperty("localidad_censal") NamedRef localidadCensal, NamedRef provincia) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Calle(String nombre) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Altura(Integer valor) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record NamedRef(String id, String nombre) {}
}
