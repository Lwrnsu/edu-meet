
<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config/bootstrap.php';

// Initialize models
$deckModel = new Deck($pdo);
$flashcardModel = new Flashcard($pdo);

// Get deck ID
$deckId = filter_input(INPUT_GET, 'deck_id', FILTER_VALIDATE_INT);

if (!$deckId || $deckId < 1) {
    exit('Invalid deck ID.');
}

// Get deck
$deck = $deckModel->getById($deckId);

if (!$deck) {
    exit('Deck not found.');
}

// Get flashcards
$flashcards = $flashcardModel->getByDeck($deckId);

// Prepare flashcard data
$studyCards = array_map(function ($card) {
    return [
        'question' => $card['question'],
        'answer' => $card['answer'],
        'explanation' => $card['explanation'] ?? '',
        'difficulty' => $card['difficulty'] ?? 'medium'
    ];
}, $flashcards);

// Convert PHP array to JSON
$cardsJson = json_encode(
    $studyCards,
    JSON_HEX_TAG |
    JSON_HEX_APOS |
    JSON_HEX_QUOT |
    JSON_HEX_AMP
);

if ($cardsJson === false) {
    exit('Unable to load flashcard data.');
}



?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Study Mode | StudySpace</title>

    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
    body {
        background: #e8f0e9 !important;
    }

    .study-heading h1 {
        color: green !important;
        font-size: 40px !important;
    }
</style>
</head>

<body>

    <div class="study-container">

        <!-- Study Header -->
        <header class="study-header">
            <a href="flashcards.php?deck_id=<?= $deckId ?>" class="back-button">
            &larr; Back to Flashcards
            </a>

            <div class="study-heading">
                <p class="study-label">STUDY MODE</p>

                <h1>
                    <?= htmlspecialchars(
                        $deck['deck_name'] ?? $deck['title'] ?? $deck['name'] ?? 'Study Session'
                    ) ?>
                </h1>

                <p class="study-subtitle">
                    Take your time. Learn at your own pace.
                </p>
            </div>
        </header>

        <!-- Study Progress -->
        <section class="study-progress-section">

            <div class="progress-information">
                <span>Study Progress</span>
                <span id="card-counter">0 / <?= count($studyCards) ?></span>
            </div>

            <div class="progress-track">
                <div class="progress-fill" id="progress-fill"></div>
            </div>

        </section>

        <!-- Study Content -->
        <?php if (count($studyCards) > 0): ?>

            <main class="study-content" id="study-content">

                <div class="flashcard-instruction">
                    <span>FLASHCARD</span>
                    <span>Click the card to flip</span>
                </div>

                <!-- Flashcard -->
                <div class="study-card" id="study-card">

                    <div class="study-card-inner" id="study-card-inner">

                        <!-- Front Side -->
                        <div class="study-card-face study-card-front">

                            <span class="card-side-label">QUESTION</span>

                            <div class="card-main-content">
                                <h2 id="card-question"></h2>
                            </div>

                            <p class="flip-hint">
                                Click to reveal the answer
                            </p>

                        </div>

                        <!-- Back Side -->
                        <div class="study-card-face study-card-back">

                            <span class="card-side-label">ANSWER</span>

                            <div class="card-main-content">
                                <h2 id="card-answer"></h2>

                                <p id="card-explanation"></p>
                            </div>

                            <p class="flip-hint">
                                Click to return to the question
                            </p>

                        </div>

                    </div>

                </div>

                <!-- Difficulty -->
                <div class="card-metadata">
                    <span id="card-difficulty">MEDIUM</span>
                </div>

                <!-- Study Controls -->
                <div class="study-controls">

                    <button type="button" id="prev-btn" class="study-button secondary">
                        &larr; Previous
                    </button>

                    <button type="button" id="flip-btn" class="study-button primary">
                        Flip Card
                    </button>

                    <button type="button" id="next-btn" class="study-button secondary">
                        Next &rarr;
                    </button>

                </div>

                <!-- Additional Controls -->
                <div class="study-extra-controls">

                    <button type="button" id="shuffle-btn" class="shuffle-button">
                        &#x1F500; Shuffle Cards
                    </button>

                </div>

            </main>

        <?php else: ?>

            <!-- Empty State -->
            <section class="empty-study-state">

                <div class="empty-icon">&#x1F4DA;</div>

                <h2>No flashcards yet</h2>

                <p>
                    This deck doesn't have any flashcards to study.
                    Add some questions and answers first.
                </p>

                <a href="manage_flashcard.php?deck_id=<?= $deckId ?>"
                   class="study-button primary">
                    Add Flashcards
                </a>

            </section>

        <?php endif; ?>

    </div>

    <!-- Pass PHP flashcard data to JavaScript -->
    <script>
        const studyCards = <?= $cardsJson ?>;
    </script>

    <script src="../assets/js/study.js"></script>

</body>
</html> 
