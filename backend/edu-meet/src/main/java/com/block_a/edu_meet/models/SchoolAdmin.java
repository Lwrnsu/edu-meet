package com.block_a.edu_meet.models;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SchoolAdmin(Long id, String email, String passwordHash, Long schoolId) {}