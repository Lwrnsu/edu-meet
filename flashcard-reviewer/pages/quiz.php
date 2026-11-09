
<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/bootstrap.php';

// --------------------------------------------------
// INITIALIZE MODELS
// --------------------------------------------------

$flashcardModel = new Flashcard($pdo);
$studySession = new StudySession($pdo);

$quizEngine = new QuizEngine(
    $pdo,
    $flashcardModel,
    $studySession
);

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function escapeOutput($value): string
{
    return htmlspecialchars(
        (string) $value,
        ENT_QUOTES,
        'UTF-8'
    );
}

// --------------------------------------------------
// GET QUIZ SESSION
// --------------------------------------------------

$error = '';
$feedback = null;

$sessionId = isset($_GET['session_id'])
    ? (int) $_GET['session_id']
    : 0;

// --------------------------------------------------
// START A NEW QUIZ
// --------------------------------------------------

if ($sessionId <= 0) {

    $deckId = isset($_GET['deck_id'])
        ? (int) $_GET['deck_id']
        : 0;

    if ($deckId <= 0) {
        die('Invalid deck ID.');
    }

    try {

        $quiz = $quizEngine->start($deckId, true);

        $sessionId = (int) $quiz['session_id'];

        // Store quiz questions in the PHP session.
        $_SESSION['quiz_' . $sessionId] = [
            'deck_id' => $deckId,
            'questions' => $quiz['questions'],
            'current_index' => 0,
            'feedback' => null
        ];

        header(
            'Location: quiz.php?session_id=' . $sessionId
        );

        exit;

    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

// --------------------------------------------------
// RETRIEVE CURRENT QUIZ STATE
// --------------------------------------------------

$stateKey = 'quiz_' . $sessionId;

if (
    $sessionId > 0 &&
    !isset($_SESSION[$stateKey])
) {
    $error = 'Quiz session not found. Please start a new quiz.';
}

$state = $_SESSION[$stateKey] ?? null;

// --------------------------------------------------
// HANDLE QUIZ SUBMISSIONS
// --------------------------------------------------

if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    $state !== null
) {

    $action = $_POST['action'] ?? '';

    // ----------------------------------------------
    // SUBMIT ANSWER
    // ----------------------------------------------

    if ($action === 'submit') {

        // Do not allow another answer while feedback
        // for the current question is being displayed.
        if ($state['feedback'] !== null) {

            $error = 'Please proceed to the next question.';

        } else {

            $currentIndex = (int) $state['current_index'];

            $currentQuestion = $state['questions'][$currentIndex] ?? null;

            if (!$currentQuestion) {

                $error = 'Question not found.';

            } else {

                $userAnswer = trim(
                    $_POST['user_answer'] ?? ''
                );

                try {

                    $feedback = $quizEngine->submitAnswer(
                        $sessionId,
                        (int) $currentQuestion['id'],
                        $userAnswer
                    );

                    $_SESSION[$stateKey]['feedback'] = $feedback;

                } catch (Throwable $e) {

                    $error = $e->getMessage();
                }
            }
        }
    }

    // ----------------------------------------------
    // PROCEED TO NEXT QUESTION
    // ----------------------------------------------

    if ($action === 'next') {

        if ($state['feedback'] === null) {

            $error = 'Please submit your answer first.';

        } else {

            $_SESSION[$stateKey]['current_index']++;
            $_SESSION[$stateKey]['feedback'] = null;

            $nextIndex = $_SESSION[$stateKey]['current_index'];

            $totalQuestions = count(
                $_SESSION[$stateKey]['questions']
            );

            // If all questions have been answered,
            // finish the quiz and open the results page.
            if ($nextIndex >= $totalQuestions) {

                try {

                    $quizEngine->finish($sessionId);

                    unset($_SESSION[$stateKey]);

                    header(
                        'Location: quiz_result.php?session_id=' . $sessionId
                    );

                    exit;

                } catch (Throwable $e) {

                    $error = $e->getMessage();
                }
            }

            // Redirect to prevent form resubmission.
            header(
                'Location: quiz.php?session_id=' . $sessionId
            );

            exit;
        }
    }

    // Refresh state after POST handling.
    $state = $_SESSION[$stateKey] ?? null;
}

// --------------------------------------------------
// LOAD DECK INFORMATION
// --------------------------------------------------

$deck = null;

if ($state !== null) {

    $stmt = $pdo->prepare("
        SELECT id, name
        FROM decks
        WHERE id = :deck_id
        LIMIT 1
    ");

    $stmt->execute([
        ':deck_id' => $state['deck_id']
    ]);

    $deck = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$deck) {
        $error = 'The selected deck could not be found.';
    }

    $feedback = $state['feedback'];
}

// --------------------------------------------------
// CURRENT QUESTION
// --------------------------------------------------

$currentQuestion = null;
$currentIndex = 0;
$totalQuestions = 0;
$progress = 0;

if ($state !== null && $deck !== null) {

    $currentIndex = (int) $state['current_index'];

    $totalQuestions = count($state['questions']);

    $currentQuestion = $state['questions'][$currentIndex] ?? null;

    if ($totalQuestions > 0) {
        $progress = (($currentIndex + 1) / $totalQuestions) * 100;
    }
}

?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Quiz Mode | StudySpace</title>

    <link rel="stylesheet" href="../assets/css/style.css">

    <style>

        body {
            background: #f5f6f2;
        }

        .quiz-container {
            max-width: 850px;
            margin: 50px auto;
            padding: 25px;
        }

        .quiz-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap;
        }

        .quiz-header h1 {
            margin: 0;
            color: #244b37;
        }

        .quiz-card {
            background: #ffffff;
            padding: 35px;
            border-radius: 18px;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.06);
        }

        .quiz-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }

        .quiz-type {
            background: #e7f0e8;
            color: #28583c;
            padding: 8px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }

        .quiz-progress {
            color: #777;
            font-size: 14px;
        }

        .progress-track {
            width: 100%;
            height: 8px;
            background: #e8eae6;
            border-radius: 20px;
            overflow: hidden;
            margin-bottom: 30px;
        }

        .progress-fill {
            height: 100%;
            background: #477b55;
            border-radius: 20px;
            transition: width 0.3s ease;
        }

        .question-text {
            font-size: 24px;
            line-height: 1.6;
            color: #263b2d;
            margin-bottom: 30px;
            white-space: pre-wrap;
        }

        .answer-label {
            display: block;
            font-weight: 600;
            margin-bottom: 10px;
            color: #34483a;
        }

        .answer-input {
            width: 100%;
            padding: 15px;
            border: 1px solid #d5ddd5;
            border-radius: 10px;
            font-size: 16px;
            box-sizing: border-box;
            margin-bottom: 20px;
        }

        .answer-input:focus {
            outline: none;
            border-color: #477b55;
            box-shadow: 0 0 0 3px rgba(71, 123, 85, 0.12);
        }

        .quiz-button {
            display: inline-block;
            padding: 13px 22px;
            border: none;
            border-radius: 9px;
            background: #315d40;
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
        }

        .quiz-button:hover {
            background: #244b37;
        }

        .quiz-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .feedback-box {
            padding: 20px;
            border-radius: 12px;
            margin-top: 25px;
        }

        .feedback-correct {
            background: #e8f5eb;
            border: 1px solid #b8dfc1;
            color: #245b34;
        }

        .feedback-incorrect {
            background: #fff0ed;
            border: 1px solid #f0c2b8;
            color: #8a3528;
        }

        .feedback-box h3 {
            margin-top: 0;
        }

        .feedback-box p {
            line-height: 1.6;
        }

        .quiz-error {
            background: #fff0ed;
            color: #8a3528;
            border: 1px solid #f0c2b8;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #315d40;
            text-decoration: none;
        }

        .back-link:hover {
            text-decoration: underline;
        }

        @media (max-width: 600px) {

            .quiz-container {
                margin: 20px auto;
                padding: 15px;
            }

            .quiz-card {
                padding: 22px;
            }

            .question-text {
                font-size: 20px;
            }

        }

    </style>

