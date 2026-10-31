package studio.gnosticdeveloper.bonusbissen.dto.response;

import studio.gnosticdeveloper.bonusbissen.entity.Organization;
import studio.gnosticdeveloper.bonusbissen.storage.DeliveryVariant;
import studio.gnosticdeveloper.bonusbissen.storage.StorageService;

public record OrganizationResponse(
    String name,
    String logoUrl,
    String bannerUrl,
    String fiscalName,
    String taxId,
    String fiscalAddress,
    String ivaCondition,
    String billingEmail,
    String billingPlanName,
    String billingCycle,
    java.time.OffsetDateTime nextInvoiceDueAt,
    /** Mercado Pago preapproval status (pending/authorized/paused/cancelled), null if checkout was never started. */
    String mercadoPagoSubscriptionStatus
) {
    public static OrganizationResponse from(Organization organization, StorageService storage) {
        return new OrganizationResponse(
            organization.getName(),
            organization.getLogoPath() == null ? null : storage.resolveUrl(organization.getLogoPath(), DeliveryVariant.THUMBNAIL),
            organization.getBannerPath() == null ? null : storage.resolveUrl(organization.getBannerPath(), DeliveryVariant.CARD),
            organization.getFiscalName(),
            organization.getTaxId(),
            organization.getFiscalAddress(),
            organization.getIvaCondition() == null ? null : organization.getIvaCondition().getValue(),
            organization.getBillingEmail(),
            organization.getBillingPlan() == null ? null : organization.getBillingPlan().getName(),
            organization.getBillingCycle() == null ? null : organization.getBillingCycle().getValue(),
            organization.getNextInvoiceDueAt(),
            organization.getMercadoPagoPreapprovalStatus()
        );
    }
}
