package studio.gnosticdeveloper.bonusbissen.dto.request;

import jakarta.validation.constraints.Email;

/**
 * Fiscal/billing data an org supplies about itself. Does not include plan
 * assignment -- that's set directly against the database (see 9__billing.sql).
 */
public record OrganizationBillingInfoRequest(
    String fiscalName,
    String taxId,
    String fiscalAddress,
    String ivaCondition,
    @Email String billingEmail
) {}
