FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline
COPY src/ src/
RUN mvn -B package -DskipTests

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN apk add --no-cache postgresql16-client \
    && addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /var/lib/bonusbissen/uploads/rewards /var/lib/bonusbissen/uploads/pfp \
        /var/lib/bonusbissen/uploads/logos /var/lib/bonusbissen/uploads/banners \
    && chown -R spring:spring /var/lib/bonusbissen
USER spring
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
