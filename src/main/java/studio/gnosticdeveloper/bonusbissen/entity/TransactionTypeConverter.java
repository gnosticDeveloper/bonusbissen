package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class TransactionTypeConverter implements AttributeConverter<TransactionType, String> {

    @Override
    public String convertToDatabaseColumn(TransactionType attribute) {
        return attribute == null ? null : attribute.dbValue();
    }

    @Override
    public TransactionType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : TransactionType.fromDbValue(dbData);
    }
}
