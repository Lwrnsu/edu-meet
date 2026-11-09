
<?php

require_once __DIR__ . '/../config/bootstrap.php';

$deckModel = new Deck($pdo);
$flashcardModel = new flashcard($pdo);

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$cardId = (int) ($_GET['id'] ?? 0);
$deckId = (int) ($_GET['deck_id'] ?? 0);

$card = $flashcardModel->getById($cardId);
$deck = $deckModel->getById($deckId);

// Make sure this card belongs to the selected deck.
if (
    !$card ||
    !$deck ||
    (int) $card['deck_id'] !== $deckId
) {
    die('Flashcard or deck not found.');
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $question = trim($_POST['question'] ?? '');
    $answer = trim($_POST['answer'] ?? '');
    $explanation = trim($_POST['explanation'] ?? '');
    $difficulty = $_POST['difficulty'] ?? 'medium';

    try {

        if ($question === '' || $answer === '') {
            throw new InvalidArgumentException(
                'Question and answer are required.'
            );
        }

        $flashcardModel->update(
            $cardId,
            $question,
            $answer,
            $explanation !== '' ? $explanation : null,
            $difficulty
        );

        header(
            "Location: flashcards.php?deck_id=$deckId&success=updated"
        );
        exit;

    } catch (Throwable $exception) {
        $error = $exception->getMessage();
    }

    // Keep the user's input visible if validation fails.
    $card['question'] = $question;
    $card['answer'] = $answer;
    $card['explanation'] = $explanation;
    $card['difficulty'] = $difficulty;
}

?>

<!DOCTYPE html>
<html lang="en">
<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Edit Flashcard | StudySpace</title>

    <link rel="stylesheet" href="../assets/css/style.css">

    <style>
        body {
            background: #f7f8f3;
        }

        .edit-container {
            max-width: 750px;
            margin: 55px auto;
            padding: 25px;
        }

        .edit-card-container {
            background: white;
            padding: 32px;
            border-radius: 18px;
            border: 1px solid #e8e8e0;
        }

        .edit-container input,
        .edit-container textarea,
        .edit-container select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 9px;
            font: inherit;
            margin-top: 7px;
        }

        .edit-container textarea {
            resize: vertical;
        }

        .field {
            margin-bottom: 20px;
        }

        .field label {
            font-weight: 600;
        }

        .edit-actions {
            display: flex;
            gap: 12px;
            margin-top: 25px;
            flex-wrap: wrap;
        }

        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #496b4d;
            text-decoration: none;
        }

        .error-message {
            padding: 13px;
            border-radius: 8px;
            background: #fdecea;
            color: #a33b32;
            margin-bottom: 18px;
        }
    </style>

</head>

<body>

<div class="edit-container">

    <a
        href="flashcards.php?deck_id=<?= $deckId ?>"
        class="back-link"
    >
        ← Back to <?= e($deck['name']) ?>
    </a>

    <div class="edit-card-container">

        <span class="eyebrow">FLASHCARD EDITOR</span>

        <h1>Edit Flashcard</h1>

        <p>Update the question, answer, or difficulty.</p>

        <?php if ($error): ?>
            <div class="error-message">
                <?= e($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST">

            <div class="field">
                <label>Question</label>

                <textarea
                    name="question"
                    rows="4"
                    required
                ><?= e($card['question']) ?></textarea>
            </div>

            <div class="field">
                <label>Answer</label>

                <textarea
                    name="answer"
                    rows="4"
                    required
                ><?= e($card['answer']) ?></textarea>
            </div>

            <div class="field">
                <label>Explanation (Optional)</label>

                <textarea
                    name="explanation"
                    rows="3"
                ><?= e($card['explanation'] ?? '') ?></textarea>
            </div>

            <div class="field">
                <label>Difficulty</label>

                <select name="difficulty" required>

                    <option
                        value="easy"
                        <?= $card['difficulty'] === 'easy' ? 'selected' : '' ?>
                    >
                        Easy
                    </option>

                    <option
                        value="medium"
                        <?= $card['difficulty'] === 'medium' ? 'selected' : '' ?>
                    >
                        Medium
                    </option>

                    <option
                        value="hard"
                        <?= $card['difficulty'] === 'hard' ? 'selected' : '' ?>
                    >
                        Hard
                    </option>

                </select>
            </div>

            <div class="edit-actions">

                <a
                    href="flashcards.php?deck_id=<?= $deckId ?>"
                    class="btn btn-secondary"
                >
                    Cancel
                </a>

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Save Changes
                </button>

            </div>

        </form>

    </div>

</div>

</body>
</html>