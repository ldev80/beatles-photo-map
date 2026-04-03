// upload-events.mjs
// Reads events-1962.json and uploads each event to Firestore.
// Requires Node 18+ (built-in fetch). Run: node scripts/upload-events.mjs

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROJECT_ID = 'beatles-photo-map';
const API_KEY    = 'AIzaSyBYNSAGPpD9UT7syoS0Wgvt2dKeMCYSzD0';
const ENDPOINT   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/events?key=${API_KEY}`;

// ── Venue geocodes ────────────────────────────────────────
// Keyed by the string that appears after "live: " in Beatles Bible titles,
// with any "(lunchtime)" / "(evening)" qualifiers stripped.
const VENUES = {
  'Cavern Club, Liverpool':                           { venue: 'Cavern Club',                 city: 'Liverpool',      lat: 53.4083, lng: -2.9917 },
  'Cavern Club. Liverpool':                           { venue: 'Cavern Club',                 city: 'Liverpool',      lat: 53.4083, lng: -2.9917 },
  'Star-Club, Hamburg':                               { venue: 'Star-Club',                   city: 'Hamburg',        lat: 53.5501, lng:  9.9607 },
  'Tower Ballroom, New Brighton, Wallasey':           { venue: 'Tower Ballroom',              city: 'New Brighton',   lat: 53.4358, lng: -3.0497 },
  'Casbah Coffee Club, Liverpool':                    { venue: 'Casbah Coffee Club',          city: 'Liverpool',      lat: 53.4284, lng: -2.9018 },
  'Majestic Ballroom, Birkenhead':                    { venue: 'Majestic Ballroom',           city: 'Birkenhead',     lat: 53.3920, lng: -3.0147 },
  'Kingsway Club, Southport':                         { venue: 'Kingsway Club',               city: 'Southport',      lat: 53.6450, lng: -3.0078 },
  'Plaza Ballroom, St Helens':                        { venue: 'Plaza Ballroom',              city: 'St Helens',      lat: 53.4560, lng: -2.7368 },
  'Riverpark Ballroom, Chester':                      { venue: 'Riverpark Ballroom',          city: 'Chester',        lat: 53.1920, lng: -2.8890 },
  "Queen's Hall, Widnes":                             { venue: "Queen's Hall",                city: 'Widnes',         lat: 53.3636, lng: -2.7302 },
  'Oasis Club, Manchester':                           { venue: 'Oasis Club',                  city: 'Manchester',     lat: 53.4808, lng: -2.2426 },
  'Technical College Hall, Birkenhead':               { venue: 'Technical College Hall',      city: 'Birkenhead',     lat: 53.3920, lng: -3.0147 },
  'Storyville Jazz Club, Liverpool':                  { venue: 'Storyville Jazz Club',        city: 'Liverpool',      lat: 53.4054, lng: -2.9804 },
  'Heswall Jazz Club, Wirral':                        { venue: 'Heswall Jazz Club',           city: 'Heswall',        lat: 53.3240, lng: -3.0980 },
  'Memorial Hall, Northwich':                         { venue: 'Memorial Hall',               city: 'Northwich',      lat: 53.2598, lng: -2.5199 },
  'Riverboat Shuffle, MV Royal Iris, River Mersey':   { venue: 'MV Royal Iris',               city: 'River Mersey',   lat: 53.4008, lng: -3.0001 },
  'Hulme Hall, Port Sunlight':                        { venue: 'Hulme Hall',                  city: 'Port Sunlight',  lat: 53.3616, lng: -3.0010 },
  "St Paul's Presbyterian Church Hall, Birkenhead":   { venue: "St Paul's Church Hall",       city: 'Birkenhead',     lat: 53.3904, lng: -3.0174 },
  'Floral Hall, Southport':                           { venue: 'Floral Hall',                 city: 'Southport',      lat: 53.6472, lng: -3.0063 },
  "St John's Hall, Bootle":                           { venue: "St John's Hall",              city: 'Bootle',         lat: 53.4450, lng: -2.9897 },
  'Odd Spot Club, Liverpool':                         { venue: 'Odd Spot Club',               city: 'Liverpool',      lat: 53.4054, lng: -2.9756 },
  'Subscription Rooms, Stroud':                       { venue: 'Subscription Rooms',          city: 'Stroud',         lat: 51.7445, lng: -2.2167 },
  'Majestic Ballroom, Crewe':                         { venue: 'Majestic Ballroom',           city: 'Crewe',          lat: 53.0979, lng: -2.4413 },
  'Rialto Ballroom, Liverpool':                       { venue: 'Rialto Ballroom',             city: 'Liverpool',      lat: 53.3978, lng: -2.9697 },
  'La Scala Ballroom, Runcorn':                       { venue: 'La Scala Ballroom',           city: 'Runcorn',        lat: 53.3419, lng: -2.7299 },
  'Hambleton Hall, Liverpool':                        { venue: 'Hambleton Hall',              city: 'Liverpool',      lat: 53.4154, lng: -2.8792 },
  'Aintree Institute, Liverpool':                     { venue: 'Aintree Institute',           city: 'Liverpool',      lat: 53.4734, lng: -2.9528 },
  'Thistle Cafe, West Kirby':                         { venue: 'Thistle Cafe',                city: 'West Kirby',     lat: 53.3729, lng: -3.1859 },
  'YMCA, Hoylake, Wirral':                            { venue: 'YMCA',                        city: 'Hoylake',        lat: 53.3780, lng: -3.1801 },
  'YMCA, Birkenhead':                                 { venue: 'YMCA',                        city: 'Birkenhead',     lat: 53.3920, lng: -3.0147 },
  'Knotty Ash Village Hall, Liverpool':               { venue: 'Knotty Ash Village Hall',     city: 'Liverpool',      lat: 53.4154, lng: -2.8792 },
  'Pavilion Theatre, Liverpool':                      { venue: 'Pavilion Theatre',            city: 'Liverpool',      lat: 53.4054, lng: -2.9807 },
  'Regent Dansette, Rhyl':                            { venue: 'Regent Dansette',             city: 'Rhyl',           lat: 53.3195, lng: -3.4924 },
  "McIlroy's Ballroom, Swindon":                      { venue: "McIlroy's Ballroom",          city: 'Swindon',        lat: 51.5610, lng: -1.7836 },
  'Bell Hall, Warrington':                            { venue: 'Bell Hall',                   city: 'Warrington',     lat: 53.3900, lng: -2.5973 },
  'Cabaret Club, Liverpool':                          { venue: 'Cabaret Club',                city: 'Liverpool',      lat: 53.4054, lng: -2.9804 },
  'Cambridge Hall, Southport':                        { venue: 'Cambridge Hall',              city: 'Southport',      lat: 53.6472, lng: -3.0063 },
  'Grafton Rooms, Liverpool':                         { venue: 'Grafton Rooms',               city: 'Liverpool',      lat: 53.4043, lng: -2.9597 },
  'Victoria Hall, Higher Bebington, Wirral':          { venue: 'Victoria Hall',               city: 'Higher Bebington', lat: 53.3535, lng: -3.0225 },
  'Co-op Ballroom, Doncaster':                        { venue: 'Co-op Ballroom',              city: 'Doncaster',      lat: 53.5228, lng: -1.1289 },
  'Marine Hall Ballroom, Fleetwood':                  { venue: 'Marine Hall Ballroom',        city: 'Fleetwood',      lat: 53.9215, lng: -3.0096 },
  'Floral Hall Ballroom, Morecambe':                  { venue: 'Floral Hall Ballroom',        city: 'Morecambe',      lat: 54.0731, lng: -2.8661 },
  'Town Hall, Lydney':                                { venue: 'Town Hall',                   city: 'Lydney',         lat: 51.7257, lng: -2.5293 },
  'Village Hall, Irby, Wirral':                       { venue: 'Village Hall',                city: 'Irby',           lat: 53.3604, lng: -3.1083 },
  'Co-operative Hall, Nuneaton':                      { venue: 'Co-operative Hall',           city: 'Nuneaton',       lat: 52.5232, lng: -1.4625 },
  'Majestic Ballroom, Hull':                          { venue: 'Majestic Ballroom',           city: 'Hull',           lat: 53.7457, lng: -0.3367 },
  'Public Hall, Preston':                             { venue: 'Public Hall',                 city: 'Preston',        lat: 53.7632, lng: -2.7035 },
  'Empire Theatre, Liverpool':                        { venue: 'Empire Theatre',              city: 'Liverpool',      lat: 53.4050, lng: -2.9834 },
  'Matrix Hall, Coventry':                            { venue: 'Matrix Hall',                 city: 'Coventry',       lat: 52.4068, lng: -1.5197 },
  'Adelphi Ballroom, West Bromwich':                  { venue: 'Adelphi Ballroom',            city: 'West Bromwich',  lat: 52.5181, lng: -1.9955 },
  'Smethwick Baths Ballroom, Smethwick':              { venue: 'Smethwick Baths Ballroom',    city: 'Smethwick',      lat: 52.4983, lng: -1.9858 },
  'Royal Lido Ballroom, Prestatyn':                   { venue: 'Royal Lido Ballroom',         city: 'Prestatyn',      lat: 53.3345, lng: -3.4060 },
  "527 Club, Lewis's, Liverpool":                     { venue: "527 Club, Lewis's",           city: 'Liverpool',      lat: 53.4054, lng: -2.9804 },
  'Town Hall, Newton-le-Willows':                     { venue: 'Town Hall',                   city: 'Newton-le-Willows', lat: 53.4557, lng: -2.6337 },
  'Embassy Cinema, Peterborough':                     { venue: 'Embassy Cinema',              city: 'Peterborough',   lat: 52.5739, lng: -0.2401 },
  "Club Django, Queen's Hotel, Southport":            { venue: "Club Django, Queen's Hotel",  city: 'Southport',      lat: 53.6450, lng: -3.0078 },
  'Corn Exchange, Bedford':                           { venue: 'Corn Exchange',               city: 'Bedford',        lat: 52.1363, lng: -0.4676 },
  'Music Hall, Shrewsbury':                           { venue: 'Music Hall',                  city: 'Shrewsbury',     lat: 52.7071, lng: -2.7545 },
};

// ── Non-live event overrides, keyed by date ───────────────
// Where multiple events share a date, keyed by date+partial title.
const BY_DATE = {
  '1962-01-01': { venue: 'Decca Studios',              city: 'London',      lat: 51.5468, lng: -0.1836 },
  '1962-02-08': { venue: 'BBC Broadcasting House',     city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-02-13': { venue: 'EMI House',                  city: 'London',      lat: 51.5166, lng: -0.1548 },
  '1962-03-07': { venue: 'BBC Broadcasting House',     city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-04-10': { venue: 'Huisarztpraxis Hamburg',     city: 'Hamburg',     lat: 53.5503, lng:  9.9900 },
  '1962-04-11': { venue: 'Hamburg Airport',            city: 'Hamburg',     lat: 53.6304, lng:  9.9882 },
  '1962-04-12': { venue: 'Hamburg Airport',            city: 'Hamburg',     lat: 53.6304, lng:  9.9882 },
  '1962-05-09': { venue: 'NEMS Enterprises',           city: 'Liverpool',   lat: 53.4050, lng: -2.9834 },
  '1962-05-24': { venue: 'Friedrich-Ebert-Halle',      city: 'Hamburg',     lat: 53.5024, lng:  9.8507 },
  '1962-06-03': { venue: 'Cavern Club',                city: 'Liverpool',   lat: 53.4083, lng: -2.9917 },
  '1962-06-04': { venue: 'Cavern Club',                city: 'Liverpool',   lat: 53.4083, lng: -2.9917 },
  '1962-06-06': { venue: 'Abbey Road Studios',         city: 'London',      lat: 51.5320, lng: -0.1783 },
  '1962-06-11': { venue: 'BBC Broadcasting House',     city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-08-16': { venue: 'NEMS Enterprises',           city: 'Liverpool',   lat: 53.4050, lng: -2.9834 },
  '1962-08-23': { venue: 'Mount Pleasant Register Office', city: 'Liverpool', lat: 53.4058, lng: -2.9660 },
  '1962-09-04': { venue: 'Abbey Road Studios',         city: 'London',      lat: 51.5320, lng: -0.1783 },
  '1962-09-11': { venue: 'Abbey Road Studios',         city: 'London',      lat: 51.5320, lng: -0.1783 },
  '1962-10-01': { venue: 'EMI House',                  city: 'London',      lat: 51.5166, lng: -0.1548 },
  '1962-10-05': { venue: 'NEMS Enterprises',           city: 'Liverpool',   lat: 53.4050, lng: -2.9834 },
  '1962-10-08': { venue: 'BBC Piccadilly',             city: 'London',      lat: 51.5097, lng: -0.1356 },
  '1962-10-09': { venue: 'EMI House',                  city: 'London',      lat: 51.5166, lng: -0.1548 },
  '1962-10-17': { venue: 'Granada TV Studios',         city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-10-21': { venue: 'Tower Ballroom',             city: 'New Brighton', lat: 53.4358, lng: -3.0497 },
  '1962-10-25': { venue: 'BBC Broadcasting House',     city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-10-27': { venue: 'BBC Broadcasting House',     city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-10-29': { venue: 'Granada TV Studios',         city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-11-16': { venue: 'BBC Piccadilly',             city: 'London',      lat: 51.5097, lng: -0.1356 },
  '1962-11-23': { venue: "St James's Church Hall",     city: 'London',      lat: 51.5020, lng: -0.1360 },
  '1962-11-26': { venue: 'Abbey Road Studios',         city: 'London',      lat: 51.5320, lng: -0.1783 },
  '1962-11-27': { venue: 'BBC Piccadilly',             city: 'London',      lat: 51.5097, lng: -0.1356 },
  '1962-11-30': { venue: 'Abbey Road Studios',         city: 'London',      lat: 51.5320, lng: -0.1783 },
  '1962-12-03': { venue: 'TWW Studios',                city: 'Bristol',     lat: 51.4545, lng: -2.5879 },
  '1962-12-04': { venue: 'Associated-Rediffusion Studios', city: 'London',  lat: 51.5074, lng: -0.1278 },
  '1962-12-17': { venue: 'Granada TV Studios',         city: 'Manchester',  lat: 53.4768, lng: -2.2395 },
  '1962-12-25': { venue: 'Star-Club',                  city: 'Hamburg',     lat: 53.5501, lng:  9.9607 },
  '1962-12-31': { venue: 'Liverpool',                  city: 'Liverpool',   lat: 53.4083, lng: -2.9917 },
};

// Travel events: use destination city
const TRAVEL_DEST = {
  '1962-06-02': { venue: 'Liverpool',   city: 'Liverpool', lat: 53.4083, lng: -2.9917 }, // Hamburg→Liverpool
  '1962-06-05': { venue: 'London',      city: 'London',    lat: 51.5074, lng: -0.1278 }, // Liverpool→London
  '1962-10-30': { venue: 'Hamburg',     city: 'Hamburg',   lat: 53.5503, lng:  9.9900 }, // Liverpool→Hamburg
  '1962-11-15': { venue: 'Liverpool',   city: 'Liverpool', lat: 53.4083, lng: -2.9917 }, // Hamburg→Liverpool
  '1962-12-18': { venue: 'Hamburg',     city: 'Hamburg',   lat: 53.5503, lng:  9.9900 }, // Liverpool→Hamburg
};

// Autograph signing events
const AUTOGRAPH = {
  venue: 'Dawson\'s Music Shop', city: 'Widnes', lat: 53.3636, lng: -2.7302,
};

// ── Helpers ───────────────────────────────────────────────
// Normalise curly/smart apostrophes to straight so keys match regardless of source encoding
function normaliseApos(s) {
  return s.replace(/[\u2018\u2019\u02BC]/g, "'");
}

function parseLiveTitle(title) {
  // "The Beatles live: VENUE[, CITY][ (qualifier)]"  or
  // "Rehearsal: VENUE" or "Radio audition: VENUE"
  const m = title.match(/^(?:The Beatles live|Rehearsal|Radio audition):\s+(.+?)(?:\s*–.*)?$/i);
  if (!m) return null;
  // Strip trailing qualifier like " (lunchtime)" but keep " – Pete Best's final show" as note
  let raw = m[1].replace(/\s*\((lunchtime|evening|afternoon|matinée)\)\s*$/i, '').trim();
  // Some entries have " – NOTE" appended to the venue string
  const noteMatch = raw.match(/^(.+?)\s+–\s+(.+)$/);
  let note = '';
  if (noteMatch) {
    raw = noteMatch[1].trim();
    note = noteMatch[2].trim();
  }
  const geo = VENUES[normaliseApos(raw)];
  return geo ? { ...geo, note } : null;
}

function qualifierFromTitle(title) {
  const m = title.match(/\((lunchtime|evening|afternoon|matinée)\)/i);
  return m ? m[1].toLowerCase() : '';
}

function toFirestoreDoc(fields) {
  const convert = v => {
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'number') return { doubleValue: v };
    return { stringValue: String(v) };
  };
  return { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, convert(v)])) };
}

async function uploadDoc(data) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(join(ROOT, 'events-1962.json'), 'utf-8'));
const ungeocoded = [];
let uploaded = 0, skipped = 0, errors = 0;

console.log(`\nUploading ${raw.length} events to Firestore…\n`);

for (const e of raw) {
  const isLive = /^The Beatles live:/i.test(e.title);
  const isRehearsal = /^Rehearsal:/i.test(e.title);
  const isRadioAudition = /^Radio audition:/i.test(e.title);
  const isTravel = /^Travel:/i.test(e.title);
  const isAutograph = /^Autograph signing:/i.test(e.title);

  let geo = null;
  let desc = '';
  let qualifier = '';

  if (isLive || isRehearsal || isRadioAudition) {
    const parsed = parseLiveTitle(e.title);
    if (parsed) {
      geo = parsed;
      qualifier = qualifierFromTitle(e.title);
      if (parsed.note) desc = parsed.note;
    } else {
      // Venue not in lookup — fall back to date-based override
      geo = BY_DATE[e.date] || null;
    }
  } else if (isTravel) {
    geo = TRAVEL_DEST[e.date] || null;
  } else if (isAutograph) {
    geo = AUTOGRAPH;
  } else {
    geo = BY_DATE[e.date] || null;
  }

  if (!geo) {
    ungeocoded.push(e);
    console.log(`  ⚠  No geocode: ${e.date}  ${e.title}`);
    skipped++;
    continue;
  }

  // Build clean venue string — for live events, append qualifier if present
  const venueDisplay = qualifier ? `${geo.venue} (${qualifier})` : geo.venue;

  const doc = {
    date:   e.date,
    venue:  venueDisplay,
    city:   geo.city,
    lat:    geo.lat,
    lng:    geo.lng,
    desc:   desc,
    source: e.source,
    title_bb: e.title,  // original Beatles Bible title, for reference
  };

  try {
    await uploadDoc(doc);
    uploaded++;
    process.stdout.write(`  ✓  ${e.date}  ${venueDisplay}, ${geo.city}\n`);
  } catch (err) {
    errors++;
    console.error(`  ✗  ${e.date}  ${e.title}\n     ${err.message}`);
  }

  await delay(60); // stay well within Firestore free-tier write limits
}

console.log(`\n── Summary ──────────────────────────────────────`);
console.log(`  Uploaded:   ${uploaded}`);
console.log(`  Skipped:    ${skipped}  (no geocode)`);
console.log(`  Errors:     ${errors}`);
console.log(`─────────────────────────────────────────────────\n`);

if (ungeocoded.length) {
  const outPath = join(ROOT, 'ungeocoded.json');
  writeFileSync(outPath, JSON.stringify(ungeocoded, null, 2));
  console.log(`Ungeocoded events written to ungeocoded.json — review and re-run.\n`);
}
