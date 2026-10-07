package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class OperationTypeConverter implements AttributeConverter<OperationType, String> {

    @Override
    public String convertToDatabaseColumn(OperationType attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public OperationType convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        for (OperationType t : OperationType.values()) {
            if (t.getValue().equals(dbData)) return t;
        }
        throw new IllegalArgumentException("Valor desconocido para OperationType: " + dbData);
    }
}
