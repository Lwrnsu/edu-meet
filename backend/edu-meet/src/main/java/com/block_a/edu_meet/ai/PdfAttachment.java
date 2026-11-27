package com.block_a.edu_meet.ai;

import java.nio.file.Path;

import org.springframework.stereotype.Component;

// Holds the PDF that came with the request currently being handled.
//
// Tools read the file from here instead of accepting a path from the model, so
// the model can only ever read a file the user actually uploaded - it cannot
// point the extractor at anything else on the host. The controller sets the
// attachment for the duration of one request and clears it in a finally block.
@Component
public class PdfAttachment {

    private final ThreadLocal<Path> current = new ThreadLocal<>();

    public void set(Path file) {
        current.set(file);
    }

    public Path get() {
        return current.get();
    }

    public void clear() {
        current.remove();
    }
}
