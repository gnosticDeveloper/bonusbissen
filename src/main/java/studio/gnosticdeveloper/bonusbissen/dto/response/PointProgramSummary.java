package studio.gnosticdeveloper.bonusbissen.dto.response;

import java.util.UUID;
import studio.gnosticdeveloper.bonusbissen.entity.PointProgram;

public record PointProgramSummary(UUID id, String name, String unitLabel) {
    public static PointProgramSummary from(PointProgram program) {
        return new PointProgramSummary(program.getId(), program.getName(), program.getUnitLabel());
    }

    public static PointProgramSummary unknown(UUID id) {
        return new PointProgramSummary(id, null, null);
    }
}
