package dev.algomotion.ai.extract;

import dev.algomotion.ai.AiProperties;
import dev.algomotion.shared.web.ApiException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Extracts problem text from uploads. Uploads are untrusted: type is checked by magic bytes, size and page counts are capped,
 * nothing is executed, and the result is plain text that the user reviews before generation.
 */
@Component
public class TextExtractor {
    public static final int MAX_CHARS = 8000;

    public record Extracted(String text, String method, List<String> warnings) {}

    private final AiProperties props;

    public TextExtractor(AiProperties props) { this.props = props; }

    public Extracted extract(MultipartFile file) throws IOException {
        byte[] b = file.getBytes();
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (b.length == 0) throw unsupported("The file is empty");
        if (isPdf(b)) return pdf(b);
        if (isPng(b) || isJpeg(b) || isWebp(b)) return ocr(b, isPng(b) ? ".png" : isJpeg(b) ? ".jpg" : ".webp");
        if (name.endsWith(".txt") || name.endsWith(".md")) return clean(new String(b, StandardCharsets.UTF_8), "plain text", new ArrayList<>());
        throw unsupported("Unsupported file type. Upload .txt, .md, .pdf, .png, .jpg or .webp");
    }

    Extracted pdf(byte[] b) throws IOException {
        try (PDDocument doc = Loader.loadPDF(b)) {
            List<String> warnings = new ArrayList<>();
            int pages = doc.getNumberOfPages();
            if (pages > props.maxPdfPages()) warnings.add("Only the first " + props.maxPdfPages() + " of " + pages + " pages were read.");
            PDFTextStripper s = new PDFTextStripper();
            s.setStartPage(1);
            s.setEndPage(Math.min(pages, props.maxPdfPages()));
            String text = s.getText(doc);
            if (text.isBlank()) warnings.add("No text layer found — this may be a scanned PDF. Try uploading an image instead.");
            return clean(text, "PDF text extraction", warnings);
        } catch (IOException e) {
            throw unsupported("The PDF could not be read");
        }
    }

    /** OCR via the tesseract CLI when installed in the container; otherwise reports that OCR is unavailable. */
    Extracted ocr(byte[] b, String ext) throws IOException {
        Path dir = Files.createTempDirectory("am-ocr-");
        try {
            Path img = dir.resolve("upload" + ext);
            Files.write(img, b);
            Process p;
            try {
                p = new ProcessBuilder("tesseract", img.toString(), "stdout", "--psm", "6").redirectErrorStream(false).start();
            } catch (IOException e) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OCR_UNAVAILABLE", "Image text recognition is not installed on this server. Please paste the text instead.");
            }
            boolean done = p.waitFor(30, TimeUnit.SECONDS);
            if (!done) {
                p.destroyForcibly();
                throw unsupported("Text recognition timed out");
            }
            String text = new String(p.getInputStream().readNBytes(200_000), StandardCharsets.UTF_8);
            List<String> w = new ArrayList<>();
            w.add("OCR can misread symbols such as brackets, minus signs and subscripts — check the text carefully.");
            return clean(text, "OCR (tesseract)", w);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw unsupported("Interrupted");
        } finally {
            try (var s = Files.walk(dir)) {
                s.sorted(java.util.Comparator.reverseOrder()).forEach(f -> f.toFile().delete());
            }
        }
    }

    static Extracted clean(String raw, String method, List<String> warnings) {
        String t = raw.replace("\r\n", "\n").replaceAll("[\\p{Cntrl}&&[^\n\t]]", "").replaceAll("\n{3,}", "\n\n").strip();
        if (t.length() > MAX_CHARS) {
            t = t.substring(0, MAX_CHARS);
            warnings.add("Text truncated to " + MAX_CHARS + " characters.");
        }
        if (t.isBlank()) throw unsupported("No text could be extracted from the file");
        return new Extracted(t, method, warnings);
    }

    static boolean isPdf(byte[] b) { return b.length > 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F'; }
    static boolean isPng(byte[] b) { return b.length > 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'; }
    static boolean isJpeg(byte[] b) { return b.length > 3 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8 && (b[2] & 0xff) == 0xFF; }
    static boolean isWebp(byte[] b) { return b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P'; }

    private static ApiException unsupported(String m) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "EXTRACTION_FAILED", m); }
}
