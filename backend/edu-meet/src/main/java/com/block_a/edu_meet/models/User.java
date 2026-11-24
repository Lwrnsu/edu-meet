package com.block_a.edu_meet.models;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record User(Long id, String email, String password,
                   String lastName, String firstName, String middleName, String extensionName) {}
