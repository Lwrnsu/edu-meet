
<?php

require_once __DIR__ . '/config/bootstrap.php';

// Initialize the OOP models.
$classModel = new ClassModel($pdo);
$deckModel = new Deck($pdo);
$flashcardModel = new Flashcard($pdo);

// Escape output before displaying database or URL values.
if (!function_exists('e')) {
    function e($value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }
}

// Handle all create, update, and delete requests.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $action = $_POST['action'] ?? '';

        switch ($action) {

            case 'create_class':
                $name = trim($_POST['name'] ?? '');
                $description = trim($_POST['description'] ?? '');

                if ($name === '') {
                    throw new InvalidArgumentException('Class name is required.');
                }

                $classModel->create(
                    $name,
                    $description !== '' ? $description : null
                );

                header('Location: index.php?success=class_created#classes');
                exit;

            case 'edit_class':
                $id = (int) ($_POST['id'] ?? 0);
                $name = trim($_POST['name'] ?? '');
                $description = trim($_POST['description'] ?? '');

                if ($id <= 0 || !$classModel->getById($id)) {
                    throw new InvalidArgumentException('Class not found.');
                }

                if ($name === '') {
                    throw new InvalidArgumentException('Class name is required.');
                }

                $classModel->update(
                    $id,
                    $name,
                    $description !== '' ? $description : null
                );

                header('Location: index.php?success=class_updated#classes');
                exit;

            case 'delete_class':
                $id = (int) ($_POST['id'] ?? 0);

                if ($id <= 0 || !$classModel->getById($id)) {
                    throw new InvalidArgumentException('Class not found.');
                }

                $classModel->delete($id);

                header('Location: index.php?success=class_deleted#classes');
                exit;

            case 'create_deck':
                $classId = (int) ($_POST['class_id'] ?? 0);
                $name = trim($_POST['name'] ?? '');
                $description = trim($_POST['description'] ?? '');

                if ($name === '' || $classId <= 0) {
                    throw new InvalidArgumentException(
                        'Please provide a deck name and select a class.'
                    );
                }

                if (!$classModel->getById($classId)) {
                    throw new InvalidArgumentException(
                        'Selected class does not exist.'
                    );
                }

                $deckModel->create(
                    $classId,
                    $name,
                    $description !== '' ? $description : null
                );

                header('Location: index.php?success=deck_created#decks');
                exit;

            case 'edit_deck':
                $id = (int) ($_POST['id'] ?? 0);
                $classId = (int) ($_POST['class_id'] ?? 0);
                $name = trim($_POST['name'] ?? '');
                $description = trim($_POST['description'] ?? '');

                if ($id <= 0 || !$deckModel->getById($id)) {
                    throw new InvalidArgumentException('Deck not found.');
                }

                if (
                    $name === '' ||
                    $classId <= 0 ||
                    !$classModel->getById($classId)
                ) {
                    throw new InvalidArgumentException(
                        'Please provide a valid deck name and class.'
                    );
                }

                $deckModel->update(
                    $id,
                    $classId,
                    $name,
                    $description !== '' ? $description : null
                );

                header('Location: index.php?success=deck_updated#decks');
                exit;

            case 'delete_deck':
                $id = (int) ($_POST['id'] ?? 0);

                if ($id <= 0 || !$deckModel->getById($id)) {
                    throw new InvalidArgumentException('Deck not found.');
                }

                $deckModel->delete($id);

                header('Location: index.php?success=deck_deleted#decks');
                exit;

            default:
                throw new InvalidArgumentException('Unknown action requested.');
        }

    } catch (Throwable $exception) {

        header(
            'Location: index.php?error=' .
            urlencode($exception->getMessage())
        );

        exit;
    }
}

// Dashboard notifications.
$successMessages = [
    'class_created' => 'Class created successfully!',
    'class_updated' => 'Class updated successfully!',
    'class_deleted' => 'Class deleted successfully!',
    'deck_created' => 'Deck created successfully!',
    'deck_updated' => 'Deck updated successfully!',
    'deck_deleted' => 'Deck deleted successfully!'
];

