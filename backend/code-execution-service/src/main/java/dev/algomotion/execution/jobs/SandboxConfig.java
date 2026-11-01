package dev.algomotion.execution.jobs;

import dev.algomotion.execution.ExecutionProperties;
import dev.algomotion.execution.sandbox.DockerSandbox;
import dev.algomotion.execution.sandbox.LocalProcessSandbox;
import dev.algomotion.execution.sandbox.Sandbox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class SandboxConfig {
    private static final Logger log = LoggerFactory.getLogger(SandboxConfig.class);

    @Bean
    Sandbox sandbox(ExecutionProperties p) {
        if ("local".equals(p.sandbox())) {
            log.warn("EXECUTION_SANDBOX=local — submissions run as plain child processes WITHOUT filesystem/network isolation. Development only.");
            return new LocalProcessSandbox(p);
        }
        return new DockerSandbox(p);
    }
}
