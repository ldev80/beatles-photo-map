// attach-photos.mjs
//
// Step 1 — Creates seven new photo-session events in Firestore:
//   1962-03-17  Joan McEvoy's Home, Huyton
//   1962-05-30  Astrid Kirchherr's Studio, Altona, Hamburg
//   1962-06-02  Hamburg Airport (departure)
//   1962-09-04  Speke Airport, Liverpool
//   1962-09-10  Rushworths Music House, Liverpool  ← source URL confirms 10th, not 8th
//   1962-09-29  Peter Kaye Studio 9, Park Road, Liverpool
//   1962-10-21  20 Forthlin Road, Liverpool
//
// Step 2 — Attaches all well-labelled images to their matching Firestore events
//          via the photos subcollection.
//
// Image URLs use GitHub Pages:
//   https://ldev80.github.io/beatles-photo-map/images/<filename>
// Make sure images/ is committed and pushed to the repo before running.
//
// Run: node scripts/attach-photos.mjs

import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'images');

const PROJECT_ID = 'beatles-photo-map';
const API_KEY    = 'AIzaSyBYNSAGPpD9UT7syoS0Wgvt2dKeMCYSzD0';
const BASE       = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const IMAGE_BASE = 'https://ldev80.github.io/beatles-photo-map/images';

// ── Firestore helpers ─────────────────────────────────────────────────────

function toDoc(fields) {
  const convert = v => {
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'number') return { doubleValue: v };
    return { stringValue: String(v) };
  };
  return { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, convert(v)])) };
}

async function queryEventsByDate(date) {
  const res = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'events' }],
        where: { fieldFilter: { field: { fieldPath: 'date' }, op: 'EQUAL', value: { stringValue: date } } },
      },
    }),
  });
  if (!res.ok) throw new Error(`Query ${date}: HTTP ${res.status}`);
  const results = await res.json();
  return results
    .filter(r => r.document)
    .map(r => ({
      id:    r.document.name.split('/').pop(),
      venue: r.document.fields.venue?.stringValue ?? '',
      city:  r.document.fields.city?.stringValue  ?? '',
    }));
}

// Pick the candidate whose venue field best matches the hint string.
function bestMatch(candidates, venueHint) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const hint = venueHint.toLowerCase();
  return (
    candidates.find(c => c.venue.toLowerCase().includes(hint)) ??
    candidates[0]
  );
}

async function createEvent(data) {
  const res = await fetch(`${BASE}/events?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoc(data)),
  });
  if (!res.ok) throw new Error(`createEvent: HTTP ${res.status}: ${await res.text()}`);
  const doc = await res.json();
  return doc.name.split('/').pop();
}

async function addPhoto(eventId, data) {
  const res = await fetch(`${BASE}/events/${eventId}/photos?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoc(data)),
  });
  if (!res.ok) throw new Error(`addPhoto: HTTP ${res.status}: ${await res.text()}`);
}

// ── Image helpers ─────────────────────────────────────────────────────────

const allImages = readdirSync(IMAGES_DIR);

