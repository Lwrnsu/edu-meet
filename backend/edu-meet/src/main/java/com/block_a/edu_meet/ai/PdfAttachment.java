package com.block_a.edu_meet.ai;

import java.nio.file.Path;
import java.util.List;

import org.springframework.stereotype.Component;

// Holds the PDFs that came with the request currently being handled.
//
// Tools read the files from here instead of accepting paths from the model, so
// the model can only ever read files the user actually uploaded - it cannot
// point the extractor at anything else on the host. The controller sets the
// attachments for the duration of one request and clears them in a finally block.
@Component
public class PdfAttachment {

    private final ThreadLocal<List<Path>> current = new ThreadLocal<>();

    public void set(Path file) {
        current.set(List.of(file));
    }

    public void set(List<Path> files) {
        current.set(List.copyOf(files));
    }

    public List<Path> get() {
        List<Path> files = current.get();
        return files == null ? List.of() : files;
    }

    public void clear() {
        current.remove();
    }
}
