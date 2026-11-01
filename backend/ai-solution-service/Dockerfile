# AI solution service image: adds tesseract for image OCR of uploaded problems.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
COPY backend/shared-contracts backend/shared-contracts
COPY backend/test-support backend/test-support
COPY backend/ai-solution-service backend/ai-solution-service
RUN cd backend && for m in api-gateway user-progress-service algorithm-visualization-service problem-catalog-service code-execution-service; do \
      mkdir -p "$m" && printf '<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion><parent><groupId>dev.algomotion</groupId><artifactId>algomotion-backend</artifactId><version>0.1.0</version></parent><artifactId>%s</artifactId><packaging>pom</packaging></project>' "$m" > "$m/pom.xml"; done \
    && mvn -B -q -pl ai-solution-service -am -DskipTests package \
    && cp ai-solution-service/target/ai-solution-service-*.jar /app.jar

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng wget && addgroup -S app && adduser -S -G app app
COPY --from=build /app.jar /app/app.jar
USER app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Duser.timezone=UTC"
EXPOSE 8085
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 CMD wget -qO- http://localhost:8085/actuator/health/readiness || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
