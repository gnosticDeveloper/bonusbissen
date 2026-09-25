package studio.gnosticdeveloper.bonusbissen.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import studio.gnosticdeveloper.bonusbissen.dto.response.OrganizationOption;
import studio.gnosticdeveloper.bonusbissen.dto.response.PagedResponse;
import studio.gnosticdeveloper.bonusbissen.service.OrganizationService;

/** Public: dashboard sign-in picker, before there is any token. See also /organization (singular, authed). */
@RestController
@RequestMapping("/organizations")
public class PublicOrganizationController {

    private final OrganizationService organizationService;

    public PublicOrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }

    @GetMapping
    public PagedResponse<OrganizationOption> search(@RequestParam(required = false) String search, Pageable pageable) {
        return PagedResponse.from(organizationService.search(search, pageable).map(OrganizationOption::from));
    }
}
