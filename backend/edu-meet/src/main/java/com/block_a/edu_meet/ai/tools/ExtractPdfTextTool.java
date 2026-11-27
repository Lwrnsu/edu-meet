package com.block_a.edu_meet.ai.tools;

import com.block_a.edu_meet.ai.PdfAttachment;
import com.block_a.edu_meet.ai.PdfTextService;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.util.Map;

@Component
public class ExtractPdfTextTool implements Tool {

    private final PdfTextService pdfTextService;
    private final PdfAttachment attachment;

    public ExtractPdfTextTool(PdfTextService pdfTextService, PdfAttachment attachment) {
        this.pdfTextService = pdfTextService;
        this.attachment = attachment;
    }

    @Override
    public String name() {
        return "extractPdfText";
    }

    @Override
    public String description() {
        return "Extract the text of the PDF attached to the current message. Takes no arguments. "
                + "Use this before answering questions about the PDF's content or before creating "
                + "a reviewer from it. This is the only way to read a file.";
    }

    // No parameters on purpose: the model must not be able to choose what to read.
    @Override
    public Map<String, Object> parameters() {
        return Map.of();
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> arguments) {
        Path file = attachment.get();

        if (file == null) {
            return Map.of("error", "No PDF is attached to this message. Ask the user to attach one.");
        }

        try {
            return Map.of("text", pdfTextService.extract(file));
        } catch (Exception e) {
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return Map.of("error", message);
        }
    }
}