$successCode = $_GET['success'] ?? '';
$success = $successMessages[$successCode] ?? '';
$error = trim($_GET['error'] ?? '');

// Retrieve classes and dashboard statistics.
$classes = $classModel->getAll();

$totalClasses = count($classes);

$totalDecks = (int) $pdo
    ->query('SELECT COUNT(*) FROM decks')
    ->fetchColumn();

$totalFlashcards = (int) $pdo
    ->query('SELECT COUNT(*) FROM flashcards')
    ->fetchColumn();

// Optional class filter.
$selectedClassId = max(0, (int) ($_GET['class_id'] ?? 0));

$selectedClass = $selectedClassId > 0
    ? $classModel->getById($selectedClassId)
    : null;

if ($selectedClassId > 0 && !$selectedClass) {
    $selectedClassId = 0;
}

// Retrieve decks and their flashcard counts.
$sql = "
    SELECT
        d.*,
        c.name AS class_name,
        COUNT(f.id) AS total_flashcards

    FROM decks d

    INNER JOIN classes c
        ON d.class_id = c.id

    LEFT JOIN flashcards f
        ON d.id = f.deck_id
";

if ($selectedClassId > 0) {
    $sql .= ' WHERE d.class_id = :class_id';
}

$sql .= ' GROUP BY d.id ORDER BY d.created_at DESC';

$stmt = $pdo->prepare($sql);

if ($selectedClassId > 0) {
    $stmt->execute([':class_id' => $selectedClassId]);
} else {
    $stmt->execute();
}

$decks = $stmt->fetchAll(PDO::FETCH_ASSOC);

$recentDecks = array_slice($decks, 0, 4);

?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>StudySpace | Flashcard Reviewer</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
    >

    <link rel="stylesheet" href="assets/css/style.css">

    <!-- Dashboard-specific styles -->
    <style>
        .search-box {
            display: flex;
            align-items: center;
            gap: 10px;
            width: min(100%, 390px);
            padding: 10px 14px;
            background: #d3dcf0;
            border: 1px solid #8a97b8;
            border-radius: 12px;
            color: #5b5c7c;
        }

        .search-box > span:first-child {
            font-size: 19px;
        }

        .search-box input {
            flex: 1;
            min-width: 0;
            border: none;
            outline: none;
            background: transparent;
            color: #14123d;
            font-size: 11px;
        }

        .search-box input::placeholder {
            color: #777c9e;
        }

        .search-shortcut {
            font-size: 10px;
            color: #777c9e;
            white-space: nowrap;
        }

        .management-actions {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 7px;
            padding-top: 14px;
        }

        .management-actions a,
        .management-actions button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 30px;
            padding: 6px 10px;
            border: none;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 700;
            transition: .2s ease;
        }

        .action-edit {
            background: rgba(255, 255, 255, .75);
            color: #5b3fc4;
        }

        .action-edit:hover {
            background: #5b3fc4;
            color: #fff;
        }

        .action-delete {
            background: #ffe8ed;
            color: #c04461;
        }

        .action-delete:hover {
            background: #dc5b75;
            color: white;
        }

        .management-actions form {
            margin: 0;
        }

        .class-card .management-actions {
            border-top: 1px solid rgba(255, 255, 255, .65);
            margin-top: 13px;
        }

        .deck-card-body .management-actions {
            border-top: 1px solid #eeeafa;
            margin-top: 13px;
        }

        .deck-card-body .management-actions .action-edit {
            background: #f1edff;
        }

        .deck-card-body .management-actions .action-edit:hover {
            background: #5b3fc4;
        }

        .deck-card-body .management-actions .action-delete {
            background: #ffe8ed;
        }

        .deck-card-body .management-actions .action-delete:hover {
            background: #dc5b75;
        }

        .class-card[hidden],
        .deck-card[hidden] {
            display: none !important;
        }

        .search-empty[hidden] {
            display: none !important;
        }

        .modal-overlay[aria-hidden="true"] {
            pointer-events: none;
        }

        .modal-overlay.show[aria-hidden="false"] {
            pointer-events: auto;
        }

        @media (max-width: 760px) {
            .topbar {
                flex-wrap: wrap;
                padding-top: 14px;
                padding-bottom: 14px;
            }

            .search-box {
                order: 3;
                width: 100%;
            }

            .management-actions a,
            .management-actions button {
                font-size: 9px;
                padding: 6px 8px;
            }
        }
    </style>

