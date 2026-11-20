package studio.gnosticdeveloper.bonusbissen.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class PaymentStatusConverter implements AttributeConverter<PaymentStatus, String> {

    @Override
    public String convertToDatabaseColumn(PaymentStatus attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public PaymentStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        for (PaymentStatus s : PaymentStatus.values()) {
            if (s.getValue().equals(dbData)) return s;
        }
        throw new IllegalArgumentException("Valor desconocido para PaymentStatus: " + dbData);
    }
}
