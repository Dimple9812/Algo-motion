# Multi-stage build for any AlgoMotion Spring Boot service.
#   docker build -f backend/Dockerfile --build-arg SERVICE=problem-catalog-service .
# Build context is the repository root (the catalog service packages /content/problems.json).
FROM maven:3.9-eclipse-temurin-21 AS build
ARG SERVICE
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
COPY backend/shared-contracts backend/shared-contracts
COPY backend/test-support backend/test-support
COPY backend/${SERVICE} backend/${SERVICE}
COPY content content
# Build only the requested module and its dependencies; the reactor pom lists all modules, so stub the others.
RUN cd backend && for m in api-gateway user-progress-service algorithm-visualization-service problem-catalog-service ai-solution-service code-execution-service; do \
      if [ ! -d "$m" ]; then mkdir -p "$m" && printf '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>dev.algomotion</groupId><artifactId>algomotion-backend</artifactId><version>0.1.0</version></parent><artifactId>%s</artifactId><packaging>pom</packaging></project>' "$m" > "$m/pom.xml"; fi; done \
    && mvn -B -q -pl ${SERVICE} -am -DskipTests package \
    && cp ${SERVICE}/target/${SERVICE}-*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S -G app app && apk add --no-cache wget
COPY --from=build /app.jar /app/app.jar
USER app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Duser.timezone=UTC"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 CMD wget -qO- http://localhost:${PORT:-8080}/actuator/health/readiness || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