</head>

<body>

<div class="app-container">

    <!-- SIDEBAR -->

    <aside class="sidebar">

        <div class="brand">

            <div class="brand-icon">
                <span>✳</span>
            </div>

            <div class="brand-name">
                <h2>StudySpace</h2>
                <p>YOUR PERSONAL REVIEWER</p>
            </div>

        </div>

        <div class="sidebar-section">

            <p class="sidebar-label">WORKSPACE</p>

            <a href="index.php" class="nav-link active">
                <span class="nav-icon">⌂</span>
                <span>Overview</span>
            </a>

            <a href="#classes" class="nav-link">
                <span class="nav-icon">▦</span>
                <span>My Classes</span>
            </a>

            <a href="#decks" class="nav-link">
                <span class="nav-icon">▤</span>
                <span>My Decks</span>
            </a>

        </div>

        <div class="sidebar-section">

            <p class="sidebar-label">YOUR LIBRARY</p>

            <a href="#classes" class="nav-link">
                <span class="nav-icon">✚</span>
                <span>All Collections</span>
            </a>

            <a href="#decks" class="nav-link">
                <span class="nav-icon">◷</span>
                <span>Recent Decks</span>
            </a>

        </div>

        <div class="sidebar-bottom">

            <div class="sidebar-tip">

                <div class="tip-icon">✦</div>

                <h4>Small steps, big progress.</h4>

                <p>
                    Every flashcard you study brings you one step closer
                    to mastering a topic.
                </p>

            </div>

            <div class="sidebar-footer">
                <span class="footer-dot"></span>
                Your personal study space
            </div>

        </div>

    </aside>


    <!-- MAIN CONTENT -->

    <main class="main-content">

        <!-- TOPBAR -->

        <header class="topbar">

            <div class="breadcrumb">
                <span>Workspace</span>
                <span class="breadcrumb-divider">/</span>
                <strong>Overview</strong>
            </div>

            <div class="search-box">

                <span>⌕</span>

                <input
                    type="search"
                    id="dashboardSearch"
                    placeholder="Search classes and decks..."
                    autocomplete="off"
                >

                <span class="search-shortcut">⌕</span>

            </div>

            <div class="topbar-right">

                <div class="status-indicator">
                    <span></span>
                    All changes saved
                </div>

                <div class="profile-avatar">S</div>

            </div>

        </header>


        <!-- PAGE CONTENT -->

        <div class="page-content">

            <?php if ($success): ?>

                <div class="alert success-alert">
                    ✓ <?= e($success) ?>
                </div>

            <?php endif; ?>

            <?php if ($error): ?>

                <div class="alert error-alert">
                    ✕ <?= e($error) ?>
                </div>

            <?php endif; ?>


            <!-- WELCOME -->

            <section class="welcome-section">

                <div class="welcome-text">

                    <span class="eyebrow">YOUR LEARNING SPACE</span>

                    <h1>
                        Make every study session
                        <span>count.</span>
                    </h1>

                    <p>
                        Organize your knowledge, create flashcards,
                        and learn something new every day.
                    </p>

                </div>

                <div class="welcome-actions">

                    <button class="btn btn-primary" id="openClassModal">
                        <span>＋</span> New Class
                    </button>

                    <button class="btn btn-secondary" id="openDeckModal">
                        <span>＋</span> New Deck
                    </button>

                </div>

            </section>


            <!-- STATISTICS -->

            <section class="stats-grid">

                <div class="stat-card">

                    <div class="stat-top">
                        <span class="stat-label">Total Classes</span>
                        <div class="stat-icon green-icon">▦</div>
                    </div>

                    <h2><?= $totalClasses ?></h2>

                    <p>Your learning categories</p>

                </div>

                <div class="stat-card">

                    <div class="stat-top">
                        <span class="stat-label">Total Decks</span>
                        <div class="stat-icon yellow-icon">▤</div>
                    </div>

                    <h2><?= $totalDecks ?></h2>

                    <p>Your organized topics</p>

                </div>

                <div class="stat-card">

                    <div class="stat-top">
                        <span class="stat-label">Flashcards</span>
                        <div class="stat-icon purple-icon">▣</div>
                    </div>

                    <h2><?= $totalFlashcards ?></h2>

                    <p>Questions ready to study</p>

                </div>

            </section>


            <!-- CLASSES -->

            <section class="content-section" id="classes">

                <div class="section-heading">

                    <div>
                        <span class="eyebrow">ORGANIZE YOUR LEARNING</span>
                        <h2>My Classes</h2>
                        <p>All your subjects, in one place.</p>
                    </div>

                    <button class="text-button" id="openClassModal2">
                        + Create class
                    </button>

                </div>


                <div class="classes-grid" id="classesGrid">

                    <?php if (empty($classes)): ?>

                        <div class="empty-state">

                            <div class="empty-icon">▦</div>

                            <h3>No classes yet</h3>

                            <p>
                                Create your first class to start organizing
                                your study materials.
                            </p>

                            <button
                                class="btn btn-primary"
                                id="emptyCreateClass"
                            >
                                Create your first class
                            </button>

                        </div>

                    <?php else: ?>

                        <?php foreach ($classes as $class): ?>

                            <div
                                class="class-card"
                                data-search="<?= e(strtolower(
                                    $class['name'] . ' ' .
                                    ($class['description'] ?? '')
                                )) ?>"
                            >

                                <div class="class-card-top">

                                    <div class="class-symbol">
                                        ✳
                                    </div>

                                    <span class="card-menu">↗</span>

                                </div>

                                <div class="class-card-content">

                                    <h3><?= e($class['name']) ?></h3>

                                    <p>
                                        <?= e(
                                            $class['description']
                                            ?: 'Your personal study collection.'
                                        ) ?>
                                    </p>

                                </div>

                                <div class="class-card-footer">

                                    <span>
                                        <?= (int) $class['total_decks'] ?>

                                        <?= (int) $class['total_decks'] === 1
                                            ? 'deck'
                                            : 'decks'
                                        ?>
                                    </span>

                                    <span>
                                        <?= (int) $class['total_flashcards'] ?>
                                        cards
                                    </span>

                                </div>

                                <!-- CLASS MANAGEMENT BUTTONS -->

                                <div class="management-actions">

                                    <a
                                        href="index.php?class_id=<?= (int) $class['id'] ?>#decks"
                                        class="action-edit"
                                    >
                                        View
                                    </a>

                                    <a
                                        href="pages/manage_class.php?id=<?= (int) $class['id'] ?>"
                                        class="action-edit"
                                    >
                                        Edit
                                    </a>

                                    <form
                                        method="POST"
                                        onsubmit="return confirm('Delete this class and all of its decks and flashcards? This cannot be undone.');"
                                    >

                                        <input
                                            type="hidden"
                                            name="action"
                                            value="delete_class"
                                        >

                                        <input
                                            type="hidden"
                                            name="id"
                                            value="<?= (int) $class['id'] ?>"
                                        >

                                        <button
                                            type="submit"
                                            class="action-delete"
                                        >
                                            Delete
                                        </button>

                                    </form>

                                </div>

                            </div>

                        <?php endforeach; ?>

                    <?php endif; ?>

                </div>

            </section>


            <!-- DECKS -->

            <section class="content-section" id="decks">

                <div class="section-heading">

                    <div>

                        <span class="eyebrow">
                            PICK UP WHERE YOU LEFT OFF
                        </span>

                        <h2>
                            <?= $selectedClass
                                ? e($selectedClass['name']) . ' Decks'
                                : 'Your Recent Decks'
                            ?>
                        </h2>

                        <p>
                            <?= $selectedClass
                                ? 'Explore the topics in this class.'
                                : 'Your latest study collections.'
                            ?>
                        </p>

                    </div>

                    <div class="section-actions">

                        <?php if ($selectedClass): ?>

                            <a
                                href="index.php#decks"
                                class="text-button"
                            >
                                View all decks
                            </a>

                        <?php endif; ?>

                        <button
                            class="text-button"
                            id="openDeckModal2"
                        >
                            + Create deck
                        </button>

                    </div>

                </div>


                <div class="decks-grid" id="decksGrid">

                    <?php if (empty($decks)): ?>

                        <div class="empty-state">

                            <div class="empty-icon">▤</div>

                            <h3>No decks found</h3>

                            <p>
                                Add a deck to this collection and start
                                creating flashcards.
                            </p>

                            <?php if ($totalClasses > 0): ?>

                                <button
                                    class="btn btn-primary"
                                    id="emptyCreateDeck"
                                >
                                    Create a deck
                                </button>

                            <?php else: ?>

                                <button
                                    class="btn btn-primary"
                                    id="emptyCreateClass2"
                                >
                                    Create a class first
                                </button>

                            <?php endif; ?>

                        </div>

                    <?php else: ?>

                        <?php foreach ($recentDecks as $index => $deck): ?>

                            <div
                                class="deck-card"
                                data-search="<?= e(strtolower(
                                    $deck['name'] . ' ' .
                                    $deck['class_name'] . ' ' .
                                    ($deck['description'] ?? '')
                                )) ?>"
                            >

                                <div class="deck-cover cover-<?= $index % 4 ?>">

                                    <span class="cover-decoration">✳</span>

                                    <span class="cover-label">
                                        <?= e($deck['class_name']) ?>
                                    </span>

                                </div>

                                <div class="deck-card-body">

                                    <h3><?= e($deck['name']) ?></h3>

                                    <p>
                                        <?= e(
                                            $deck['description']
                                            ?: 'No description added.'
                                        ) ?>
                                    </p>

                                    <div class="deck-meta">

                                        <span>
                                            <?= (int) $deck['total_flashcards'] ?>
                                            <?= (int) $deck['total_flashcards'] === 1
                                                ? 'flashcard'
                                                : 'flashcards'
                                            ?>
                                        </span>

                                        <span class="deck-arrow">↗</span>

                                    </div>

                                    <!-- DECK MANAGEMENT BUTTONS -->

                                    <div class="management-actions">

                                        <a
                                            href="pages/manage_deck.php?id=<?= (int) $deck['id'] ?>"
                                            class="action-edit"
                                        >
                                            ✎ Edit
                                        </a>

                                        <a
                                            href="pages/flashcards.php?deck_id=<?= (int) $deck['id'] ?>"
                                            class="action-edit"
                                        >
                                            ▤ Manage Flashcards
                                        </a>

                                        <form
                                            method="POST"
                                            onsubmit="return confirm('Delete this deck and all its flashcards? This cannot be undone.');"
                                        >

                                            <input
                                                type="hidden"
                                                name="action"
                                                value="delete_deck"
                                            >

                                            <input
                                                type="hidden"
                                                name="id"
                                                value="<?= (int) $deck['id'] ?>"
                                            >

                                            <button
                                                type="submit"
                                                class="action-delete"
                                            >
                                                ✕ Delete
                                            </button>

                                        </form>

                                    </div>

                                </div>

                            </div>

                        <?php endforeach; ?>

                    <?php endif; ?>

                </div>

            </section>


            <!-- SEARCH EMPTY MESSAGE -->

            <div id="searchEmpty" class="search-empty" hidden>
                No matching classes or decks found.
            </div>


            <footer class="page-footer">
                Made for better learning. One card at a time. ✳
            </footer>

        </div>

    </main>

