# Beatles Photo Map — Project Context

## What this is
An interactive map and timeline application that allows users to browse photographs of The Beatles correlated to the time and place they were taken. Users can follow the band's movements chronologically and geographically.

## Live site
https://ldev80.github.io/beatles-photo-map

## GitHub repo
https://github.com/Ldev80/beatles-photo-map

---

## Current state
- `index.html` — full application. Firebase Firestore connected via Firebase JS SDK v10 (ES module). CSS is inline (not yet refactored to `styles.css`).
- `photos.json` — 15-event placeholder, kept as in-browser fallback if Firestore is empty or unreachable.
- `events-1962.json` — 421 events scraped from beatlesbible.com/1962, used as the source for the Firestore upload.
- `scripts/upload-events.mjs` — one-off script that geocodes and uploads all 421 events to Firestore. Already run — do not re-run unless rebuilding from scratch.
- `scripts/attach-photos.mjs` — attaches images from `images/` to their Firestore events via the `photos` subcollection. Already run. Re-run only when adding new photo groups.
- `fonts/` — Futura Std font files (Light, Medium, Bold, Heavy, HeavyOblique) as OTF. Loaded via `@font-face` in `index.html`.
- `images/` — locally curated photos, served via GitHub Pages. Filename convention: `YYYYMMDD_VenueName_City_NN.ext`. `XX` means the value is not yet known.

### Firestore status
- **Events collection**: populated with 421 events for 1962.
- **Photos subcollection**: 7 new photo-session events created (not in Beatles Bible):
  - `1962-03-17` — Joan McEvoy's Home, Wandsworth Rd, Huyton (engagement party after St Patrick's Night Rock Gala)
  - `1962-05-30` — Astrid Kirchherr's Studio, Eimsbütteler Straße 45a, Altona, Hamburg (studio loft session)
  - `1962-06-02` — Hamburg Airport (departure at end of first Star-Club residency)
  - `1962-09-04` — Speke Airport, Liverpool (morning departure for London)
  - `1962-09-10` — Rushworths Music House, Whitechapel/Richmond St, Liverpool *(note: image filenames say 0908 but source confirms 10th)*
  - `1962-09-29` — Peter Kaye Studio 9, 174 Park Road, Liverpool 8 (professional photoshoot)
  - `1962-10-21` — 20 Forthlin Road, Liverpool (photos by Mike McCartney)
- **Security rules**: `read: true, write: false`. **Re-open writes before running any upload scripts**, then lock back down afterwards.

### Unresolved image questions
- `19620325_TheCasbah_WestDerby_*` (8 images) — files were originally dated March 24 but renamed to March 25. `1962-03-25` Casbah Club event confirmed in database. Ready to attach.
- `19620607_TheCavernClub_Liverpool.jpg` — no event in the database for June 7th. Needs investigation.

---

## Architecture decisions

### Data source — Firebase Firestore
Firestore is the live data source. `index.html` fetches from the `events` collection on load, and uses a `collectionGroup('photos')` query to identify which events have photos (for the camera icon in the list). Falls back to hardcoded placeholder data if Firestore returns nothing.

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
- `img` — string, direct URL to image file (GitHub Pages URL)
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
The owner gathers images manually. Filename convention: `YYYYMMDD_VenueName_City_NN.ext`. `XX` in any segment means the value is not yet known. Images are committed to `images/` and served via GitHub Pages. Run `scripts/attach-photos.mjs` to attach a new batch to Firestore (requires write rules to be open).

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
- Fonts: Futura Std (local OTF via `@font-face`), EB Garamond (Google Fonts)

### Design system
Design sourced from Figma. CSS is inline in `index.html` using CSS custom properties.

```css
:root {
  --ink:     #1d1d1d;
  --bg:      #c2d3e3;
  --surface: #ffffff;
  --border:  rgba(29,29,29,0.14);
  --muted:   rgba(29,29,29,0.45);

  --font-ui:   'Futura', 'Jost', sans-serif;
  --font-body: 'EB Garamond', serif;
}
```

**Six text styles in use:**
1. Topbar title — Futura 500, 12px, tracking 0.5em, uppercase
2. Date labels / badges / UI chrome — Futura 500, 9–10px, tracking 0.3–0.5em, uppercase
3. Entry / panel title — Futura 700, 13–16px, tracking 0.04em
4. Location / sublabel — Futura 300, 11–12px, tracking 0.04em
5. Description body — EB Garamond 400, 15px, tracking 0.03em
6. Stacked list date (day / month) — Futura 500, 10px, tracking 0.45em, uppercase

### Design principles
- Map is the most prominent element
- Timeline is prominent and allows navigation by time period
- Panel shows photo (with prev/next if multiple), date, location, short description, source link
- List entries show a camera icon (amber) on events that have photos
- Tooltips appear on map marker hover showing event title
- Edit form allows correction of any field
- Keep the UI minimal — show only what is necessary

### Photo display
- Photos load lazily when an event is selected
- Multiple photos per event: prev/next overlay buttons + `1 / N` counter
- Camera icon shown in list for events with photos (determined via `collectionGroup('photos')` query at startup)

### Map
- Leaflet with CartoDB light tiles
- Marker clustering needed for scale (Leaflet.markercluster plugin) — not yet implemented
- Active marker is larger/darker than inactive ones
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
- Security rules: **public read, no public write** (current). Re-open writes temporarily when running upload scripts.

---

## What has been tried and didn't work
- Fetching Beatles Bible pages directly — returns 403 (use browser console scraping instead)
- Fetching beatlesource.com pages directly — returns 415
- Hotlinking images from Beatles Bible — images fail to load (hotlink protection)
- Images from external URLs failing in Claude.ai chat — sandbox restriction only, not a real problem

---

## Next steps
1. Resolve the two unattached image groups (Casbah March 24, Cavern Club June 7)
2. Continue adding images — commit to `images/`, then run `scripts/attach-photos.mjs`
3. Implement journey navigation (prev/next with location-aware map movement)
4. Add marker clustering (Leaflet.markercluster)
5. Make timeline range dynamic based on loaded data
6. Expand to other years once 1962 is proven