// Returns sorted filenames that start with prefix (case-insensitive on extension)
function imgs(prefix) {
  return allImages.filter(f => f.startsWith(prefix)).sort();
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Photo groups ──────────────────────────────────────────────────────────
//
// Each group is one of:
//   { newEvent: {...}, images: [...] }        — create event, then attach photos
//   { date, venueHint, images: [...] }        — find existing event, attach photos

const GROUPS = [

  // ── New events ───────────────────────────────────────────────────────────

  {
    newEvent: {
      date:     '1962-05-30',
      venue:    "Astrid Kirchherr's Studio",
      city:     'Hamburg',
      lat:      53.5680,
      lng:      9.9485,
      desc:     "These photos were taken in Astrid's studio loft shortly after The Beatles arrived in Hamburg.",
      source:   '',
    },
    images: imgs('19620530_AstridKircherrsHouse_Hamburg'),
  },

  {
    newEvent: {
      date:     '1962-06-02',
      venue:    'Hamburg Airport',
      city:     'Hamburg',
      lat:      53.6304,
      lng:      9.9882,
      desc:     'The Beatles depart Hamburg Airport at the end of their first Star-Club residency.',
      source:   '',
    },
    images: imgs('19620602_HamburgAirport_Hamburg'),
  },

  {
    newEvent: {
      date:     '1962-03-17',
      venue:    "Joan McEvoy's Home",
      city:     'Huyton',
      lat:      53.4110,
      lng:      -2.8547,
      desc:     "Engagement party for promoter Sam Leach and his fiancée Joan McEvoy, held at her home on Wandsworth Road after the St Patrick's Night Rock Gala at Knotty Ash Village Hall.",
      source:   'https://www.beatlesbible.com/1962/03/17/live-knotty-ash-village-hall-liverpool-6/',
    },
    images: imgs('19620317_JoanMcEvoyHome_Huyton'),
  },

  {
    newEvent: {
      date:     '1962-09-04',
      venue:    'Speke Airport',
      city:     'Liverpool',
      lat:      53.3369,
      lng:      -2.8497,
      desc:     'Morning departure from Speke Airport, Liverpool, en route to London for the Love Me Do / How Do You Do It recording session at Abbey Road Studios.',
      source:   'https://www.beatlesbible.com/1962/09/04/recording-how-do-you-do-it-love-me-do/',
    },
    images: imgs('19620904_SpekeAirport_Liverpool'),
  },

  {
    newEvent: {
      date:     '1962-09-29',
      venue:    'Peter Kaye Studio 9',
      city:     'Liverpool',
      lat:      53.3877,
      lng:      -2.9712,
      desc:     'Professional photo session at Peter Kaye\'s Studio 9, 174 Park Road, Liverpool 8.',
      source:   '',
    },
    images: imgs('19620929_PeterKayeStudio_Liverpool'),
  },

  {
    // Source URL confirms 10 September, not 8th as the image filenames suggest.
    newEvent: {
      date:     '1962-09-10',
      venue:    'Rushworths Music House',
      city:     'Liverpool',
      lat:      53.4075,
      lng:      -2.9817,
      desc:     'Photo session at Rushworths Music House on the corner of Whitechapel and Richmond Street.',
      source:   'https://www.beatlesource.com/savage/1962/62.09.10%20rushworths/62.09.10rushworths.html',
    },
    images: imgs('19620908_RushworthsMusicHouse_Liverpool'),
  },

  {
    newEvent: {
      date:     '1962-10-21',
      venue:    '20 Forthlin Road',
      city:     'Liverpool',
      lat:      53.3767,
      lng:      -2.8956,
      desc:     "Photo session at Paul McCartney's family home, 20 Forthlin Road, Allerton. Photographs by Mike McCartney.",
      source:   '',
    },
    images: imgs('19621021_ForthlinRd_Liverpool'),
  },

  // ── Existing events ───────────────────────────────────────────────────────

  {
    date: '1962-03-25',
    venueHint: 'Casbah',
    images: imgs('19620325_TheCasbah_WestDerby'),
  },

  {
    date: '1962-03-02',
    venueHint: 'Tower Ballroom',
    images: imgs('19620302_TowerBallroom_NewBrighton'),
  },

  {
    date: '1962-03-07',
    venueHint: 'BBC',
    images: imgs('19620307_BroadcastingHouse_Manchester'),
  },

  {
    date: '1962-04-05',
    venueHint: 'Cavern Club (evening)',
    images: imgs('19620405_TheCavernClub_Liverpool'),
  },

  {
    date: '1962-06-03',
    venueHint: 'Cavern Club',
    images: imgs('19620603_TheCavernClub_Liverpool'),
  },

  {
    date: '1962-06-11',
    venueHint: 'BBC',
    images: imgs('19620611_PlayhouseTheatre_Manchester'),
  },

  {
    date: '1962-07-01',
    venueHint: 'Cavern Club (evening)',
    images: imgs('19620701_TheCavernClub_Liverpool'),
  },

  {
    date: '1962-07-06',
    venueHint: 'Royal Iris',
    images: imgs('19620706_RoyalIris_RiverMersey'),
  },

  {
    date: '1962-07-07',
    venueHint: 'Hulme Hall',
    images: imgs('19620707_HulmeHall_PortSunlight'),
  },

  {
    date: '1962-07-27',
    venueHint: 'Tower Ballroom',
    images: imgs('19620727_TowerBallroom_NewBrighton'),
  },

  {
    date: '1962-07-28',
    venueHint: 'Majestic Ballroom',
    images: imgs('19620728_MajesticBallroom_Birkenhead'),
  },

  {
    date: '1962-08-07',
    venueHint: 'Cavern Club (evening)',
    images: imgs('19620807_TheCavernClub_Liverpool'),
  },

  {
    date: '1962-08-22',
    // Lunchtime was the first TV appearance; evening was Pete Best's last Cavern show.
    // Attaching to evening — adjust manually if you know which session these are from.
    venueHint: 'Cavern Club (evening)',
    images: imgs('19620822_TheCavernClub_Liverpool'),
  },

  {
    date: '1962-09-04',
    venueHint: 'Abbey Road',
    images: imgs('19620904_EMIStudios_London'),
  },

  {
    date: '1962-09-07',
    venueHint: 'Village Hall',
    images: imgs('19620907_VillageHall_Irby'),
  },

  {
    date: '1962-09-21',
    venueHint: 'Tower Ballroom',
    images: imgs('19620921_TowerBallroom_XX'),
  },

  {
    date: '1962-10-12',
    venueHint: 'Tower Ballroom',
    images: imgs('19621012_TowerBallroom_NewBrighton'),
  },

  {
    date: '1962-10-27',
    venueHint: 'Hulme Hall',
    images: imgs('19621027_HulmeHall_PortSunlight'),
  },

  {
    // Newton-le-Willows was historically known as Earlestown — all three filename
    // variants (TownHall_Newton-le-Willows, EarlestonTownHall_XX, Earlestown_XX)
    // refer to the same event.
    date: '1962-11-30',
    venueHint: 'Town Hall',
    images: [
      ...imgs('19621130_TownHall_Newton-le-Willows'),
      ...imgs('19621130_EarlestonTownHall_XX'),
      ...imgs('19621130_Earlestown_XX'),
    ],
  },

  {
    // Includes the _Birkenhead_02 file and the three _XX variants — same event.
    date: '1962-12-15',
    venueHint: 'Majestic Ballroom',
    images: [
      ...imgs('19621215_TheMajesticBallroom_Birkenhead'),
      ...imgs('19621215_TheMajesticBallroom_XX'),
    ],
  },

  {
    date: '1962-12-04',
    venueHint: 'Wembley',
    images: imgs('19621204_WembleyStudios_London'),
  },

  {
    date: '1962-12-16',
    venueHint: 'Cavern Club (evening)',
    images: imgs('19621216_TheCavernClub_Liverpool'),
  },

  {
    date: '1962-12-18',
    venueHint: 'Star-Club',
    images: imgs('19621218_XX_Hamburg'),
  },

  {
    date: '1962-12-23',
    venueHint: 'Star-Club',
    images: imgs('19621223_XX_Hamburg'),
  },

];

// ── Main ──────────────────────────────────────────────────────────────────

let created = 0, attached = 0, errors = 0;

console.log(`\nProcessing ${GROUPS.length} photo groups…\n`);

for (const group of GROUPS) {
  let eventId;
  let label;

  try {
    if (group.newEvent) {
      eventId = await createEvent(group.newEvent);
      label   = `NEW  ${group.newEvent.date}  ${group.newEvent.venue}, ${group.newEvent.city}`;
      created++;
    } else {
      const candidates = await queryEventsByDate(group.date);
      const match      = bestMatch(candidates, group.venueHint);
      if (!match) {
        console.warn(`  ⚠  No event found: ${group.date}  "${group.venueHint}" — skipping`);
        errors++;
        continue;
      }
      eventId = match.id;
      label   = `     ${group.date}  ${match.venue}, ${match.city}`;
    }
  } catch (err) {
    console.error(`  ✗  ${group.newEvent?.date ?? group.date}: ${err.message}`);
    errors++;
    continue;
  }

  process.stdout.write(`  ✓  ${label}`);

  for (const filename of group.images) {
    try {
      await addPhoto(eventId, { img: `${IMAGE_BASE}/${filename}` });
      attached++;
      await delay(60);
    } catch (err) {
      console.error(`\n     ✗  ${filename}: ${err.message}`);
      errors++;
    }
  }

  console.log(`  (${group.images.length} photos)`);
  await delay(100);
}

console.log(`
── Summary ──────────────────────────────────────────────
  Events created:  ${created}
  Photos attached: ${attached}
  Errors:          ${errors}
─────────────────────────────────────────────────────────
`);
