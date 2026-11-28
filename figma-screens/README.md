# Group 7 screens for Figma

Static HTML copies of the Group 7 screens (File Management & Blogs, Tasks & Activities,
Announcements, Notifications), saved from the running app at 1440 px wide.
Open `index.html` to see the list.

**`all-screens.html`** has all 27 screens in one file: a cover with the list, then every screen
as its own 1440 px frame (Faculty first, then Student). Import this one file to get everything at once.
The separate files are still here if you want one screen at a time.

- One screen per file. Each file holds everything it needs: our CSS (`files-blogs.css`),
  the EduMeet logo (embedded), and the Poppins font from Google Fonts.
- Sample data: test classes, teachers (Maria Santos) and students (Aiden Esguerra).
- Pop-up screens show the whole pop-up (no inner scrolling) so every field is visible in Figma.
- PDF previews are shown as a plain box ("PDF preview: …").
- Buttons and links don't work; these are pictures of the screens, not the app.

## Import into Figma (html.to.design)

1. In Chrome, install the **html.to.design** extension and allow it to read local files:
   Extensions → html.to.design → Details → turn on **Allow access to file URLs**.
2. Open a screen file in Chrome (drag it into a tab, e.g. `04-tasks-faculty.html`).
3. Click the html.to.design extension → set the width to **1440** → import. It downloads a `.h2d` file.
4. In Figma: Plugins → **html.to.design** → drag the `.h2d` file into the plugin.
5. Repeat for each screen.

Figma has Poppins built in, so the text keeps the same font.
