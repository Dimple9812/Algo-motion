package dev.algomotion.execution;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("execution")
public record ExecutionProperties(String sandbox, String dockerImage, String catalogUrl, int maxConcurrent, long compileTimeoutMs,
                                  long testTimeoutMs, int memoryMb, int maxOutputBytes, int maxSourceBytes, int maxTests, String workDir) {}
