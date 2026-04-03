# Beatles Photo Map — Project Context

## What this is
An interactive map and timeline application that allows users to browse photographs of The Beatles correlated to the time and place they were taken. Users can follow the band's movements chronologically and geographically.

## Live site
https://ldev80.github.io/beatles-photo-map

## GitHub repo
https://github.com/Ldev80/beatles-photo-map

---

## Current state
- `index.html` — full application. Firebase Firestore connected via Firebase JS SDK v10 (ES module). CSS is still inline (not yet refactored to `styles.css`).
- `photos.json` — 15-event placeholder, kept as in-browser fallback if Firestore is empty or unreachable.
- `events-1962.json` — 421 events scraped from beatlesbible.com/1962, used as the source for the Firestore upload.
- `scripts/upload-events.mjs` — one-off Node 18+ script that geocodes and uploads all 421 events to Firestore. Run once with `node scripts/upload-events.mjs`.
- Firestore is set up (Standard edition, europe-west2). Rules are currently in test mode (open read/write for 30 days). **Lock writes down after the upload is confirmed working.**

---

## Architecture decisions

### Data source — Firebase Firestore
Firestore is the live data source. `index.html` fetches from the `events` collection on load. Falls back to hardcoded placeholder data if Firestore returns nothing.

### Data model — two layers

**Events collection** (one document per event/appearance)
- `date` — string, format YYYY-MM-DD. Month-only (YYYY-MM) and year-only (YYYY) are valid for uncertain dates
- `time` — string, optional, loose format e.g. "morning", "evening", or HH:MM if precisely known
- `venue` — string, name of the venue or location
- `city` — string
- `lat` — number
- `lng` — number
- `desc` — string, one or two sentences maximum. Keep it concise.
- `source` — string, URL back to the original source (e.g. Beatles Bible)
- `title_bb` — string, original Beatles Bible title, kept for reference

**Photos subcollection** (within each event document)
- `img` — string, direct URL to image file
- `caption` — string, optional
- `credit` — string, photographer or source name, optional
- `source` — string, URL to original post or page where image was found, optional

### Why this model
- Multiple photos from the same session attach to one event — avoids duplicate pins on the map
- Events are the navigational unit; photos are evidence attached to events
- Date and location are inherited from the event, not duplicated per photo
- Keeps individual records minimal and clean

### Data philosophy — keep it minimal
Only store what is needed to place an event in time and space, and to display it clearly. Do not replicate everything available from source sites. The photo does the storytelling; the record just provides context.

---

## Data sourcing strategy

### Primary skeleton — Beatles Bible
`beatlesbible.com/1962` was scraped via a browser console script (beatlesbible.com blocks external fetches with 403, but same-origin fetches from the browser work fine). 421 events extracted. Each event links back to its Beatles Bible source URL.

For future years, use the same browser console scraping approach on `beatlesbible.com/YYYY`.

### Images — manual curation
The owner is gathering images manually. Filenames will follow the convention `YYYYMMDD_Location`. Images will be attached to events manually (via Firebase Console or an add-photo UI to be built). Auto-matching by filename date/location is a future option.

### Photo matching — Beatles Archive and similar
Accounts like `beatlesarchive.bsky.app` on Bluesky post dated photographs with descriptions containing venue and location information. The Bluesky API is public and can be queried to find candidate photo matches for existing events. Matches should be flagged for human review before being attached — do not auto-attach.

### Contribution model
Solo curation by the owner at this stage. No public contribution interface needed yet.

---

## Scope
**1962 only for now.** 421 events covering the full year — Hamburg Star-Club residency, Decca audition, EMI/Abbey Road sessions, Pete Best leaving, Ringo joining, Love Me Do release, extensive Cavern Club and touring dates. Expand to other years once the data model and interface are proven.

---

## Frontend

### Tech stack
- Vanilla HTML/CSS/JS — no framework
- Leaflet.js for the map (via unpkg CDN)
- Firebase JS SDK v10 (ES modules, CDN) for Firestore
- Google Fonts: Playfair Display (headings), IBM Plex Mono (dates/labels), IBM Plex Sans (body)

### CSS — pending refactor
CSS is still inline in `index.html`. Needs splitting into `styles.css` with all colours and typography as CSS custom properties. Owner has a partial design system to apply — wait for that before refactoring.

Current CSS variables:
```css
:root {
  --ink: #1a1612;
  --cream: #F7F3EC;
  --amber: #b45309;
  --amber-light: #fef3c7;
  --amber-border: #fcd34d;
  --border: #e2ddd6;
  --muted: #6b6560;
  --surface: #ffffff;
  --bg: #f0ebe2;
}
```

### Design principles
- Map is the most prominent element
- Timeline is prominent and allows navigation by time period
- Panel shows photo, date, location, short description, source link
- Tooltips appear on map marker hover showing event title
- Edit form allows correction of any field
- Keep the UI minimal — show only what is necessary

### Map
- Leaflet with CartoDB light tiles
- Marker clustering needed for scale (Leaflet.markercluster plugin) — not yet implemented
- Active marker is darker/larger than inactive ones
- Map flies smoothly to selected event location

### Timeline
- Horizontal scrubber at the bottom
- Pips represent individual events
- Draggable handle to scrub through time
- Year labels along the bottom
- Range is currently hardcoded to 1957–1962 — should become dynamic based on loaded data

### Navigation — under discussion
Owner wants a "journey" feel — stepping through events day by day. Key challenge: many consecutive events share the same location (e.g. 159 Cavern Club appearances). Agreed approach not yet decided. Leading idea: location-aware stepping where the map only flies when the location changes, with a counter showing position within a same-location run (e.g. "Cavern Club — 8 of 23").

### Edit form
- Opens as overlay when "Edit this entry" is clicked
- Saves directly to Firestore for live events
- Falls back to JSON export for hardcoded placeholder events

---

## Scaling considerations
- 10,000s of entries anticipated at full scale
- Do not fetch all records at once — load based on visible map bounds and selected time window
- Marker clustering handles visual density on the map
- Timeline pip rendering will need virtualisation at scale

---

## Firebase setup notes
- Free Firebase account (Spark plan), Standard edition, europe-west2
- Project ID: `beatles-photo-map`
- API key is visible in `index.html` — acceptable as long as Firestore security rules are correctly configured
- Security rules: public read, no public write. Currently in test mode — lock down writes after upload is confirmed.

---

## What has been tried and didn't work
- Fetching Beatles Bible pages directly — returns 403 (use browser console scraping instead)
- Fetching beatlesource.com pages directly — returns 415
- Hotlinking images from Beatles Bible — images fail to load (hotlink protection)
- Images from external URLs failing in Claude.ai chat — sandbox restriction only, not a real problem

---

## Next steps
1. Run `node scripts/upload-events.mjs` to populate Firestore with 421 events
2. Lock Firestore write rules down after upload
3. Owner gathers images (YYYYMMDD_Location filename convention)
4. Build image attachment workflow (add photo to event's `photos` subcollection)
5. Apply owner's design system — refactor CSS to `styles.css` at that point
6. Implement journey navigation (prev/next with location-aware map movement)
7. Add marker clustering (Leaflet.markercluster)
8. Make timeline range dynamic based on loaded data
