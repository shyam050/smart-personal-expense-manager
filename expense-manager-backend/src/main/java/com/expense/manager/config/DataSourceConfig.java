package com.expense.manager.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Render injects DATABASE_URL in the form:
 *   postgres://username:password@host:port/dbname
 * but the PostgreSQL JDBC driver needs:
 *   jdbc:postgresql://host:port/dbname  (+ username/password passed separately)
 *
 * This config parses the raw URL once at startup so you only ever need to
 * paste Render's "Internal Database URL" as a single environment variable.
 */
@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Value("${app.database-url}")
    private String rawDatabaseUrl;

    @Bean
    public DataSource dataSource() {
        URI dbUri = URI.create(rawDatabaseUrl);

        String userInfo = dbUri.getUserInfo();
        String username = userInfo.split(":")[0];
        String password = userInfo.split(":")[1];

        String jdbcUrl = "jdbc:postgresql://" + dbUri.getHost() + ":" + dbUri.getPort() + dbUri.getPath();

        return DataSourceBuilder.create()
                .url(jdbcUrl)
                .username(username)
                .password(password)
                .driverClassName("org.postgresql.Driver")
                .build();
    }
}
