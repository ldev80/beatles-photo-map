// dedupe-events.mjs
//
// Finds duplicate event documents in Firestore (same date + venue + city)
// and deletes all but the one with the most photos attached.
//
// Safe to run multiple times — only deletes confirmed duplicates.
// Prints a dry-run summary first, then asks for confirmation.
//
// Run: node scripts/dedupe-events.mjs
// Dry run only: node scripts/dedupe-events.mjs --dry-run

const DRY_RUN = process.argv.includes('--dry-run');

const PROJECT_ID = 'beatles-photo-map';
const API_KEY    = 'AIzaSyBYNSAGPpD9UT7syoS0Wgvt2dKeMCYSzD0';
const BASE       = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getAllEvents() {
  const res = await fetch(`${BASE}/events?key=${API_KEY}&pageSize=500`);
  if (!res.ok) throw new Error(`Failed to fetch events: HTTP ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(doc => ({
    id:    doc.name.split('/').pop(),
    name:  doc.name,
    date:  doc.fields?.date?.stringValue  ?? '',
    venue: doc.fields?.venue?.stringValue ?? '',
    city:  doc.fields?.city?.stringValue  ?? '',
  }));
}

async function getPhotoCount(eventId) {
  const res = await fetch(`${BASE}/events/${eventId}/photos?key=${API_KEY}&pageSize=500`);
  if (!res.ok) return 0;
  const data = await res.json();
  return (data.documents || []).length;
}

async function deleteEvent(eventId) {
  const res = await fetch(`${BASE}/events/${eventId}?key=${API_KEY}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete ${eventId}: HTTP ${res.status}`);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────

console.log('\nFetching all events…');
const events = await getAllEvents();
console.log(`  ${events.length} events loaded\n`);

// Group by date|venue|city
const groups = new Map();
for (const e of events) {
  const key = `${e.date}|${e.venue}|${e.city}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e);
}

const dupeGroups = [...groups.values()].filter(g => g.length > 1);

if (dupeGroups.length === 0) {
  console.log('No duplicates found. Nothing to do.\n');
  process.exit(0);
}

console.log(`Found ${dupeGroups.length} duplicate group(s):\n`);

// For each group, fetch photo counts to decide which to keep
const toDelete = [];

for (const group of dupeGroups) {
  console.log(`  ${group[0].date}  ${group[0].venue}, ${group[0].city}  (${group.length} copies)`);

  const counts = await Promise.all(group.map(e => getPhotoCount(e.id)));
  await delay(100);

  group.forEach((e, i) => console.log(`    ${e.id}  →  ${counts[i]} photo(s)`));

  // Keep the one with the most photos; on a tie keep the first (oldest doc)
  const maxPhotos = Math.max(...counts);
  const keepIndex = counts.indexOf(maxPhotos);

  group.forEach((e, i) => {
    if (i !== keepIndex) toDelete.push(e);
  });

  console.log(`    ✓ keeping ${group[keepIndex].id}\n`);
}

console.log(`Will delete ${toDelete.length} duplicate document(s).`);

if (DRY_RUN) {
  console.log('\n-- DRY RUN — no changes made. Re-run without --dry-run to apply.\n');
  process.exit(0);
}

console.log('\nDeleting…\n');
let deleted = 0, errors = 0;

for (const e of toDelete) {
  try {
    await deleteEvent(e.id);
    console.log(`  ✓ deleted ${e.id}  (${e.date}  ${e.venue})`);
    deleted++;
  } catch (err) {
    console.error(`  ✗ ${e.id}: ${err.message}`);
    errors++;
  }
  await delay(80);
}

console.log(`
── Summary ──────────────────────────────────────────────
  Deleted:  ${deleted}
  Errors:   ${errors}
─────────────────────────────────────────────────────────
`);
