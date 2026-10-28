package com.block_a.edu_meet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.web.bind.annotation.*;;

@RestController 
@SpringBootApplication
public class EduMeetApplication {

	@RequestMapping("/")
	public String home() {
		return "Hi po!";
	}

	public static void main(String[] args) {
		SpringApplication.run(EduMeetApplication.class, args);
	}

}
