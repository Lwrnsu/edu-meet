package com.block_a.edu_meet.service;

import com.block_a.edu_meet.repository.PhpClassRepository;
import com.block_a.edu_meet.room.AuthorizedRoom;
import com.block_a.edu_meet.room.MeetingRole;
import com.block_a.edu_meet.room.RoomTarget;
import com.block_a.edu_meet.security.AuthenticatedUser;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.OptionalInt;
import java.util.List;

@Service
public class CanonicalClassAccessService {

    private final PhpClassRepository classRepository;

    public CanonicalClassAccessService(PhpClassRepository classRepository) {
        this.classRepository = classRepository;
    }

    public Optional<AuthorizedRoom> authorize(AuthenticatedUser user, int classId, int blockId) {
        Optional<RoomTarget> target = classRepository.findRoomTarget(classId, blockId);
        if (target.isEmpty()) {
            return Optional.empty();
        }

        RoomTarget roomTarget = target.get();
        int accountId = resolveClassAccountId(user);
        if (user.hasAnyRole("faculty", "professor") && roomTarget.facultyId() == accountId) {
            return Optional.of(new AuthorizedRoom(roomTarget, MeetingRole.FACULTY));
        }
        if (user.hasAnyRole("student")
                && classRepository.isStudentEnrolled(accountId, classId, blockId)) {
            return Optional.of(new AuthorizedRoom(roomTarget, MeetingRole.STUDENT));
        }
        if (user.hasAnyRole("dean", "college_dean")) {
            OptionalInt departmentId = classRepository.findDeanDepartmentId(accountId);
            if (departmentId.isPresent() && departmentId.getAsInt() == roomTarget.departmentId()) {
                return Optional.of(new AuthorizedRoom(roomTarget, MeetingRole.DEAN));
            }
        }
        return Optional.empty();
    }

    public Optional<RoomTarget> findRoomTarget(int classId, int blockId) {
        return classRepository.findRoomTarget(classId, blockId);
    }

    public List<RoomTarget> listRoomTargets(AuthenticatedUser user) {
        int accountId = resolveClassAccountId(user);
        if (user.hasAnyRole("faculty", "professor")) {
            return classRepository.findFacultyRoomTargets(accountId);
        }
        if (user.hasAnyRole("student")) {
            return classRepository.findStudentRoomTargets(accountId);
        }
        if (user.hasAnyRole("dean", "college_dean")) {
            return classRepository.findDeanRoomTargets(accountId);
        }
        return List.of();
    }

    public boolean isAssignedFaculty(AuthenticatedUser user, int classId, int blockId) {
        return user.hasAnyRole("faculty", "professor")
                && authorize(user, classId, blockId)
                        .map(authorizedRoom -> authorizedRoom.role() == MeetingRole.FACULTY)
                        .orElse(false);
    }

    public int resolveClassAccountId(AuthenticatedUser user) {
        OptionalInt accountId = classRepository.findAccountIdByEmail(user.email());
        return accountId.isPresent() && accountId.getAsInt() > 0
                ? accountId.getAsInt()
                : user.id();
    }
}
