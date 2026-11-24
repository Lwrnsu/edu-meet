package com.block_a.edu_meet.services;

import com.block_a.edu_meet.errors.ApiException;
import com.block_a.edu_meet.errors.DuplicateException;
import com.block_a.edu_meet.errors.NotFoundException;
import com.block_a.edu_meet.errors.PhpServiceException;
import com.block_a.edu_meet.errors.UnauthorizedException;
import com.block_a.edu_meet.errors.ValidationException;
import com.block_a.edu_meet.models.Dean;
import com.block_a.edu_meet.models.Department;
import com.block_a.edu_meet.models.Faculty;
import com.block_a.edu_meet.models.FacultyWithUser;
import com.block_a.edu_meet.models.LogInModel;
import com.block_a.edu_meet.models.LogInRequest;
import com.block_a.edu_meet.models.Program;
import com.block_a.edu_meet.models.ProgramChair;
import com.block_a.edu_meet.models.School;
import com.block_a.edu_meet.models.SchoolAdmin;
import com.block_a.edu_meet.models.SchoolSignUp;
import com.block_a.edu_meet.models.Student;
import com.block_a.edu_meet.models.StudentWithUser;
import com.block_a.edu_meet.models.SystemAdmin;
import com.block_a.edu_meet.models.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;

@Component
public final class AuthService {

    private static final Logger LOG = LoggerFactory.getLogger(AuthService.class);

    private static final String TOKEN_PREFIX = "auth:token:";
    private static final Duration TOKEN_TTL = Duration.ofHours(24);
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(5);

    private static final String ROLE_SCHOOL_ADMIN = "school_admin";
    private static final String ROLE_SYSTEM_ADMIN = "system_admin";

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(HTTP_TIMEOUT)
            .build();

    private static StringRedisTemplate redis;
    private static ObjectMapper mapper;
    private static String phpBaseUrl;

    public AuthService(StringRedisTemplate redisTemplate,
                       ObjectMapper objectMapper,
                       @Value("${php.api.base-url}") String baseUrl) {
        AuthService.redis = redisTemplate;
        AuthService.mapper = objectMapper;
        AuthService.phpBaseUrl = baseUrl;
    }

    public static LogInModel logIn(LogInRequest logInRequest) {
        if (!validCredentials(logInRequest)) return null;
        String email = logInRequest.getEmail().trim();

        try {
            JsonNode root = phpRequest("GET", "user?email=" + enc(email), null);
            JsonNode user = root.path("body");

            String dbEmail = user.path("email").asText("");
            String dbHash = user.path("password").asText(""); // BCrypt hash stored by PHP

            if (dbHash.isEmpty() || !dbEmail.equalsIgnoreCase(email)) return null;
            if (!ENCODER.matches(logInRequest.getPassword(), dbHash)) return null;

            return new LogInModel(user.path("id").asInt(), user.path("role").asText());
        } catch (ApiException e) {
            return null; // PHP said no (or is unreachable)
        } catch (Exception e) {
            LOG.warn("Login failed: {}", e.getMessage());
            return null;
        }
    }

    public static LogInModel schoolAdminLogIn(LogInRequest logInRequest) {
        if (!validCredentials(logInRequest)) return null;
        String email = logInRequest.getEmail().trim();

        try {
            SchoolAdmin admin = read("schooladmin?email=" + enc(email), SchoolAdmin.class);

            if (admin.id() == null || isBlank(admin.passwordHash())) return null;
            if (admin.email() == null || !admin.email().equalsIgnoreCase(email)) return null;
            if (!ENCODER.matches(logInRequest.getPassword(), admin.passwordHash())) return null;

            return new LogInModel(admin.id().intValue(), ROLE_SCHOOL_ADMIN);
        } catch (ApiException e) {
            return null;
        } catch (Exception e) {
            LOG.warn("School admin login failed: {}", e.getMessage());
            return null;
        }
    }

