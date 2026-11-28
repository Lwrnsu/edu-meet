package com.block_a.edu_meet;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class QuizDatabaseConnectionCheck implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public QuizDatabaseConnectionCheck(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {

        String database = jdbcTemplate.queryForObject(
            "SELECT DATABASE()",
            String.class
        );

        String user = jdbcTemplate.queryForObject(
            "SELECT CURRENT_USER()",
            String.class
        );

        System.out.println(
            "MYSQL_DB_CONNECTION_OK: " + database +
            " | USER: " + user
        );
    }
}