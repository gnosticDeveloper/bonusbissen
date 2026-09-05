package studio.gnosticdeveloper.bonusbissen;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BonusbissenApplication {

    public static void main(String[] args) {
        SpringApplication.run(BonusbissenApplication.class, args);
    }

}
