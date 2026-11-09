 console.log("STUDY.JS IS LOADED!");
console.log("FLASHCARDS:", studyCards);

document.addEventListener("DOMContentLoaded", function () {

    // Flashcard elements
    const studyCard = document.getElementById("study-card");
    const cardQuestion = document.getElementById("card-question");
    const cardAnswer = document.getElementById("card-answer");
    const cardExplanation = document.getElementById("card-explanation");
    const cardDifficulty = document.getElementById("card-difficulty");

    // Progress elements
    const cardCounter = document.getElementById("card-counter");
    const progressFill = document.getElementById("progress-fill");

    // Buttons
    const prevButton = document.getElementById("prev-btn");
    const nextButton = document.getElementById("next-btn");
    const flipButton = document.getElementById("flip-btn");
    const shuffleButton = document.getElementById("shuffle-btn");

    // Check if flashcards exist
    if (!Array.isArray(studyCards) || studyCards.length === 0) {
        return;
    }

    // Study variables
    let currentIndex = 0;
    let isFlipped = false;

    // Display current flashcard
    function displayCard() {

        const card = studyCards[currentIndex];

        cardQuestion.textContent = card.question || "No question available.";
        cardAnswer.textContent = card.answer || "No answer available.";
        cardExplanation.textContent = card.explanation || "";

        cardDifficulty.textContent =
            (card.difficulty || "medium").toUpperCase();

        // Update counter
        cardCounter.textContent =
            `${currentIndex + 1} / ${studyCards.length}`;

        // Update progress bar
        const progress =
            ((currentIndex + 1) / studyCards.length) * 100;

        progressFill.style.width = `${progress}%`;

        // Reset card to front
        isFlipped = false;
        studyCard.classList.remove("flipped");

        // Update button states
        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === studyCards.length - 1;
    }

    // Flip flashcard
    function flipCard() {

        isFlipped = !isFlipped;

        studyCard.classList.toggle("flipped", isFlipped);
    }

    // Previous card
    function previousCard() {

        if (currentIndex > 0) {
            currentIndex--;
            displayCard();
        }
    }

    // Next card
    function nextCard() {

        if (currentIndex < studyCards.length - 1) {
            currentIndex++;
            displayCard();
        }
    }

    // Shuffle flashcards
    function shuffleCards() {

        for (let i = studyCards.length - 1; i > 0; i--) {

            const randomIndex = Math.floor(Math.random() * (i + 1));

            [studyCards[i], studyCards[randomIndex]] =
                [studyCards[randomIndex], studyCards[i]];
        }

        currentIndex = 0;
        displayCard();
    }

    // Event listeners
    studyCard.addEventListener("click", flipCard);

    flipButton.addEventListener("click", flipCard);

    prevButton.addEventListener("click", previousCard);

    nextButton.addEventListener("click", nextCard);

    shuffleButton.addEventListener("click", shuffleCards);

    // Keyboard controls
    document.addEventListener("keydown", function (event) {

        if (event.code === "ArrowLeft") {
            previousCard();
        }

        if (event.code === "ArrowRight") {
            nextCard();
        }

        if (event.code === "Space") {

            // Prevent page scrolling
            event.preventDefault();

            flipCard();
        }

    });

    // Initial display
    displayCard();

});