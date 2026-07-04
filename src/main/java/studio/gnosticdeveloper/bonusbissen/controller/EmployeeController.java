package studio.gnosticdeveloper.bonusbissen.controller;

import studio.gnosticdeveloper.bonusbissen.dto.request.PasswordUpdateRequest;
import studio.gnosticdeveloper.bonusbissen.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PatchMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable UUID id, @Valid @RequestBody PasswordUpdateRequest request) {
        employeeService.resetPassword(id, request.newPassword());
    }
}
