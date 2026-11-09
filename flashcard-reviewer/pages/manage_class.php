
<?php

require_once __DIR__ . '/../config/bootstrap.php';

$classModel = new ClassModel($pdo);

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

$id = (int) ($_GET['id'] ?? 0);

$class = $classModel->getById($id);

if (!$class) {
    die("Class not found.");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    try {

        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');

        $classModel->update(
            $id,
            $name,
            $description !== '' ? $description : null
        );

        header("Location: ../index.php?success=class_updated");
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
    <title>Edit Class | StudySpace</title>
    <link rel="stylesheet" href="../assets/css/style.css">
</head>

<body>

<div class="management-container">

    <div class="management-card">

        <a href="../index.php" class="back-link">
            ← Back to Dashboard
        </a>

        <span class="eyebrow">CLASS MANAGEMENT</span>

        <h1>Edit Class</h1>

        <p>Update your class information.</p>

        <?php if (!empty($error)): ?>
            <div class="alert error-alert">
                <?= e($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST">

            <div class="form-group">

                <label>Class Name</label>

                <input
                    type="text"
                    name="name"
                    value="<?= e($class['name']) ?>"
                    maxlength="150"
                    required
                >

            </div>

            <div class="form-group">

                <label>Description</label>

                <textarea
                    name="description"
                    rows="4"
                ><?= e($class['description'] ?? '') ?></textarea>

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

</body>
</html>