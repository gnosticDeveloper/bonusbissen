FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline
COPY src/ src/
RUN mvn -B package -DskipTests

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
# postgresql16-client provides pg_dump, matching the postgres:16-alpine server
# in docker-compose.yml, used by DatabaseBackupService for nightly backups.
RUN apk add --no-cache postgresql16-client \
    && addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /var/lib/bonusbissen/uploads/rewards \
    && chown -R spring:spring /var/lib/bonusbissen
USER spring
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
