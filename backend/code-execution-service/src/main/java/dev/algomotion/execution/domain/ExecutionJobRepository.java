package dev.algomotion.execution.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExecutionJobRepository extends JpaRepository<ExecutionJob, UUID> {
    long countByStatusIn(java.util.Collection<ExecutionJob.Status> statuses);
}
