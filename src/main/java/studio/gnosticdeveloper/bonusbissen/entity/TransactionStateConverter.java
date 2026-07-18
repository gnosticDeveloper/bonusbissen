package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TransactionStateConverter implements AttributeConverter<TransactionState, String> {

    @Override
    public String convertToDatabaseColumn(TransactionState attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public TransactionState convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        for (TransactionState s : TransactionState.values()) {
            if (s.getValue().equals(dbData)) return s;
        }
        throw new IllegalArgumentException("Valor desconocido para TransactionState: " + dbData);
    }
}