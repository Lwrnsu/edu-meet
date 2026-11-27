package com.block_a.edu_meet.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@Configuration
public class PhpClassDatabaseConfiguration {

    @Bean("phpClassJdbcTemplate")
    JdbcTemplate phpClassJdbcTemplate(
            @Value("${app.php-class-database.url}") String url,
            @Value("${app.php-class-database.username}") String username,
            @Value("${app.php-class-database.password}") String password) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return new JdbcTemplate(dataSource);
    }
}
