# Challenge revealer

A plain HTML/CSS/JavaScript site for GitHub Pages. No build, framework, runtime dependencies, or server-side storage.

## Run locally

Run `python3 -m http.server 8000` (or `npm start`) from this folder, then visit http://localhost:8000. Use an HTTP server: opening HTML with `file://` will prevent JSON fetching in most browsers.

Run `npm test` for state, scoring, configuration, and timer checks. No dependency installation is needed.

## GitHub Pages

Commit these files to a GitHub repository. In **Settings → Pages**, select **Deploy from a branch**, choose your branch and **/ (root)**, and save. The dashboard is `index.html`. All application URLs are relative, so repository subpaths work. The site does not need a build workflow.

## Add a game

1. Copy `games/schengen-showdown/` into `games/your-game/`.
2. Change its HTML `<title>` and edit `game.json`. Keep the shared CSS and JS references unchanged for folders at the same depth.
3. Add `{ "id": "your-game", "path": "your-game/" }` to `games/index.json`.
4. Set the JSON game's `id` to `your-game`. Game IDs must be unique across the catalog. Challenge IDs must be unique within a game. IDs use lowercase letters, numbers, and hyphens; keep them stable to preserve saved progress.

Example `game.json`:

```json
{
  "id": "your-game",
  "title": "Your game",
  "description": "Pick a hint to reveal a challenge.",
  "challenges": [
    {
      "id": "first-challenge",
      "public_title": "A public hint",
      "title": "The secret title",
      "description": "The instructions.",
      "reward": 100,
      "time_limit": { "seconds": 300, "start": "on_open" }
    }
  ]
}
```

Omit `time_limit` for untimed challenges. Use `start: "on_open"` for an immediate countdown or `start: "manual"` for a Start timer button. Rewards are nonnegative numbers, awarded only for completed challenges. Descriptions support plain text and newlines. `sample_note` and `source: { "label": "Source", "url": "https://…" }` are optional.

## Behavior and storage

- Each game gets a shuffled order, preserved on reload. Restart shuffles again and seals every challenge, clearing points and timers while retaining the first-accessed date.
- Sealed cards show only their country hint and state. Completed cards are green and failed cards are red, with explicit outcome labels.
- Revealing a challenge saves its open time and opens a blocking, keyboard-accessible native dialog. Escape and backdrop clicks do not dismiss it. Choose Complete or Failed to continue.
- Timers use absolute timestamps rather than tick counts. Closing the browser or suspending a tab does not pause them. A manually timed challenge stays unstarted until Start timer is clicked.
- On expiration, the open dialog asks for the outcome. Nothing is automatically marked failed. Reopening the game restores that prompt if its deadline has passed. Browsers cannot display a popup while the website is closed.
- First/last accessed dates track visits to a game; last accessed also updates when progress changes. Dashboard viewing alone does not count as playing.
- State is stored under `challenge-revealer:v1:<game-id>` in localStorage. Storage is per browser and origin; localhost and GitHub Pages have separate progress. All games under one origin need unique IDs. Private browsing may clear data when closed.
- Storage changes synchronize between open tabs. Play in one tab at a time to avoid simultaneous edits.
- Hiding details is a UI feature: anyone inspecting the public JSON can read the challenges.

## Sample data

The 23 challenges follow the supplied reference for [Schengen Showdown challenges on Jet Lag: The Wiki](https://jetlag.fandom.com/wiki/Schengen_Showdown/Challenges), whose community text is licensed under [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/). Challenge text is shared under that license. This is an unofficial fan sample. The 100-point rewards are illustrative, not official scoring, and the supplied reference omits some supporting challenge materials (listed in `game.json`). Timers map activity-triggered deadlines to the manual Start button.
