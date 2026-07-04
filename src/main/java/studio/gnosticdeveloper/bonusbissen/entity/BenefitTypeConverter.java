package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class BenefitTypeConverter implements AttributeConverter<BenefitType, String> {

    @Override
    public String convertToDatabaseColumn(BenefitType attribute) {
        return attribute == null ? null : attribute.dbValue();
    }

    @Override
    public BenefitType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : BenefitType.fromDbValue(dbData);
    }
}
