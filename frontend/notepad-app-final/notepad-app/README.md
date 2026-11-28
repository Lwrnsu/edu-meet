# Notepad app

One React + Vite project. Run everything from this folder.

## Run it
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open a terminal in this folder (the one with `package.json`).
3. `npm install` (first time only)
4. `npm run dev`
5. Open `http://localhost:5174`

Notes use the PHP backend (`notes.php`). The `notes` table must exist in the database (see `database.sql` in the backend).

## Folder structure
```
src/
  App.jsx                       page root: holds the open note, filter, search, and delete target
  main.jsx                      entry point
  features/
    notes/                      notes list and data
      useNotesData.js           loads notes and classes, and saves pin / delete / add / update
      NotesList.jsx             sidebar: search box and note cards
    editor/
      NoteEditor.jsx            create or edit one note (title, body, class, category, pin)
    filters/
      FilterChips.jsx           All / Pinned / one chip per category
    delete/
      DeleteDialog.jsx          confirmation before a note is deleted
  shared/
    api/api.js                  calls to notes.php
    components/                 icons, chip, and other shared UI
    navigation/                 header, app switcher, app links
    utils/helpers.js            categories, colors, dates, sorting
  styles/                       CSS
```

## Notes
- Feature folders import from `shared/`. Shared code does not import from features.
- Categories are plain text in the database. Each category's color is picked from its name.
