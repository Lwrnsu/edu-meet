package com.block_a.edu_meet.dto;

import java.util.LinkedHashMap;
import java.util.Map;

public class SignupRequest {

	private String first_name;
	private String last_name;
	private String middle_name;
	private String suffix;
	private String email;
	private String password;
	private String confirm_password;
	private String school_name;
	private String location;
	private Boolean accepted_terms;

	public String getFirst_name() {
		return first_name;
	}

	public void setFirst_name(String first_name) {
		this.first_name = first_name;
	}

	public String getLast_name() {
		return last_name;
	}

	public void setLast_name(String last_name) {
		this.last_name = last_name;
	}

	public String getMiddle_name() {
		return middle_name;
	}

	public void setMiddle_name(String middle_name) {
		this.middle_name = middle_name;
	}

	public String getSuffix() {
		return suffix;
	}

	public void setSuffix(String suffix) {
		this.suffix = suffix;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getConfirm_password() {
		return confirm_password;
	}

	public void setConfirm_password(String confirm_password) {
		this.confirm_password = confirm_password;
	}

	public String getSchool_name() {
		return school_name;
	}

	public void setSchool_name(String school_name) {
		this.school_name = school_name;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public Boolean getAccepted_terms() {
		return accepted_terms;
	}

	public void setAccepted_terms(Boolean accepted_terms) {
		this.accepted_terms = accepted_terms;
	}

	public Map<String, Object> toPhpPayload() {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("first_name", first_name == null ? "" : first_name);
		payload.put("last_name", last_name == null ? "" : last_name);
		payload.put("middle_name", middle_name);
		payload.put("suffix", suffix);
		payload.put("email", email == null ? "" : email);
		payload.put("password", password == null ? "" : password);
		payload.put("confirm_password", confirm_password == null ? "" : confirm_password);
		payload.put("school_name", school_name == null ? "" : school_name);
		payload.put("location", location == null ? "" : location);
		payload.put("accepted_terms", Boolean.TRUE.equals(accepted_terms));
		return payload;
	}
}
