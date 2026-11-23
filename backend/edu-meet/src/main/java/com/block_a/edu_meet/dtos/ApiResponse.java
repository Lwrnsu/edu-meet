package com.block_a.edu_meet.dtos;

public record ApiResponse<T>(boolean response, int code, String message, T body) {
}
