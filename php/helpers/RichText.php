<?php
/*
    Rich-text messages (announcement editor: bold, italic, underline, strike,
    lists, links, headings, text colour and size).

    clean()  keeps only safe tags/attributes, so saved HTML can be shown as is.
             Scripts, event handlers (onclick=...), javascript: links and
             unknown styles are removed.
    html()   what the page shows: cleaned HTML, or plain old text with line breaks.
    plain()  text only, for notifications and previews.
*/
class RichText {
    private const TAGS = ['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del',
                          'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'font'];
    private const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'head', 'title', 'template', 'svg', 'math'];
    private const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

    public static function isHtml(string $text): bool {
        // a real tag like <p>, </b>, <br/> or <a href="..."> (not "a < b")
        return (bool) preg_match('/<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/i', $text);
    }

    public static function clean(string $html): string {
        if (!self::isHtml($html)) {
            return nl2br(htmlspecialchars($html, ENT_QUOTES, 'UTF-8'), false);
        }
        $doc = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div id="rt-root">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $root = $doc->getElementById('rt-root');
        if ($root === null) {
            return htmlspecialchars(strip_tags($html), ENT_QUOTES, 'UTF-8');
        }
        self::walk($root);
        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }
        return trim($out);
    }

    private static function walk(DOMNode $node): void {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMComment || $child instanceof DOMProcessingInstruction) {
                $node->removeChild($child);
                continue;
            }
            if (!$child instanceof DOMElement) {
                continue;
            }
            $tag = strtolower($child->tagName);
            if (in_array($tag, self::DROP_WITH_CONTENT, true)) {
                $node->removeChild($child);
                continue;
            }
            self::walk($child);
            if (!in_array($tag, self::TAGS, true)) {
                // unknown tag: keep its text, drop the tag
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);
                continue;
            }
            self::cleanAttributes($child, $tag);
        }
    }

    private static function cleanAttributes(DOMElement $el, string $tag): void {
        $keep = [];
        if ($tag === 'a') {
            $href = trim($el->getAttribute('href'));
            if (preg_match('#^(https?://|mailto:)#i', $href)) {
                $keep['href'] = $href;
                $keep['target'] = '_blank';
                $keep['rel'] = 'noopener noreferrer';
            }
        }
        $style = self::cleanStyle($el->getAttribute('style'));
        if ($tag === 'font') {
            // <font color> from the editor → a colour style
            $color = self::cleanColor($el->getAttribute('color'));
            if ($color !== null) {
                $style = trim("color: $color; " . $style);
            }
        }
        if ($style !== '') {
            $keep['style'] = $style;
        }
        foreach (iterator_to_array($el->attributes) as $attr) {
            $el->removeAttribute($attr->nodeName);
        }
        foreach ($keep as $name => $value) {
            $el->setAttribute($name, $value);
        }
    }

    // Only text colour, background colour and the editor's font sizes survive.
    private static function cleanStyle(string $style): string {
        $out = [];
        foreach (explode(';', $style) as $rule) {
            [$prop, $value] = array_pad(array_map('trim', explode(':', $rule, 2)), 2, '');
            $prop = strtolower($prop);
            if ($prop === 'color' || $prop === 'background-color') {
                $color = self::cleanColor($value);
                if ($color !== null) {
                    $out[] = "$prop: $color";
                }
            } elseif ($prop === 'font-size' && in_array(strtolower($value), self::FONT_SIZES, true)) {
                $out[] = "font-size: " . strtolower($value);
            } elseif ($prop === 'text-decoration' && preg_match('/^(underline|line-through)$/i', $value)) {
                $out[] = "text-decoration: " . strtolower($value);
            }
        }
        return implode('; ', $out);
    }

    private static function cleanColor(string $value): ?string {
        $value = trim($value);
        if (preg_match('/^#[0-9a-f]{3,8}$/i', $value)
            || preg_match('/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i', $value)
            || preg_match('/^[a-z]{3,20}$/i', $value)) {
            return $value;
        }
        return null;
    }

    public static function html(string $text): string {
        return self::clean($text);
    }

    public static function plain(string $text, int $limit = 0): string {
        $plain = self::isHtml($text)
            ? html_entity_decode(strip_tags(preg_replace('#<(br|/p|/div|/li|/h\d)\s*/?>#i', "$0 ", $text)), ENT_QUOTES | ENT_HTML5, 'UTF-8')
            : $text;
        $plain = trim((string) preg_replace('/\s+/u', ' ', $plain));
        if ($limit > 0 && mb_strlen($plain) > $limit) {
            $plain = rtrim(mb_substr($plain, 0, $limit - 1)) . '…';
        }
        return $plain;
    }
}
