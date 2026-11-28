package com.block_a.edu_meet.ai.tools;

import com.block_a.edu_meet.ai.PdfAttachment;
import com.block_a.edu_meet.ai.PdfTextService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExtractPdfTextToolTest {

    @TempDir
    Path tempDir;

    private final PdfAttachment attachment = new PdfAttachment();
    private int pdfCounter = 0;

    @Test
    void extractPdfTextReturnsTheTextOfTheAttachedPdf() throws Exception {
        attachment.set(writePdf(1, "Photosynthesis is the process by which plants convert light into chemical energy."));

        Map<String, Object> result = tool(40, 60_000).execute(Map.of());

        assertTrue(result.get("text") instanceof String);
        assertTrue(((String) result.get("text")).contains("Photosynthesis"));
    }

    // The model used to supply the path, which let it read any PDF on the host.
    @Test
    void aFilePathArgumentIsIgnored() {
        Map<String, Object> result = tool(40, 60_000).execute(
                Map.of("filePath", "C:\\Windows\\win.ini"));

        assertFalse(result.containsKey("text"));
        assertTrue(result.containsKey("error"));
    }

    @Test
    void noAttachmentPointsToEarlierConversationText() {
        Map<String, Object> result = tool(40, 60_000).execute(Map.of());

        String error = String.valueOf(result.get("error"));
        assertTrue(error.contains("already read"));
        assertTrue(error.contains("attach the PDF"));
    }

    @Test
    void toolDeclaresNoParameters() {
        assertTrue(tool(40, 60_000).parameters().isEmpty());
    }

    @Test
    void longPdfsAreTruncated() throws Exception {
        attachment.set(writePdf(1, "Photosynthesis is the process by which plants convert light into chemical energy."));

        String text = (String) tool(40, 10).execute(Map.of()).get("text");

        assertTrue(text.contains("[Truncated"));
    }

    // A scanned PDF has no text layer: the tool must say so instead of handing
    // the model an empty string it has to guess about.
    @Test
    void pdfWithoutSelectableTextIsReportedAsUnreadable() throws Exception {
        attachment.set(writePdf(1, null));

        Map<String, Object> result = tool(40, 60_000).execute(Map.of());

        assertFalse(result.containsKey("text"));
        assertTrue(result.get("error").toString().contains("no selectable text"));
    }

    @Test
    void twoAttachmentsAreJoinedWithDocumentHeaders() throws Exception {
        attachment.set(List.of(
                writePdf(1, "Photosynthesis converts light into chemical energy."),
                writePdf(1, "Mitochondria is the powerhouse of the cell.")));

        String text = (String) tool(40, 60_000).execute(Map.of()).get("text");

        assertTrue(text.contains("--- Document 1 ---"));
        assertTrue(text.contains("--- Document 2 ---"));
        assertTrue(text.contains("Photosynthesis"));
        assertTrue(text.contains("Mitochondria"));
    }

    @Test
    void pageLimitIsReportedBackToTheModel() throws Exception {
        attachment.set(writePdf(3, "Cells are the basic unit of life."));

        String text = (String) tool(2, 60_000).execute(Map.of()).get("text");

        assertTrue(text.contains("Only the first 2 of 3 pages were read"));
    }

    @Test
    void attachmentCanBeCleared() {
        attachment.set(tempDir.resolve("x.pdf"));
        attachment.clear();
        assertTrue(attachment.get().isEmpty());
    }

    private ExtractPdfTextTool tool(int maxPages, int maxChars) {
        return new ExtractPdfTextTool(new PdfTextService(maxPages, maxChars), attachment);
    }

    // pageText == null writes a page with no content stream, like a scan.
    private Path writePdf(int pages, String pageText) throws Exception {
        Path pdf = tempDir.resolve("doc-" + (++pdfCounter) + ".pdf");

        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < pages; i++) {
                PDPage page = new PDPage();
                doc.addPage(page);

                if (pageText != null) {
                    try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                        cs.beginText();
                        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                        cs.newLineAtOffset(50, 700);
                        cs.showText("Page " + (i + 1) + ". " + pageText);
                        cs.endText();
                    }
                }
            }
            doc.save(pdf.toFile());
        }
        return pdf;
    }
}
