package com.block_a.edu_meet.ai;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

@Service
public class PdfTextService {

    // Image-only PDFs produce nothing, and a model handed "" would have to
    // guess. Say it plainly so the reply can ask for a text-based file.
    private static final String NO_TEXT_MESSAGE =
            "The attached PDF has no selectable text - it is probably a scanned image. "
                    + "Ask the user to upload a PDF with selectable text.";

    private final int maxPages;
    private final int maxChars;

    public PdfTextService(@Value("${edu-meet.pdf.max-pages:40}") int maxPages,
                          @Value("${edu-meet.pdf.max-chars:60000}") int maxChars) {
        this.maxPages = maxPages;
        this.maxChars = maxChars;
    }

    // Extracts text from an already-validated attachment. The result is capped
    // so a huge handout cannot blow up the prompt (and the token bill), and it
    // carries notes when part of the document was left out.
    public String extract(Path file) {
        String body;
        int pageCount;

        try (PDDocument pdf = Loader.loadPDF(file.toFile())) {
            pageCount = pdf.getNumberOfPages();

            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            stripper.setEndPage(Math.min(pageCount, maxPages));

            body = stripper.getText(pdf).trim();
        } catch (Exception e) {
            // No path in the message: it would leak server layout to the model.
            throw new IllegalStateException("Could not read the attached PDF", e);
        }

        if (body.isEmpty() || body.chars().noneMatch(Character::isLetter)) {
            throw new IllegalStateException(NO_TEXT_MESSAGE);
        }

        StringBuilder result = new StringBuilder(body);

        boolean truncated = result.length() > maxChars;
        if (truncated) {
            result.setLength(maxChars);
        }

        // Tell the model what it did not get, instead of quietly stopping.
        if (pageCount > maxPages) {
            result.append("\n\n[Only the first ")
                    .append(maxPages)
                    .append(" of ")
                    .append(pageCount)
                    .append(" pages were read.]");
        }
        if (truncated) {
            result.append("\n\n[Truncated: the PDF is longer than the ")
                    .append(maxChars)
                    .append(" characters this tool can return.]");
        }

        return result.toString();
    }
}
