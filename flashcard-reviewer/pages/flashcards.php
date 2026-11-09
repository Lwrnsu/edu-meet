
<?php

require_once __DIR__ . '/../config/bootstrap.php';

$deckModel = new Deck($pdo);
$flashcardModel = new Flashcard($pdo);

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$deckId = (int) ($_GET['deck_id'] ?? 0);
$deck = $deckModel->getById($deckId);

if (!$deck) {
    die('Deck not found.');
}

$success = '';
$error = '';

$successMessages = [
    'created' => 'Flashcard created successfully!',
    'updated' => 'Flashcard updated successfully!',
    'deleted' => 'Flashcard deleted successfully!'
];

$success = $successMessages[$_GET['success'] ?? ''] ?? '';
$error = trim($_GET['error'] ?? '');

// Handle create and delete actions.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $action = $_POST['action'] ?? '';

        if ($action === 'create_flashcard') {
            $question = trim($_POST['question'] ?? '');
            $answer = trim($_POST['answer'] ?? '');
            $explanation = trim($_POST['explanation'] ?? '');
            $difficulty = $_POST['difficulty'] ?? 'medium';

            if ($question === '' || $answer === '') {
                throw new InvalidArgumentException(
                    'Question and answer are required.'
                );
            }

            $flashcardModel->create(
                $deckId,
                $question,
                $answer,
                $explanation !== '' ? $explanation : null,
                $difficulty
            );

            header("Location: flashcards.php?deck_id=$deckId&success=created");
            exit;
        }

        if ($action === 'delete_flashcard') {
            $cardId = (int) ($_POST['card_id'] ?? 0);
            $card = $flashcardModel->getById($cardId);

            if (!$card || (int) $card['deck_id'] !== $deckId) {
                throw new InvalidArgumentException('Flashcard not found.');
            }

            $flashcardModel->delete($cardId);

            header("Location: flashcards.php?deck_id=$deckId&success=deleted");
            exit;
        }

        throw new InvalidArgumentException('Invalid action.');

    } catch (Throwable $exception) {
        header(
            'Location: flashcards.php?deck_id=' . $deckId .
            '&error=' . urlencode($exception->getMessage())
        );
        exit;
    }
}

