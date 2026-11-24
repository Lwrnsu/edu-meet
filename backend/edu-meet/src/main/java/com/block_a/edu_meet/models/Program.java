package com.block_a.edu_meet.models;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Program(Long id, String name, String abbv, Long departmentId) {}
