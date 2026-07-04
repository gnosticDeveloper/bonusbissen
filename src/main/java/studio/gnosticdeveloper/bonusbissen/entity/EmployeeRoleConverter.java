package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class EmployeeRoleConverter implements AttributeConverter<EmployeeRole, String> {

    @Override
    public String convertToDatabaseColumn(EmployeeRole attribute) {
        return attribute == null ? null : attribute.dbValue();
    }

    @Override
    public EmployeeRole convertToEntityAttribute(String dbData) {
        return dbData == null ? null : EmployeeRole.fromDbValue(dbData);
    }
}