</div>


<!-- CREATE CLASS MODAL -->

<div class="modal-overlay" id="classModal" aria-hidden="true">

    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="classModalTitle">

        <div class="modal-header">

            <div>
                <span class="eyebrow">NEW COLLECTION</span>
                <h2 id="classModalTitle">Create a class</h2>
                <p>Organize your study materials by subject.</p>
            </div>

            <button
                type="button"
                class="modal-close"
                data-close="classModal"
                aria-label="Close modal"
            >
                ×
            </button>

        </div>

        <form method="POST">

            <input
                type="hidden"
                name="action"
                value="create_class"
            >

            <div class="form-group">

                <label>Class name</label>

                <input
                    type="text"
                    name="name"
                    placeholder="e.g. Computer Science"
                    maxlength="150"
                    required
                >

            </div>

            <div class="form-group">

                <label>
                    Description <span>(Optional)</span>
                </label>

                <textarea
                    name="description"
                    placeholder="What will you study in this class?"
                    rows="3"
                ></textarea>

            </div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="btn btn-secondary"
                    data-close="classModal"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="btn btn-primary"
                >
                    Create Class
                </button>

            </div>

        </form>

    </div>

</div>


<!-- CREATE DECK MODAL -->

<div class="modal-overlay" id="deckModal" aria-hidden="true">

    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="deckModalTitle">

        <div class="modal-header">

            <div>
                <span class="eyebrow">NEW STUDY COLLECTION</span>
                <h2 id="deckModalTitle">Create a deck</h2>
                <p>Choose a class and give your deck a name.</p>
            </div>

            <button
                type="button"
                class="modal-close"
                data-close="deckModal"
                aria-label="Close modal"
            >
                ×
            </button>

        </div>

        <?php if (!empty($classes)): ?>

            <form method="POST">

                <input
                    type="hidden"
                    name="action"
                    value="create_deck"
                >

                <div class="form-group">

                    <label>Choose class</label>

                    <select name="class_id" required>

                        <option value="">
                            Select a class
                        </option>

                        <?php foreach ($classes as $class): ?>

                            <option
                                value="<?= (int) $class['id'] ?>"
                                <?= $selectedClassId === (int) $class['id']
                                    ? 'selected'
                                    : ''
                                ?>
                            >
                                <?= e($class['name']) ?>
                            </option>

                        <?php endforeach; ?>

                    </select>

                </div>

                <div class="form-group">

                    <label>Deck name</label>

                    <input
                        type="text"
                        name="name"
                        placeholder="e.g. PHP OOP Fundamentals"
                        maxlength="150"
                        required
                    >

                </div>

                <div class="form-group">

                    <label>
                        Description <span>(Optional)</span>
                    </label>

                    <textarea
                        name="description"
                        placeholder="Describe what this deck covers."
                        rows="3"
                    ></textarea>

                </div>

                <div class="modal-actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-close="deckModal"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="btn btn-primary"
                    >
                        Create Deck
                    </button>

                </div>

            </form>

        <?php else: ?>

            <div class="empty-state">

                <p>Create a class before creating a deck.</p>

                <button
                    type="button"
                    class="btn btn-primary"
                    id="modalCreateClass"
                >
                    Create Class
                </button>

            </div>

        <?php endif; ?>

    </div>

</div>


<!-- JAVASCRIPT -->

<script src="assets/js/app.js"></script>

</body>
</html>