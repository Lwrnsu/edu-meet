
<?php

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../classes/StudySession.php';

$studySession = new StudySession($pdo);

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

// Get the quiz session ID.
$sessionId = (int) ($_GET['session_id'] ?? 0);

if ($sessionId <= 0) {
    die('Invalid quiz session.');
}

// Retrieve the completed session.
$session = $studySession->getById($sessionId);

if (!$session) {
    die('Quiz results not found.');
}

if ($session['status'] !== 'completed') {
    die('This quiz has not been completed yet.');
}

// Retrieve all submitted answers.
$answers = $studySession->getAnswers($sessionId);

// Retrieve the deck name.
$stmt = $pdo->prepare("
    SELECT name
    FROM decks
    WHERE id = :deck_id
");

$stmt->execute([
    ':deck_id' => $session['deck_id']
]);

$deck = $stmt->fetch(PDO::FETCH_ASSOC);

$deckName = $deck['name'] ?? 'Unknown Deck';

// Calculate result information.
$totalQuestions = (int) $session['total_questions'];
$correctAnswers = (int) $session['correct_answers'];
$incorrectAnswers = (int) $session['incorrect_answers'];
$scorePercentage = (float) $session['score_percentage'];

// Determine the result message.
if ($scorePercentage >= 90) {
    $resultMessage = 'Excellent work!';
    $resultDescription = 'You have demonstrated an excellent understanding of this deck.';
} elseif ($scorePercentage >= 75) {
    $resultMessage = 'Great job!';
    $resultDescription = 'You are doing well. Keep reviewing to improve further.';
} elseif ($scorePercentage >= 50) {
    $resultMessage = 'Good effort!';
    $resultDescription = 'You are making progress. Review the questions you missed.';
} else {
    $resultMessage = 'Keep practicing!';
    $resultDescription = 'Review your flashcards and try the quiz again.';
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Quiz Results | StudySpace</title>

    <link rel="stylesheet" href="../assets/css/style.css">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'DM Sans', sans-serif;
            background: #f6f7f2;
            color: #24352b;
        }

        .result-page {
            width: min(900px, 92%);
            margin: 45px auto;
        }

        .result-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .result-header h1 {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 30px;
            margin-bottom: 8px;
        }

        .result-header p {
            color: #77847b;
            margin: 5px 0;
        }

        .score-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 35px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(30, 55, 40, 0.06);
            margin-bottom: 25px;
        }

        .score-circle {
            width: 155px;
            height: 155px;
            border-radius: 50%;
            border: 10px solid #dce9dc;
            margin: 0 auto 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #f5faf4;
        }

        .score-circle strong {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 36px;
            color: #2f7047;
        }

        .score-circle span {
            font-size: 13px;
            color: #77847b;
        }

        .score-card h2 {
            font-family: 'Plus Jakarta Sans', sans-serif;
            margin: 10px 0;
        }

        .score-card p {
            color: #77847b;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }

        .stat-card {
            background: #fff;
            border-radius: 15px;
            padding: 22px;
            text-align: center;
            box-shadow: 0 5px 18px rgba(30, 55, 40, 0.04);
        }

        .stat-card strong {
            display: block;
            font-size: 27px;
            margin-bottom: 5px;
        }

        .stat-card span {
            font-size: 13px;
            color: #77847b;
        }

        .correct-stat strong {
            color: #2f8a50;
        }

        .incorrect-stat strong {
            color: #d45b5b;
        }

        .total-stat strong {
            color: #345f91;
        }

        .review-section {
            background: #fff;
            padding: 25px;
            border-radius: 18px;
            box-shadow: 0 5px 18px rgba(30, 55, 40, 0.04);
        }

        .review-section h2 {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 20px;
            margin: 0 0 20px;
        }

        .review-item {
            padding: 18px 0;
            border-bottom: 1px solid #edf0eb;
        }

        .review-item:last-child {
            border-bottom: none;
        }

        .review-question {
            font-weight: 700;
            margin-bottom: 12px;
        }

        .review-answer {
            font-size: 14px;
            margin: 7px 0;
            color: #66736a;
        }

        .review-answer strong {
            color: #34453a;
        }

        .answer-status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-top: 8px;
        }

        .status-correct {
            background: #e7f5e9;
            color: #287642;
        }

        .status-incorrect {
            background: #fdeaea;
            color: #b84242;
        }

        .explanation {
            background: #f6f8f4;
            border-left: 3px solid #8da994;
            padding: 12px;
            border-radius: 6px;
            margin-top: 12px;
            font-size: 13px;
            color: #66736a;
        }

        .result-actions {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 28px;
        }

        .result-btn {
            display: inline-block;
            text-decoration: none;
            padding: 13px 22px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            transition: 0.2s;
        }

        .retry-btn {
            background: #315e42;
            color: white;
        }

        .retry-btn:hover {
            background: #244a33;
        }

        .back-btn {
            background: #e9eee8;
            color: #315e42;
        }

        .back-btn:hover {
            background: #dce6dc;
        }

        @media (max-width: 600px) {
            .result-page {
                margin: 25px auto;
            }

            .score-card {
                padding: 25px 15px;
            }

            .stats {
                grid-template-columns: 1fr;
            }

            .review-section {
                padding: 18px;
            }

            .result-header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>

<body>

<div class="result-page">

    <div class="result-header">
        <h1>Quiz Completed!</h1>
        <p><?= e($deckName) ?></p>
    </div>

    <!-- Final Score -->
    <div class="score-card">

        <div class="score-circle">
            <strong><?= number_format($scorePercentage, 1) ?>%</strong>
            <span>Final Score</span>
        </div>

        <h2><?= e($resultMessage) ?></h2>
        <p><?= e($resultDescription) ?></p>

    </div>

    <!-- Score Statistics -->
    <div class="stats">

        <div class="stat-card correct-stat">
            <strong><?= $correctAnswers ?></strong>
            <span>Correct Answers</span>
        </div>

        <div class="stat-card incorrect-stat">
            <strong><?= $incorrectAnswers ?></strong>
            <span>Incorrect Answers</span>
        </div>

        <div class="stat-card total-stat">
            <strong><?= $totalQuestions ?></strong>
            <span>Total Questions</span>
        </div>

    </div>

    <!-- Answer Review -->
    <div class="review-section">

        <h2>Answer Review</h2>

        <?php if (empty($answers)): ?>

            <p>No answer records were found for this quiz.</p>

        <?php else: ?>

            <?php foreach ($answers as $index => $answer): ?>

                <div class="review-item">

                    <div class="review-question">
                        <?= ($index + 1) ?>.
                        <?= e($answer['question_snapshot']) ?>
                    </div>

                    <div class="review-answer">
                        <strong>Your Answer:</strong>
                        <?= e($answer['user_answer'] ?? 'No answer') ?>
                    </div>

                    <div class="review-answer">
                        <strong>Correct Answer:</strong>
                        <?= e($answer['correct_answer_snapshot']) ?>
                    </div>

                    <?php if ((int) $answer['is_correct'] === 1): ?>

                        <span class="answer-status status-correct">
                            Correct
                        </span>

                    <?php else: ?>

                        <span class="answer-status status-incorrect">
                            Incorrect
                        </span>

                    <?php endif; ?>

                </div>

            <?php endforeach; ?>

        <?php endif; ?>

    </div>

    <!-- Navigation -->
    <div class="result-actions">

        <a
            href="quiz.php?deck_id=<?= (int) $session['deck_id'] ?>"
            class="result-btn retry-btn"
        >
            Try Again
        </a>

        <a
            href="flashcards.php?deck_id=<?= (int) $session['deck_id'] ?>"
            class="result-btn back-btn"
        >
            Back to Flashcards
        </a>

    </div>

</div>

</body>
</html>