</head>

<body>

<div class="quiz-container">

    <?php if ($error !== ''): ?>

        <div class="quiz-error">
            <?= escapeOutput($error) ?>
        </div>

        <a href="flashcards.php" class="back-link">
            ← Back to Flashcards
        </a>

    <?php elseif ($currentQuestion !== null): ?>

        <div class="quiz-header">

            <div>
                <h1>Quiz Mode</h1>

                <p>
                    <?= escapeOutput($deck['name']) ?>
                </p>
            </div>

            <a
                href="flashcards.php?deck_id=<?= (int) $deck['id'] ?>"
                class="back-link"
            >
                Exit Quiz
            </a>

        </div>

        <div class="quiz-card">

            <div class="quiz-meta">

                <span class="quiz-type">

                    <?= $currentQuestion['type'] === 'fill_blank'
                        ? 'Fill in the Blank'
                        : 'Identification'
                    ?>

                </span>

                <span class="quiz-progress">
                    Question <?= $currentIndex + 1 ?>
                    of <?= $totalQuestions ?>
                </span>

            </div>

            <div class="progress-track">

                <div
                    class="progress-fill"
                    style="width: <?= $progress ?>%;"
                ></div>

            </div>

            <h2 class="question-text">
                <?= escapeOutput($currentQuestion['question']) ?>
            </h2>

            <?php if ($feedback === null): ?>

                <form method="POST">

                    <label class="answer-label" for="user_answer">
                        Your Answer
                    </label>

                    <input
                        type="text"
                        name="user_answer"
                        id="user_answer"
                        class="answer-input"
                        placeholder="Type your answer here..."
                        autocomplete="off"
                        required
                        autofocus
                    >

                    <input
                        type="hidden"
                        name="action"
                        value="submit"
                    >

                    <button
                        type="submit"
                        class="quiz-button"
                    >
                        Submit Answer
                    </button>

                </form>

            <?php else: ?>

                <div class="feedback-box <?= $feedback['correct']
                    ? 'feedback-correct'
                    : 'feedback-incorrect'
                ?>">

                    <?php if ($feedback['correct']): ?>

                        <h3>Correct! Great job!</h3>

                    <?php else: ?>

                        <h3>Not quite. Keep learning!</h3>

                    <?php endif; ?>

                    <p>
                        <strong>Your Answer:</strong>
                        <?= escapeOutput($feedback['user_answer']) ?>
                    </p>

                    <p>
                        <strong>Correct Answer:</strong>
                        <?= escapeOutput($feedback['correct_answer']) ?>
                    </p>

                    <?php if (!empty($feedback['explanation'])): ?>

                        <p>
                            <strong>Explanation:</strong><br>
                            <?= nl2br(escapeOutput($feedback['explanation'])) ?>
                        </p>

                    <?php endif; ?>

                </div>

                <form method="POST" style="margin-top: 20px;">

                    <input
                        type="hidden"
                        name="action"
                        value="next"
                    >

                    <button
                        type="submit"
                        class="quiz-button"
                    >

                        <?= ($currentIndex + 1) === $totalQuestions
                            ? 'Finish Quiz'
                            : 'Next Question →'
                        ?>

                    </button>

                </form>

            <?php endif; ?>

        </div>

    <?php endif; ?>

</div>

</body>
</html>