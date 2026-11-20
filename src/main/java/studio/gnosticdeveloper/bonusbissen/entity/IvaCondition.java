package studio.gnosticdeveloper.bonusbissen.entity;

import lombok.Getter;

/** AFIP IVA condition, used only to print the right wording on an invoice -- not validated against AFIP itself. */
@Getter
public enum IvaCondition {
    RESPONSABLE_INSCRIPTO("responsable_inscripto", "Responsable Inscripto"),
    MONOTRIBUTO("monotributo", "Monotributo"),
    EXENTO("exento", "Exento"),
    CONSUMIDOR_FINAL("consumidor_final", "Consumidor Final");

    private final String value;
    private final String spanishLabel;

    IvaCondition(String value, String spanishLabel) {
        this.value = value;
        this.spanishLabel = spanishLabel;
    }
}
