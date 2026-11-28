# Reviewer app

One React + Vite project. Run everything from this folder.

## Run it
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open a terminal in this folder (the one with `package.json`).
3. `npm install` (first time only)
4. `npm run dev`
5. Open `http://localhost:5173`

Spring Boot is optional. Start it separately with `mvn spring-boot:run` in the Spring Boot folder.
Without it, everything uses PHP.

## Folder structure
```
src/
  App.jsx                    app root: loads data, routes by URL hash, renders pages
  main.jsx                   entry point
  features/
    class/                   class list, class page
      ClassesPage.jsx
      ClassPage.jsx
    decks/                   deck page
      DeckPage.jsx
    flashcards/              create, edit, list, and JSON import
      CardForm.jsx           create (manual / JSON import) and edit flashcard forms
      FlashcardList.jsx      flashcards in a deck, with edit and delete
      Answer.jsx             how an answer is shown (with key-answer highlight)
      import/
        flashcardJson.js     validates JSON files before import
    quiz-mode/               identification quiz (answers checked by the server)
      QuizSession.jsx
    study-session/           flip-card study mode
      FlashcardSession.jsx
      SessionPicker.jsx      "Start session" popup: quiz or flashcard mode
  shared/
    api/api.js               talks to PHP and Spring Boot
    context/                 shared app state
    components/              icons, buttons/fields/dialog shell, modal host, session header
    navigation/              header, app switcher, URL-hash helper
    utils/helpers.js         colors, counts, key-answer helper
  styles/                    CSS
```

## Notes
- Feature folders import from `shared/`. Shared code never imports from a feature, except
  `shared/components/Modal.jsx`, which opens the forms.
- Classes are edited here, not created. New classes are not created from the Reviewer.
