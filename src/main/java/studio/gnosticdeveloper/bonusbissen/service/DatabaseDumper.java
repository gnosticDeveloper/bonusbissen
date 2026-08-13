package studio.gnosticdeveloper.bonusbissen.service;

import java.io.IOException;
import java.nio.file.Path;

public interface DatabaseDumper {

    /**
     * Dumps the database to a temporary file and returns its path.
     * Caller owns the returned file and is responsible for deleting it.
     */
    Path dump() throws IOException, InterruptedException;
}
