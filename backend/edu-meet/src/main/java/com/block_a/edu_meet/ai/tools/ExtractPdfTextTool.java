package com.block_a.edu_meet.ai.tools;

import com.block_a.edu_meet.ai.PdfAttachment;
import com.block_a.edu_meet.ai.PdfTextService;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Component
public class ExtractPdfTextTool implements Tool {

    // Several documents are joined into one result, so the total is capped too.
    private static final int MAX_TOTAL_CHARS = 90_000;

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
        return "Extract the text of the PDFs attached to the current message. Takes no arguments. "
                + "Use this when a new PDF is attached, before answering questions about it or "
                + "creating a reviewer. For follow-up questions about a PDF already read in this "
                + "conversation, use the text already present instead.";
    }

    // No parameters on purpose: the model must not be able to choose what to read.
    @Override
    public Map<String, Object> parameters() {
        return Map.of();
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> arguments) {
        List<Path> files = attachment.get();

        if (files.isEmpty()) {
            return Map.of("error",
                    "No new PDF is attached to this message. If you already read this PDF earlier "
                            + "in the conversation, use that text to answer. Otherwise, ask the user "
                            + "to attach the PDF.");
        }

        StringBuilder text = new StringBuilder();

        try {
            for (int i = 0; i < files.size(); i++) {
                if (files.size() > 1) {
                    text.append("--- Document ").append(i + 1).append(" ---\n");
                }
                text.append(pdfTextService.extract(files.get(i)));
                if (i < files.size() - 1) {
                    text.append("\n\n");
                }
                if (text.length() >= MAX_TOTAL_CHARS) {
                    break;
                }
            }
        } catch (Exception e) {
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return Map.of("error", message);
        }

        String result = text.length() > MAX_TOTAL_CHARS
                ? text.substring(0, MAX_TOTAL_CHARS)
                        + "\n\n[Truncated: the attached documents are longer than "
                        + MAX_TOTAL_CHARS + " characters.]"
                : text.toString();

        return Map.of("text", result, "documents", files.size());
    }
}
