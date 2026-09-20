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
 * Validates a street address against the georef-ar API, scoped by the
 * caller-supplied city and province.
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

    public ResolvedAddress resolve(String rawAddress, String rawCity, String rawProvince) {
        if (rawAddress == null || rawAddress.isBlank()) {
            throw new BadRequestException("Un local físico necesita una dirección.");
        }
        if (rawProvince == null || rawProvince.isBlank()) {
            throw new BadRequestException("Un local físico necesita una provincia.");
        }
        if (rawCity == null || rawCity.isBlank()) {
            throw new BadRequestException("Un local físico necesita una ciudad.");
        }
        String address = rawAddress.trim();
        String province = rawProvince.trim();
        String city = rawCity.trim();

        if (!enabled) {
            return new ResolvedAddress(address, city, province);
        }

        GeorefResponse response;
        try {
            response = restClient
                .get()
                .uri(uri ->
                    uri.path("/direcciones")
                        .queryParam("direccion", address)
                        .queryParam("provincia", province)
                        .queryParam("localidad", city)
                        .queryParam("campos", "calle.nombre,altura.valor,localidad_censal.nombre,provincia.nombre")
                        .queryParam("max", 1)
                        .build()
                )
                .retrieve()
                .body(GeorefResponse.class);
        } catch (RestClientException e) {
            log.warn("Georef call failed for address '{}, {}, {}'", address, city, province, e);
            throw new BadRequestException("No pudimos validar esa dirección en este momento. Probá de nuevo en unos minutos.");
        }

        if (response == null || response.direcciones() == null || response.direcciones().isEmpty()) {
            log.warn("Georef found no match for address '{}, {}, {}'", address, city, province);
            throw new BadRequestException("No pudimos validar esa dirección. Revisá que la calle, la altura, la ciudad y la provincia sean reales.");
        }

        return toResolvedAddress(response.direcciones().get(0), address, city, province);
    }

    private static ResolvedAddress toResolvedAddress(Direccion d, String fallbackAddress, String fallbackCity, String fallbackProvince) {
        String street = d.calle() != null ? d.calle().nombre() : null;
        Integer number = d.altura() != null ? d.altura().valor() : null;
        String address = street != null ? (number != null ? street + " " + number : street) : fallbackAddress;

        String locality = d.localidadCensal() != null ? d.localidadCensal().nombre() : fallbackCity;
        String province = d.provincia() != null ? d.provincia().nombre() : fallbackProvince;

        return new ResolvedAddress(address, locality, province);
    }

    public record ResolvedAddress(String address, String city, String province) {}

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
