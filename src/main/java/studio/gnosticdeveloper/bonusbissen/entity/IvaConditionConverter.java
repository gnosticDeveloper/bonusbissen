package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class IvaConditionConverter implements AttributeConverter<IvaCondition, String> {

    @Override
    public String convertToDatabaseColumn(IvaCondition attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public IvaCondition convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        for (IvaCondition c : IvaCondition.values()) {
            if (c.getValue().equals(dbData)) return c;
        }
        throw new IllegalArgumentException("Valor desconocido para IvaCondition: " + dbData);
    }
}
