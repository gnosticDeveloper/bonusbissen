package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BillingCycleConverter implements AttributeConverter<BillingCycle, String> {

    @Override
    public String convertToDatabaseColumn(BillingCycle attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public BillingCycle convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        for (BillingCycle c : BillingCycle.values()) {
            if (c.getValue().equals(dbData)) return c;
        }
        throw new IllegalArgumentException("Valor desconocido para BillingCycle: " + dbData);
    }
}
