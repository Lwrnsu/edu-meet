
<?php

require_once __DIR__ . '/../config/bootstrap.php';

$classModel = new ClassModel($pdo);
$deckModel = new Deck($pdo);

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$id = (int) ($_GET['id'] ?? 0);

$deck = $deckModel->getById($id);

if (!$deck) {
    die("Deck not found.");
}

$classes = $classModel->getAll();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    try {

        $classId = (int) ($_POST['class_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');

        if (!$classModel->getById($classId)) {
            throw new InvalidArgumentException("Please select a valid class.");
        }

        $deckModel->update(
            $id,
            $classId,
            $name,
            $description !== '' ? $description : null
        );

        header("Location: ../index.php?success=deck_updated");
        exit;

    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Deck | StudySpace</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>

<body>

<div class="management-container">

    <div class="management-card">

        <a href="../index.php" class="back-link">
            ← Back to Dashboard
        </a>

        <span class="eyebrow">DECK MANAGEMENT</span>

        <h1>Edit Deck</h1>

        <p>Update your deck information.</p>

        <?php if (!empty($error)): ?>
            <div class="alert error-alert">
                <?= e($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST">

            <div class="form-group">

                <label>Parent Class</label>

                <select name="class_id" required>

                    <?php foreach ($classes as $class): ?>

                        <option
                            value="<?= (int) $class['id'] ?>"
                            <?= (int) $deck['class_id'] === (int) $class['id'] ? 'selected' : '' ?>
                        >
                            <?= e($class['name']) ?>
                        </option>

                    <?php endforeach; ?>

                </select>

            </div>

            <div class="form-group">

                <label>Deck Name</label>

                <input
                    type="text"
                    name="name"
                    value="<?= e($deck['name']) ?>"
                    maxlength="150"
                    required
                >

            </div>

            <div class="form-group">

                <label>Description</label>

                <textarea
                    name="description"
                    rows="4"
                ><?= e($deck['description'] ?? '') ?></textarea>

            </div>

            <div class="modal-actions">

                <a href="../index.php" class="btn btn-secondary">
                    Cancel
                </a>

                <button type="submit" class="btn btn-primary">
                    Save Changes
                </button>

            </div>

        </form>

    </div>

</div>

<a
    href="flashcards.php?deck_id=<?= (int) $deck['id'] ?>"
    class="btn btn-primary"
>
    Manage Flashcards
</a>

</body>
</html>