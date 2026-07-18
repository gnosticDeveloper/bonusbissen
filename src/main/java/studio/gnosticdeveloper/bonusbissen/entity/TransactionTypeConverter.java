package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TransactionTypeConverter implements AttributeConverter<TransactionType, String> {

    @Override
    public String convertToDatabaseColumn(TransactionType attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public TransactionType convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        for (TransactionType t : TransactionType.values()) {
            if (t.getValue().equals(dbData)) return t;
        }
        throw new IllegalArgumentException("Valor desconocido para TransactionType: " + dbData);
    }
}