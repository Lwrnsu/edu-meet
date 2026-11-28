package com.block_a.edu_meet.ai;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

// Records which knowledge-base articles a request actually used, so the reply
// can show them as sources without asking the model to cite anything.
@Component
public class SourceCollector {

    private static final int MAX_SOURCES = 3;

    private final ThreadLocal<Set<String>> current = ThreadLocal.withInitial(LinkedHashSet::new);

    public void add(String title) {
        if (title == null || title.isBlank()) {
            return;
        }
        Set<String> titles = current.get();
        if (titles.size() < MAX_SOURCES) {
            titles.add(title.trim());
        }
    }

    public List<String> get() {
        return List.copyOf(current.get());
    }

    public void clear() {
        current.remove();
    }
}