$flashcards = $flashcardModel->getByDeck($deckId);

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Flashcards | StudySpace</title>

    <link rel="stylesheet" href="../assets/css/style.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        .flashcard-page {
            max-width: 1100px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        .flashcard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }

        .flashcard-header h1 {
            margin: 8px 0;
        }

        .flashcard-header p {
            color: #777;
        }

        /* LEARNING MODES */

        .study-options {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }

        .study-option {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            padding: 13px 20px;
            border-radius: 10px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
            transition: 0.2s ease;
        }

        .flashcard-mode {
            background: #315c3b;
            color: #fff;
        }

        .flashcard-mode:hover {
            background: #244b37;
            transform: translateY(-2px);
        }

        .quiz-mode {
            background: #e8efe2;
            color: #315c3b;
            border: 1px solid #cbd9c8;
        }

        .quiz-mode:hover {
            background: #dce8d7;
            transform: translateY(-2px);
        }

        .study-option.disabled {
            opacity: 0.45;
            pointer-events: none;
            cursor: not-allowed;
        }

        .flashcard-list {
            display: grid;
            gap: 18px;
        }

        .flashcard-item {
            background: #fff;
            border: 1px solid #e8e8e0;
            border-radius: 16px;
            padding: 24px;
        }

        .flashcard-item h3 {
            margin: 10px 0;
        }

        .flashcard-answer {
            background: #f6f7f1;
            border-radius: 10px;
            padding: 14px;
            margin-top: 14px;
        }

        .flashcard-explanation {
            color: #777;
            margin-top: 12px;
        }

        .difficulty {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            text-transform: capitalize;
            background: #edf1e8;
        }

        .flashcard-actions {
            display: flex;
            gap: 10px;
            margin-top: 18px;
        }

        .flashcard-actions a,
        .flashcard-actions button {
            border: 0;
            cursor: pointer;
            text-decoration: none;
            font: inherit;
            font-size: 13px;
            padding: 9px 14px;
            border-radius: 8px;
        }

        .edit-card {
            background: #e8efe2;
            color: #315c3b;
        }

        .delete-card {
            background: #fae8e6;
            color: #a33b32;
        }

        .add-card-form {
            background: #fff;
            border: 1px solid #e8e8e0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 28px;
        }

        .add-card-form input,
        .add-card-form textarea,
        .add-card-form select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 9px;
            font: inherit;
            margin-top: 7px;
            box-sizing: border-box;
        }

        .add-card-form textarea {
            resize: vertical;
        }

        .field {
            margin-bottom: 16px;
        }

        .field label {
            font-weight: 600;
            font-size: 14px;
        }

        .empty-cards {
            text-align: center;
            padding: 55px 20px;
            background: #fff;
            border-radius: 16px;
            border: 1px dashed #ccc;
        }

        .page-alert {
            padding: 13px 16px;
            border-radius: 9px;
            margin-bottom: 18px;
        }

        .page-alert.success {
            background: #e8f5e9;
            color: #25633b;
        }

        .page-alert.error {
            background: #fdecea;
            color: #a33b32;
        }

        .back-link {
            display: inline-block;
            color: #496b4d;
            text-decoration: none;
            margin-bottom: 20px;
        }

        @media (max-width: 600px) {
            .study-options {
                flex-direction: column;
            }

            .study-option {
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>

<body>

<div class="flashcard-page">

    <a href="../index.php#decks" class="back-link">
        ← Back to Dashboard
    </a>

    <div class="flashcard-header">
        <div>
            <span class="eyebrow">FLASHCARD COLLECTION</span>

            <h1><?= e($deck['name']) ?></h1>

            <p>
                <?= count($flashcards) ?> flashcard(s) in this deck.
            </p>
        </div>
    </div>

    <?php if ($success): ?>
        <div class="page-alert success">
            <?= e($success) ?>
        </div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="page-alert error">
            <?= e($error) ?>
        </div>
    <?php endif; ?>

    <!-- LEARNING MODE SELECTION -->

    <div class="study-options">

        <a
            href="study.php?deck_id=<?= (int) $deckId ?>"
            class="study-option flashcard-mode <?= empty($flashcards) ? 'disabled' : '' ?>"
            <?= empty($flashcards) ? 'aria-disabled="true"' : '' ?>
        >
            📚 Flashcard Mode
        </a>

        <a
            href="quiz.php?deck_id=<?= (int) $deckId ?>"
            class="study-option quiz-mode <?= empty($flashcards) ? 'disabled' : '' ?>"
            <?= empty($flashcards) ? 'aria-disabled="true"' : '' ?>
        >
            ✍️ Quiz Mode
        </a>

    </div>

    <!-- ADD FLASHCARD FORM -->

    <div class="add-card-form">

        <h2>Create a Flashcard</h2>

        <p>Add a question and its corresponding answer.</p>

        <form method="POST">

            <input
                type="hidden"
                name="action"
                value="create_flashcard"
            >

            <div class="field">
                <label for="question">Question</label>

                <textarea
                    name="question"
                    id="question"
                    rows="3"
                    placeholder="Enter your question..."
                    required
                ></textarea>
            </div>

            <div class="field">
                <label for="answer">Answer</label>

                <textarea
                    name="answer"
                    id="answer"
                    rows="3"
                    placeholder="Enter the answer..."
                    required
                ></textarea>
            </div>

            <div class="field">
                <label for="explanation">Explanation (Optional)</label>

                <textarea
                    name="explanation"
                    id="explanation"
                    rows="2"
                    placeholder="Add additional information..."
                ></textarea>
            </div>

            <div class="field">
                <label for="difficulty">Difficulty</label>

                <select name="difficulty" id="difficulty" required>
                    <option value="easy">Easy</option>
                    <option value="medium" selected>Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>

            <button type="submit" class="btn btn-primary">
                + Add Flashcard
            </button>

        </form>

    </div>

    <!-- FLASHCARD LIST -->

    <div class="flashcard-list">

        <h2>Your Flashcards</h2>

        <?php if (empty($flashcards)): ?>

            <div class="empty-cards">
                <h3>No flashcards yet</h3>

                <p>
                    Create your first flashcard using the form above.
                </p>
            </div>

        <?php else: ?>

            <?php foreach ($flashcards as $card): ?>

                <article class="flashcard-item">

                    <span class="difficulty">
                        <?= e($card['difficulty']) ?>
                    </span>

                    <h3><?= e($card['question']) ?></h3>

                    <div class="flashcard-answer">
                        <strong>Answer</strong>

                        <p>
                            <?= nl2br(e($card['answer'])) ?>
                        </p>
                    </div>

                    <?php if (!empty($card['explanation'])): ?>

                        <div class="flashcard-explanation">
                            <strong>Explanation</strong>

                            <p>
                                <?= nl2br(e($card['explanation'])) ?>
                            </p>
                        </div>

                    <?php endif; ?>

                    <div class="flashcard-actions">

                        <a
                            class="edit-card"
                            href="manage_flashcard.php?id=<?= (int) $card['id'] ?>&deck_id=<?= $deckId ?>"
                        >
                            ✎ Edit
                        </a>

                        <form
                            method="POST"
                            onsubmit="return confirm('Delete this flashcard?');"
                        >

                            <input
                                type="hidden"
                                name="action"
                                value="delete_flashcard"
                            >

                            <input
                                type="hidden"
                                name="card_id"
                                value="<?= (int) $card['id'] ?>"
                            >

                            <button type="submit" class="delete-card">
                                ✕ Delete
                            </button>

                        </form>

                    </div>

                </article>

            <?php endforeach; ?>

        <?php endif; ?>

    </div>

</div>

</body>
</html>