package com.block_a.edu_meet.helpers;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/** Checks container structure and video tracks, without decoding media. */
public final class VideoAttachmentType {
    private static final Set<String> MP4_BRANDS = Set.of(
            "isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso7", "iso8", "iso9",
            "mp41", "mp42", "avc1", "M4V ", "dash", "cmfc", "cmfs");

    private VideoAttachmentType() {}

    public static String detect(byte[] bytes) {
        ByteBuffer data = ByteBuffer.wrap(bytes);
        if (bytes.length >= 8 && data.getInt(4) == fourCc("ftyp") && isMp4(data)) return "video/mp4";
        if (bytes.length >= 4 && data.getInt(0) == 0x1A45DFA3 && isWebm(data)) return "video/webm";
        return null;
    }

    private static boolean isMp4(ByteBuffer data) {
        Box fileType = boxAt(data, 0, data.limit());
        if (fileType == null || fileType.end() - fileType.start() < 8
                || (fileType.end() - fileType.start()) % 4 != 0) return false;
        boolean compatible = isMp4Brand(data, fileType.start());
        for (int offset = fileType.start() + 8; !compatible && offset < fileType.end(); offset += 4) {
            compatible = isMp4Brand(data, offset);
        }
        if (!compatible) return false;

        boolean video = false;
        boolean media = false;
        for (int offset = fileType.end(); offset < data.limit();) {
            Box box = boxAt(data, offset, data.limit());
            if (box == null) return false;
            if (box.type() == fourCc("moov")) video |= hasMp4VideoTrack(data, box);
            if (box.type() == fourCc("mdat")) media |= box.end() > box.start();
            offset = box.end();
        }
        return video && media;
    }

    private static boolean hasMp4VideoTrack(ByteBuffer data, Box movie) {
        for (int offset = movie.start(); offset < movie.end();) {
            Box track = boxAt(data, offset, movie.end());
            if (track == null) return false;
            if (track.type() == fourCc("trak")) {
                Box media = findBox(data, track, fourCc("mdia"));
                Box handler = media == null ? null : findBox(data, media, fourCc("hdlr"));
                if (handler != null && handler.end() - handler.start() >= 12
                        && data.getInt(handler.start() + 8) == fourCc("vide")) return true;
            }
            offset = track.end();
        }
        return false;
    }

    private static Box findBox(ByteBuffer data, Box parent, int type) {
        for (int offset = parent.start(); offset < parent.end();) {
            Box box = boxAt(data, offset, parent.end());
            if (box == null || box.type() == type) return box;
            offset = box.end();
        }
        return null;
    }

    private static Box boxAt(ByteBuffer data, int offset, int end) {
        if (end - offset < 8) return null;
        long size = Integer.toUnsignedLong(data.getInt(offset));
        int header = 8;
        if (size == 1) {
            if (end - offset < 16) return null;
            size = data.getLong(offset + 8);
            header = 16;
        } else if (size == 0) {
            size = end - offset;
        }
        if (size < header || size > end - offset) return null;
        return new Box(data.getInt(offset + 4), offset + header, offset + (int) size);
    }

    private static boolean isMp4Brand(ByteBuffer data, int offset) {
        return MP4_BRANDS.contains(new String(data.array(), offset, 4, StandardCharsets.US_ASCII));
    }

    private static int fourCc(String value) {
        return value.charAt(0) << 24 | value.charAt(1) << 16 | value.charAt(2) << 8 | value.charAt(3);
    }

    private static boolean isWebm(ByteBuffer data) {
        Box header = elementAt(data, 0, data.limit());
        if (header == null) return false;
        Box docType = findElement(data, header, 0x4282);
        if (docType == null || docType.end() - docType.start() != 4
                || data.getInt(docType.start()) != fourCc("webm")) return false;
        Box segment = findElement(data, new Box(0, header.end(), data.limit()), 0x18538067);
        if (segment == null) return false;
        Box tracks = findElement(data, segment, 0x1654AE6B);
        Box cluster = findElement(data, segment, 0x1F43B675);
        if (tracks == null || cluster == null || cluster.end() == cluster.start()) return false;

        for (int offset = tracks.start(); offset < tracks.end();) {
            Box track = elementAt(data, offset, tracks.end());
            if (track == null) return false;
            if (track.type() == 0xAE) {
                Box type = findElement(data, track, 0x83);
                if (type != null && type.end() - type.start() == 1 && data.get(type.start()) == 1) return true;
            }
            offset = track.end();
        }
        return false;
    }

    private static Box findElement(ByteBuffer data, Box parent, int type) {
        for (int offset = parent.start(); offset < parent.end();) {
            Box box = elementAt(data, offset, parent.end());
            if (box == null || box.type() == type) return box;
            offset = box.end();
        }
        return null;
    }

    private static Box elementAt(ByteBuffer data, int offset, int end) {
        if (offset >= end) return null;
        int idFirst = Byte.toUnsignedInt(data.get(offset));
        int idLength = Integer.numberOfLeadingZeros(idFirst) - 23;
        if (idLength > 4 || idLength >= end - offset) return null;
        int id = idFirst;
        for (int i = 1; i < idLength; i++) id = (id << 8) | Byte.toUnsignedInt(data.get(offset + i));

        int sizeOffset = offset + idLength;
        int sizeFirst = Byte.toUnsignedInt(data.get(sizeOffset));
        int sizeLength = Integer.numberOfLeadingZeros(sizeFirst) - 23;
        if (sizeLength > 8 || sizeLength > end - sizeOffset) return null;
        long size = sizeFirst & (0xFF >>> sizeLength);
        for (int i = 1; i < sizeLength; i++) size = (size << 8) | Byte.toUnsignedInt(data.get(sizeOffset + i));
        int start = sizeOffset + sizeLength;
        if (size == (1L << (7 * sizeLength)) - 1) {
            // Live WebM can use unknown sizes for its Segment and Cluster.
            if (id != 0x18538067 && id != 0x1F43B675) return null;
            size = end - start;
        }
        if (size > end - start) return null;
        return new Box(id, start, start + (int) size);
    }

    private record Box(int type, int start, int end) {}
}
