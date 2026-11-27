<?php

namespace Notepad;

use ApiResponse;
use InvalidArgumentException;
use Notepad\NoteService;
use RuntimeException;
use Throwable;

class NoteController
{
    private NoteService $noteService;

    public function __construct(NoteService $noteService)
    {
        $this->noteService = $noteService;
    }

    // MAIN REQUEST HANDLER
    public function handle(): never
    {
        try {
            $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

            if ($method === 'GET') {
                $this->handleGet();
            }

            if ($method === 'POST') {
                $this->handlePost();
            }

            $this->respond(false, 405, 'HTTP method not allowed.', []);
        } catch (InvalidArgumentException $e) {
            $this->respond(false, 400, $e->getMessage(), []);
        } catch (RuntimeException $e) {
            if ($e->getMessage() === 'Note not found.') {
                $this->respond(false, 404, $e->getMessage(), []);
            }

            error_log($e->getMessage());
            $this->respond(false, 500, 'A server error occurred.', []);
        } catch (Throwable $e) {
            error_log($e->getMessage());
            $this->respond(false, 500, 'A server error occurred.', []);
        }
    }

    // HANDLE GET REQUESTS
    private function handleGet(): never
    {
        $action = $_GET['action'] ?? 'list';

        switch ($action) {
            case 'list':
                $notes = $this->noteService->getAll();
                $this->respond(true, 200, 'Notes retrieved successfully.', (array) $notes);

            case 'single':
                $id = $this->getId($_GET['id'] ?? null);
                $note = $this->noteService->getById($id);
                $this->respond(true, 200, 'Note retrieved successfully.', (array) $note);

            case 'categories':
                $categories = $this->noteService->getCategories();
                $this->respond(true, 200, 'Categories retrieved successfully.', (array) $categories);

            case 'category':
                $category = $_GET['category'] ?? '';

                if (!is_string($category)) {
                    throw new InvalidArgumentException('Invalid category.');
                }

                $notes = $this->noteService->getByCategory($category);
                $this->respond(true, 200, 'Notes retrieved successfully.', (array) $notes);

            case 'search':
                $keyword = $_GET['keyword'] ?? '';

                if (!is_string($keyword)) {
                    throw new InvalidArgumentException('Invalid search keyword.');
                }

                $notes = $this->noteService->search($keyword);
                $this->respond(true, 200, 'Search results retrieved successfully.', (array) $notes);

            default:
                $this->respond(false, 400, 'Invalid GET action.', []);
        }
    }

    // HANDLE POST REQUESTS
    private function handlePost(): never
    {
        $data = $this->getRequestData();
        $action = $_GET['action'] ?? $data['action'] ?? '';

        switch ($action) {
            case 'create':
                $noteId = $this->noteService->create($data);
                $newNote = $this->noteService->getById($noteId);
                $this->respond(true, 201, 'Note created successfully.', (array) $newNote);

            case 'update':
                $id = $this->getId($data['id'] ?? null);
                $this->noteService->update($id, $data);
                $updatedNote = $this->noteService->getById($id);
                $this->respond(true, 200, 'Note updated successfully.', (array) $updatedNote);

            case 'togglePin':
                $id = $this->getId($data['id'] ?? null);
                $this->noteService->togglePin($id);
                $updatedNote = $this->noteService->getById($id);
                $this->respond(true, 200, 'Note pin status updated successfully.', (array) $updatedNote);

            case 'delete':
                $id = $this->getId($data['id'] ?? null);
                $this->noteService->delete($id);
                $this->respond(true, 200, 'Note deleted successfully.', []);

            default:
                $this->respond(false, 400, 'Invalid POST action.', []);
        }
    }

    private function respond(bool $response, int $code, string $message, array $body): never
    {
        $payload = new ApiResponse($response, $code, $message, $body);
        http_response_code($payload->code);
        header('Content-Type: application/json');
        echo json_encode($payload);
        exit;
    }

    // READ JSON REQUEST BODY
    private function getRequestData(): array
    {
        $rawData = file_get_contents('php://input');

        if ($rawData === false || trim($rawData) === '') {
            return [];
        }

        $data = json_decode($rawData, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            throw new InvalidArgumentException('Invalid JSON request body.');
        }

        return $data;
    }

    // VALIDATE AND CONVERT ID
    private function getId(mixed $value): int
    {
        $id = filter_var($value, FILTER_VALIDATE_INT);

        if ($id === false || $id <= 0) {
            throw new InvalidArgumentException('Invalid note ID.');
        }

        return $id;
    }
}