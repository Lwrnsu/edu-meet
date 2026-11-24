package com.block_a.edu_meet.models;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Faculty(Long userId, String employeeNumber, Long departmentId,
                      @JsonProperty("isActive") boolean isActive) {}
