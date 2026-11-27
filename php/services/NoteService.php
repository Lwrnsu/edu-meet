<?php
namespace Notepad;

use DOMDocument;
use DOMElement;
use DOMXPath;
use InvalidArgumentException;
use RuntimeException;

class NoteService
{
    private Note $note;

    public function __construct(Note $note)
    {
        $this->note = $note;
    }

    // GET ALL NOTES
    public function getAll(): array
    {
        return $this->note->getAll();
    }

    // GET ONE NOTE
    public function getById(int $id): array
    {
        $this->validateId($id);

        $note = $this->note->getById($id);

        if ($note === false) {
            throw new RuntimeException('Note not found.');
        }

        return $note;
    }

    // GET NOTES BY CATEGORY
    public function getByCategory(string $category): array
    {
        return $this->note->getByCategory(trim($category));
    }

    // SEARCH NOTES
    public function search(string $keyword): array
    {
        return $this->note->search(trim($keyword));
    }

    // GET ALL CATEGORIES
    public function getCategories(): array
    {
        return $this->note->getCategories();
    }

    // CREATE NOTE
    public function create(array $data): int
    {
        $title = $this->validateTitle(
            $data['title'] ?? 'Untitled Note'
        );

        $category = $this->validateCategory(
            $data['category'] ?? 'General'
        );

        $content = $this->sanitizeContent(
            $data['content'] ?? null
        );

        $classId = $this->validateClassId(
            $data['class_id'] ?? null
        );

        return $this->note->create(
            $title,
            $content,
            $category,
            $classId
        );
    }

    // UPDATE NOTE
    public function update(int $id, array $data): bool
    {
        $this->validateId($id);

        // Check if the note exists first.
        $this->getById($id);

        $title = $this->validateTitle(
            $data['title'] ?? 'Untitled Note'
        );

        $category = $this->validateCategory(
            $data['category'] ?? 'General'
        );

        $content = $this->sanitizeContent(
            $data['content'] ?? null
        );

        $classId = $this->validateClassId(
            $data['class_id'] ?? null
        );

        return $this->note->update(
            $id,
            $title,
            $content,
            $category,
            $classId
        );
    }

    // PIN OR UNPIN NOTE
    public function togglePin(int $id): bool
    {
        $this->getById($id);

        return $this->note->togglePin($id);
    }

    // DELETE NOTE
    public function delete(int $id): bool
    {
        $this->getById($id);

        return $this->note->delete($id);
    }

