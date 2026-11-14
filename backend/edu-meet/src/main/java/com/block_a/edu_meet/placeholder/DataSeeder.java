package com.block_a.edu_meet.placeholder;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.block_a.edu_meet.chat.Conversation;
import com.block_a.edu_meet.chat.ConversationRepository;
import com.block_a.edu_meet.chat.ConversationType;

@Component
public class DataSeeder implements CommandLineRunner {

       private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;

    public DataSeeder(UserRepository userRepository, ConversationRepository conversationRepository) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        List<String> names = List.of(
                "Shaun Anthony Bermil", "Charles Lorenz Cerico", "Johnrey Dalino Jr.",
                "Sam Gabriel Dayrit", "Jay Lawrence De Luna", "Latrell Justin Desmonte",
                "Aleyiyah Elisan", "Lois Grace Erolin", "Kelgin Theo Espina");

        List<User> users = new ArrayList<>();
        for (int i = 1; i <= 29; i++) {
            String name = i <= names.size() ? names.get(i - 1) : "Student " + i;
            String studentId = String.format("2024-%05d", i);
            users.add(new User(name, studentId, null));
        }

               List<User> saved = userRepository.saveAll(users);
        List<String> ids = saved.stream().map(User::getId).toList();

        conversationRepository.save(makeGroup(ConversationType.BLOCK, "BSCS 2A", ids));
        conversationRepository.save(makeGroup(ConversationType.SUBJECT, "BSCS 2A - Data Structures", ids.subList(0, 20)));
        conversationRepository.save(makeGroup(ConversationType.SUBJECT, "BSCS 2A - Web Development", ids.subList(5, 29)));
        conversationRepository.save(makeGroup(ConversationType.SUBJECT, "BSCS 2A - Discrete Math", ids.subList(0, 10)));

        conversationRepository.save(new Conversation(ConversationType.PRIVATE, null, List.of(ids.get(5), ids.get(3))));
        conversationRepository.save(new Conversation(ConversationType.PRIVATE, null, List.of(ids.get(5), ids.get(7))));
    }

        private Conversation makeGroup(ConversationType type, String name, List<String> participantIds) {
        return new Conversation(type, name, new ArrayList<>(participantIds));
    }
}