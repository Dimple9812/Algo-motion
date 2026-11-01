# Code execution service image. It needs the Docker CLI to launch one throwaway sandbox container per submission.
# The sandbox containers themselves get NO Docker socket, NO network and NO secrets (see DockerSandbox.java).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
COPY backend/shared-contracts backend/shared-contracts
COPY backend/test-support backend/test-support
COPY backend/code-execution-service backend/code-execution-service
RUN cd backend && for m in api-gateway user-progress-service algorithm-visualization-service problem-catalog-service ai-solution-service; do \
      mkdir -p "$m" && printf '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>dev.algomotion</groupId><artifactId>algomotion-backend</artifactId><version>0.1.0</version></parent><artifactId>%s</artifactId><packaging>pom</packaging></project>' "$m" > "$m/pom.xml"; done \
    && mvn -B -q -pl code-execution-service -am -DskipTests package \
    && cp code-execution-service/target/code-execution-service-*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache docker-cli wget
COPY --from=build /app.jar /app/app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Duser.timezone=UTC"
EXPOSE 8086
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 CMD wget -qO- http://localhost:8086/actuator/health/readiness || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