    // VALIDATE NOTE ID
    private function validateId(int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException(
                'Invalid note ID.'
            );
        }
    }

    // VALIDATE NOTE TITLE
    private function validateTitle(mixed $title): string
    {
        if (!is_string($title)) {
            throw new InvalidArgumentException(
                'Note title must be a string.'
            );
        }

        $title = trim($title);

        if ($title === '') {
            $title = 'Untitled Note';
        }

        if (mb_strlen($title) > 200) {
            throw new InvalidArgumentException(
                'Note title must not exceed 200 characters.'
            );
        }

        return $title;
    }

    // VALIDATE NOTE CATEGORY
    private function validateCategory(mixed $category): string
    {
        if (!is_string($category)) {
            throw new InvalidArgumentException(
                'Note category must be a string.'
            );
        }

        $category = trim($category);

        if ($category === '') {
            $category = 'General';
        }

        if (mb_strlen($category) > 80) {
            throw new InvalidArgumentException(
                'Note category must not exceed 80 characters.'
            );
        }

        return $category;
    }

    // VALIDATE CLASS ID
    private function validateClassId(mixed $classId): ?int
    {
        if ($classId === null || $classId === '') {
            return null;
        }

        $validatedId = filter_var(
            $classId,
            FILTER_VALIDATE_INT
        );

        if ($validatedId === false || $validatedId <= 0) {
            throw new InvalidArgumentException(
                'Invalid class ID.'
            );
        }

        // Check whether the class actually exists.
        if (!$this->note->classExists($validatedId)) {
            throw new InvalidArgumentException(
                'Class not found.'
            );
        }

        return $validatedId;
    }

    // SANITIZE NOTE CONTENT
    private function sanitizeContent(mixed $content): ?string
    {
        if ($content === null) {
            return null;
        }

        if (!is_string($content)) {
            throw new InvalidArgumentException(
                'Note content must be a string.'
            );
        }

        // Allowed rich-text formatting.
        $allowedTags = [
            'p', 'br',
            'strong', 'b',
            'em', 'i',
            'u',
            'ul', 'ol', 'li',
            'h1', 'h2', 'h3',
            'blockquote',
            'a'
        ];

        // Elements that must be completely removed.
        $dangerousTags = [
            'script', 'style',
            'iframe', 'object', 'embed',
            'form', 'input', 'button',
            'textarea', 'select',
            'svg', 'math',
            'template', 'noscript'
        ];

        $dom = new DOMDocument('1.0', 'UTF-8');

        $previousSetting = libxml_use_internal_errors(true);

        try {
            $html = '<!DOCTYPE html><html><head>'
                . '<meta charset="UTF-8">'
                . '</head><body>'
                . '<div id="note-content">'
                . $content
                . '</div></body></html>';

            $loaded = $dom->loadHTML(
                '<?xml encoding="UTF-8">' . $html,
                LIBXML_NONET
            );

            if (!$loaded) {
                throw new InvalidArgumentException(
                    'Unable to process note content.'
                );
            }

            $xpath = new DOMXPath($dom);

            $container = $xpath->query(
                '//*[@id="note-content"]'
            )->item(0);

            if (!$container) {
                return '';
            }

            // Clean HTML recursively.
            $cleanNode = function ($node) use (
                &$cleanNode,
                $allowedTags,
                $dangerousTags,
                $dom
            ) {
                foreach (
                    iterator_to_array($node->childNodes) as $child
                ) {
                    if (!$child instanceof DOMElement) {
                        continue;
                    }

                    $tag = strtolower($child->tagName);

                    // Completely remove dangerous elements.
                    if (in_array($tag, $dangerousTags, true)) {
                        $node->removeChild($child);
                        continue;
                    }

                    // Clean nested elements first.
                    $cleanNode($child);

                    // Unwrap unsupported tags but preserve their children.
                    if (!in_array($tag, $allowedTags, true)) {
                        while ($child->firstChild) {
                            $node->insertBefore(
                                $child->firstChild,
                                $child
                            );
                        }

                        $node->removeChild($child);
                        continue;
                    }

                    // Validate hyperlink destinations.
                    if ($tag === 'a') {
                        $href = trim(
                            $child->getAttribute('href')
                        );

                        $isHttpUrl = (
                            preg_match(
                                '/\Ahttps?:\/\/[^\s<>"\']+\z/i',
                                $href
                            ) &&
                            filter_var(
                                $href,
                                FILTER_VALIDATE_URL
                            ) !== false
                        );

                        $isMailto = (
                            preg_match(
                                '/\Amailto:[^\s<>"\']+\z/i',
                                $href
                            )
                        );

                        if ($isHttpUrl || $isMailto) {
                            $child->setAttribute('href', $href);
                        } else {
                            $child->removeAttribute('href');
                        }
                    }

                    // Remove all attributes except a validated href.
                    foreach (
                        iterator_to_array($child->attributes) as $attribute
                    ) {
                        if (
                            $tag !== 'a' ||
                            strtolower($attribute->name) !== 'href'
                        ) {
                            $child->removeAttribute(
                                $attribute->name
                            );
                        }
                    }
                }
            };

            $cleanNode($container);

            // Convert cleaned HTML back into a string.
            $result = '';

            foreach ($container->childNodes as $child) {
                $result .= $dom->saveHTML($child);
            }

            return $result;

        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previousSetting);
        }
    }
}