    public static LogInModel systemAdminLogIn(LogInRequest logInRequest) {
        if (!validCredentials(logInRequest)) return null;
        String email = logInRequest.getEmail().trim();

        try {
            SystemAdmin admin = read("systemadmin?email=" + enc(email), SystemAdmin.class);

            if (isBlank(admin.passwordHash())) return null;
            if (admin.email() == null || !admin.email().equalsIgnoreCase(email)) return null;
            if (!ENCODER.matches(logInRequest.getPassword(), admin.passwordHash())) return null;

            return new LogInModel(0, ROLE_SYSTEM_ADMIN);
        } catch (ApiException e) {
            return null;
        } catch (Exception e) {
            LOG.warn("System admin login failed: {}", e.getMessage());
            return null;
        }
    }

    public static String createAuthToken(LogInModel logInModel) {
        try {
            String value = mapper.writeValueAsString(logInModel);

            while (true) {
                String token = generateToken();
                Boolean stored = redis.opsForValue()
                        .setIfAbsent(TOKEN_PREFIX + token, value, TOKEN_TTL);
                if (Boolean.TRUE.equals(stored)) {
                    return token;
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Unable to create auth token", e);
        }
    }

    public static LogInModel logIn(String authorizationToken) {
        String token = stripBearer(authorizationToken);
        if (token == null) return null;

        try {
            String value = redis.opsForValue().get(TOKEN_PREFIX + token);
            if (value == null) return null;
            return mapper.readValue(value, LogInModel.class);
        } catch (Exception e) {
            LOG.warn("Cached login failed: {}", e.getMessage());
            return null;
        }
    }

    public static void logOut(String authorizationToken) {
        String token = stripBearer(authorizationToken);
        if (token == null) {
            throw new UnauthorizedException("Authorization token is required.");
        }
        redis.delete(TOKEN_PREFIX + token);
    }

    public static void signUp(SchoolSignUp schoolSignUp) {
        require(schoolSignUp != null, "Request body is required.");
        require(validEmail(schoolSignUp.email()), "A valid email is required.");
        require(!isBlank(schoolSignUp.password()), "Password is required.");
        require(!isBlank(schoolSignUp.schoolName()), "School name is required.");
        require(!isBlank(schoolSignUp.address()), "Address is required.");

        SchoolSignUp payload = new SchoolSignUp(
                schoolSignUp.email().trim(),
                ENCODER.encode(schoolSignUp.password()),
                schoolSignUp.schoolName().trim(),
                schoolSignUp.address().trim());

        send("POST", "school/signup", payload, "A school or admin with this email already exists.");
    }

    public static void updateSchool(School school) {
        require(school != null && school.id() != null, "School ID is required.");
        require(!isBlank(school.name()), "School name is required.");
        require(!isBlank(school.address()), "Address is required.");
        send("PUT", "school", school, "A school with this name already exists.");
    }

    public static void approveSchool(School school) {
        require(school != null && school.id() != null, "School ID is required.");
        School payload = new School(school.id(), school.name(), school.address(), true);
        phpRequest("PUT", "school/approve", payload);
    }

    public static void updateSchoolAdminPassword(SchoolAdmin admin) {
        require(admin != null && admin.id() != null, "School admin ID is required.");
        require(!isBlank(admin.passwordHash()), "New password is required.");

        SchoolAdmin payload = new SchoolAdmin(
                admin.id(), admin.email(), ENCODER.encode(admin.passwordHash()), admin.schoolId());
        phpRequest("PUT", "schooladmin/password", payload);
    }

    public static void updateSystemAdminPassword(SystemAdmin admin) {
        require(admin != null && validEmail(admin.email()), "A valid email is required.");
        require(!isBlank(admin.passwordHash()), "New password is required.");

        SystemAdmin payload = new SystemAdmin(admin.email().trim(), ENCODER.encode(admin.passwordHash()));
        phpRequest("PUT", "systemadmin/password", payload);
    }

    public static void createDepartment(Department department) {
        require(department != null, "Request body is required.");
        require(!isBlank(department.name()) && !isBlank(department.abbv()), "Department name and abbreviation are required.");
        require(department.schoolId() != null, "School ID is required.");
        send("POST", "department", department, "This department already exists.");
    }

    public static void createProgram(Program program) {
        require(program != null, "Request body is required.");
        require(!isBlank(program.name()) && !isBlank(program.abbv()), "Program name and abbreviation are required.");
        require(program.departmentId() != null, "Department ID is required.");
        send("POST", "program", program, "This program already exists.");
    }

    public static void updateDepartment(Department department) {
        require(department != null && department.id() != null, "Department ID is required.");
        require(!isBlank(department.name()), "Department name is required.");
        send("PUT", "department", department, "This department already exists.");
    }

    public static void updateProgram(Program program) {
        require(program != null && program.id() != null, "Program ID is required.");
        require(!isBlank(program.name()), "Program name is required.");
        send("PUT", "program", program, "This program already exists.");
    }

    public static void createUser(User user, Student student) {
        validateUser(user, true);
        require(student != null, "Student data is required.");
        validateStudent(student);
        send("POST", "student", new StudentWithUser(forPhp(user), student),
                "A student with this email or student number already exists.");
    }

    public static void createUser(User user, Faculty faculty) {
        validateUser(user, true);
        require(faculty != null, "Faculty data is required.");
        validateFaculty(faculty);
        send("POST", "faculty", new FacultyWithUser(forPhp(user), faculty),
                "A faculty member with this email or employee number already exists.");
    }

    public static void updateUser(User user, Student student) {
        require(user != null && user.id() != null, "User ID is required.");
        validateUser(user, false);
        require(student != null, "Student data is required.");
        validateStudent(student);

        Student synced = new Student(user.id(), student.studentNumber(), student.programId(), student.status());
        send("PUT", "student", new StudentWithUser(forPhp(user), synced),
                "A student with this email or student number already exists.");
    }

    public static void updateUser(User user, Faculty faculty) {
        require(user != null && user.id() != null, "User ID is required.");
        validateUser(user, false);
        require(faculty != null, "Faculty data is required.");
        validateFaculty(faculty);

        Faculty synced = new Faculty(user.id(), faculty.employeeNumber(), faculty.departmentId(), faculty.isActive());
        send("PUT", "faculty", new FacultyWithUser(forPhp(user), synced),
                "A faculty member with this email or employee number already exists.");
    }

    public static void createProgramChair(ProgramChair programChair) {
        validateProgramChair(programChair);
        send("POST", "programchair", programChair, "This faculty member is already a program chair.");
    }

    public static void updateProgramChair(ProgramChair programChair) {
        validateProgramChair(programChair);
        send("PUT", "programchair", programChair, "This program already has a program chair.");
    }

    public static void createDean(Dean dean) {
        validateDean(dean);
        send("POST", "dean", dean, "This faculty member is already a dean.");
    }

    public static void updateDean(Dean dean) {
        validateDean(dean);
        send("PUT", "dean", dean, "This school already has a dean.");
    }

    public static void deleteStudent(Long userId) {
        require(userId != null, "User ID is required.");
        phpRequest("DELETE", "student?userId=" + userId, null);
    }

    public static void deleteFaculty(Long userId) {
        require(userId != null, "User ID is required.");
        phpRequest("DELETE", "faculty?userId=" + userId, null);
    }

    public static void deleteProgramChair(Long facultyUserId) {
        require(facultyUserId != null, "Faculty user ID is required.");
        phpRequest("DELETE", "programchair?facultyUserId=" + facultyUserId, null);
    }

    public static void deleteDean(Long facultyUserId) {
        require(facultyUserId != null, "Faculty user ID is required.");
        phpRequest("DELETE", "dean?facultyUserId=" + facultyUserId, null);
    }

    public static User getUser(Long id) {
        require(id != null, "User ID is required.");
        return withoutPassword(read("user/by-id?id=" + id, User.class));
    }

    public static StudentWithUser getStudent(Long userId) {
        require(userId != null, "User ID is required.");
        StudentWithUser result = read("student?userId=" + userId, StudentWithUser.class);
        return new StudentWithUser(withoutPassword(result.user()), result.student());
    }

    public static FacultyWithUser getFaculty(Long userId) {
        require(userId != null, "User ID is required.");
        FacultyWithUser result = read("faculty?userId=" + userId, FacultyWithUser.class);
        return new FacultyWithUser(withoutPassword(result.user()), result.faculty());
    }

    public static ProgramChair getProgramChair(Long facultyUserId) {
        require(facultyUserId != null, "Faculty user ID is required.");
        return read("programchair?facultyUserId=" + facultyUserId, ProgramChair.class);
    }

    public static Dean getDean(Long facultyUserId) {
        require(facultyUserId != null, "Faculty user ID is required.");
        return read("dean?facultyUserId=" + facultyUserId, Dean.class);
    }

    private static JsonNode phpRequest(String method, String resource, Object body) {
        try {
            String url = phpBaseUrl + "/api/php/" + method.toLowerCase(Locale.ROOT) + "/" + resource;

            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .timeout(HTTP_TIMEOUT)
                    .header("Accept", "application/json");

            if (body == null) {
                builder.method(method, HttpRequest.BodyPublishers.noBody());
            } else {
                builder.header("Content-Type", "application/json")
                        .method(method, HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            }

            HttpResponse<String> response = HTTP.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            JsonNode root = mapper.readTree(response.body());
            String message = root.path("message").asText("Request failed.");

            if (code < 400 && root.path("status").asBoolean(false)) {
                return root;
            }
            if (code == 409 || message.toLowerCase(Locale.ROOT).contains("duplicate")) {
                throw new DuplicateException(message);
            }
            if (code == 404) {
                throw new NotFoundException(message);
            }
            if (code >= 500) {
                LOG.warn("PHP service error {} on {} {}", code, method, resource);
                throw new PhpServiceException("The PHP service returned an error.");
            }
            throw new ValidationException(message);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PhpServiceException("Request to the PHP service was interrupted.", e);
        } catch (IOException e) {
            throw new PhpServiceException("Could not reach the PHP service.", e);
        }
    }

    private static void send(String method, String resource, Object payload, String duplicateMessage) {
        try {
            phpRequest(method, resource, payload);
        } catch (DuplicateException e) {
            throw new DuplicateException(duplicateMessage);
        }
    }

    private static <T> T read(String resource, Class<T> type) {
        JsonNode body = phpRequest("GET", resource, null).path("body");
        if (body.isMissingNode() || body.isNull()) {
            throw new NotFoundException("Record not found.");
        }
        try {
            return mapper.treeToValue(body, type);
        } catch (JsonProcessingException e) {
            throw new PhpServiceException("Unexpected response from the PHP service.", e);
        }
    }

    private static void validateUser(User user, boolean passwordRequired) {
        require(user != null, "User data is required.");
        require(validEmail(user.email()), "A valid email is required.");
        if (passwordRequired) {
            require(!isBlank(user.password()), "Password is required.");
        }
        require(!isBlank(user.lastName()), "Last name is required.");
        require(!isBlank(user.firstName()), "First name is required.");
    }

    private static User forPhp(User user) {
        String hash = isBlank(user.password()) ? null : ENCODER.encode(user.password());
        return new User(user.id(), user.email().trim(), hash,
                user.lastName(), user.firstName(), user.middleName(), user.extensionName());
    }

    private static User withoutPassword(User user) {
        if (user == null) return null;
        return new User(user.id(), user.email(), null,
                user.lastName(), user.firstName(), user.middleName(), user.extensionName());
    }

    private static void validateStudent(Student student) {
        require(!isBlank(student.studentNumber()), "Student number is required.");
        require(student.programId() != null, "Program ID is required.");
        require(!isBlank(student.status()), "Status is required.");
    }

    private static void validateFaculty(Faculty faculty) {
        require(!isBlank(faculty.employeeNumber()), "Employee number is required.");
        require(faculty.departmentId() != null, "Department ID is required.");
    }

    private static void validateProgramChair(ProgramChair programChair) {
        require(programChair != null, "Request body is required.");
        require(programChair.facultyUserId() != null, "Faculty user ID is required.");
        require(programChair.programId() != null, "Program ID is required.");
    }

    private static void validateDean(Dean dean) {
        require(dean != null, "Request body is required.");
        require(dean.facultyUserId() != null, "Faculty user ID is required.");
        require(dean.schoolId() != null, "School ID is required.");
    }

    private static boolean validCredentials(LogInRequest request) {
        return request != null && validEmail(request.getEmail()) && !isBlank(request.getPassword());
    }

    private static boolean validEmail(String email) {
        return !isBlank(email) && email.contains("@");
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new ValidationException(message);
    }

    private static String stripBearer(String authorizationToken) {
        if (isBlank(authorizationToken)) return null;
        String token = authorizationToken.trim();
        if (token.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = token.substring(7).trim();
        }
        return token.isEmpty() ? null : token;
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}