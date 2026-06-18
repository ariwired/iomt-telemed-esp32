package com.iomt.telemed;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class IomtTelemedApplication {

    public static void main(String[] args) {
        SpringApplication.run(IomtTelemedApplication.class, args);
        System.out.println("Servidor iniciado.");
    }
}