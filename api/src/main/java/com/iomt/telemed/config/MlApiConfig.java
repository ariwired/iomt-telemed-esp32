package com.iomt.telemed.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class MlApiConfig {

    @Value("${ml.api.url}")
    private String mlApiUrl;

    @Bean
    public RestClient mlApiRestClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(2000);
        requestFactory.setReadTimeout(3000);

        return RestClient.builder()
                .baseUrl(mlApiUrl)
                .requestFactory(requestFactory)
                .build();
    }
}