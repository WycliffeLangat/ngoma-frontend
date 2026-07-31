import fs from "node:fs";

const queuePath =
  "C:/Users/HP/Desktop/Ngoma Charts Folder/files/ngoma_charts_backend/backend/.tmp/remaining_alert_queues.json";
const outPath =
  "C:/Users/HP/Desktop/Ngoma Charts Folder/files/ngoma_charts_backend/backend/.tmp/remaining_artist_country_research.json";
const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));

const countryNameOverrides = new Map([
  ["United States of America", ["United States", "US"]],
  ["United Kingdom", ["United Kingdom", "GB"]],
  ["Democratic Republic of the Congo", ["DR Congo", "CD"]],
  ["Republic of the Congo", ["Republic of the Congo", "CG"]],
  ["South Korea", ["South Korea", "KR"]],
  ["Ivory Coast", ["Côte d'Ivoire", "CI"]],
]);

const manualSeeds = {
  "Arrow Bwoy": ["Kenya", "KE", "Nairobi, Kenya", "Afro-pop; dancehall", "https://www.musicinafrica.net/directory/arrow-bwoy"],
  "B2k Mnyama": ["Tanzania", "TZ", "Dar es Salaam, Tanzania", "Bongo Flava", "https://music.apple.com/tz/artist/b2k-mnyama/1490990572"],
  "Balloranking": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats; street-pop", "https://www.musicinafrica.net/directory/balloranking"],
  "Boohle": ["South Africa", "ZA", "Vosloorus, South Africa", "Amapiano", "https://music.apple.com/us/artist/boohle/1454569417"],
  "Brick & Lace": ["Jamaica", "JM", "Kingston, Jamaica", "Dancehall; R&B", "https://www.allmusic.com/artist/brick-lace-mn0000642562"],
  "Bryson Tiller": ["United States", "US", "Louisville, KY, United States", "R&B/Soul", "https://music.apple.com/us/artist/bryson-tiller/962266584"],
  "Busy Signal": ["Jamaica", "JM", "St Ann Parish, Jamaica", "Dancehall; reggae", "https://music.apple.com/us/artist/busy-signal/209487914"],
  "CeCe Winans": ["United States", "US", "Detroit, MI, United States", "Gospel", "https://music.apple.com/us/artist/cece-winans/16162"],
  "Christopher Martin": ["Jamaica", "JM", "St Catherine, Jamaica", "Reggae; dancehall", "https://music.apple.com/us/artist/christopher-martin/72429116"],
  "David Guetta": ["France", "FR", "Paris, France", "Dance; electronic", "https://music.apple.com/us/artist/david-guetta/5557599"],
  "Dexta Daps": ["Jamaica", "JM", "Kingston, Jamaica", "Dancehall; reggae", "https://music.apple.com/us/artist/dexta-daps/706951612"],
  "DJ Khaled": ["United States", "US", "Miami, FL, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/dj-khaled/157434"],
  "DJ Snake": ["France", "FR", "Paris, France", "Dance; electronic", "https://music.apple.com/us/artist/dj-snake/125742557"],
  "DJ Tunez": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats; DJ", "https://music.apple.com/us/artist/dj-tunez/973894308"],
  "Djo": ["United States", "US", "Chicago, IL, United States", "Alternative", "https://music.apple.com/us/artist/djo/1384579987"],
  "Eemoh": ["South Africa", "ZA", "South Africa", "Amapiano", "https://music.apple.com/za/artist/eemoh/1482628196"],
  "EMIN": ["Azerbaijan", "AZ", "Baku, Azerbaijan", "Pop", "https://music.apple.com/us/artist/emin/375643927"],
  "Fameye": ["Ghana", "GH", "Accra, Ghana", "Afrobeats; highlife", "https://www.musicinafrica.net/directory/fameye"],
  "Famous Pluto": ["Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/ng/artist/famous-pluto/1545122663"],
  "Fena Gitu": ["Kenya", "KE", "Nairobi, Kenya", "Urban soul; Afro-pop", "https://www.musicinafrica.net/directory/fena-gitu"],
  "Fik Fameica": ["Uganda", "UG", "Kampala, Uganda", "Hip-hop; Afro-pop", "https://www.musicinafrica.net/directory/fik-fameica"],
  "Frida Amani": ["Tanzania", "TZ", "Dar es Salaam, Tanzania", "Hip-hop", "https://www.musicinafrica.net/directory/frida-amani"],
  "Gaise Baba": ["Nigeria", "NG", "Lagos, Nigeria", "Gospel; Afro-fusion", "https://www.musicinafrica.net/directory/gaise-baba"],
  "Harry Belafonte": ["United States", "US", "New York, NY, United States", "Calypso; folk", "https://music.apple.com/us/artist/harry-belafonte/44112"],
  "I-Octane": ["Jamaica", "JM", "Sandy Bay, Jamaica", "Reggae; dancehall", "https://music.apple.com/us/artist/i-octane/284434196"],
  "Ice Prince": ["Nigeria", "NG", "Jos, Nigeria", "Hip-hop", "https://music.apple.com/us/artist/ice-prince/389528887"],
  "Indila": ["France", "FR", "Paris, France", "French pop", "https://music.apple.com/us/artist/indila/365485168"],
  "IShowSpeed": ["United States", "US", "Cincinnati, OH, United States", "Hip-Hop/Rap; internet personality", "https://music.apple.com/us/artist/ishowspeed/1576146671"],
  "J Hus": ["United Kingdom", "GB", "London, England", "Hip-Hop/Rap", "https://music.apple.com/us/artist/j-hus/1101587937"],
  "JAE5": ["United Kingdom", "GB", "London, England", "Afrobeats; producer", "https://music.apple.com/us/artist/jae5/1475854901"],
  "John Holt": ["Jamaica", "JM", "Kingston, Jamaica", "Reggae; rocksteady", "https://music.apple.com/us/artist/john-holt/783961"],
  "Jovial": ["Kenya", "KE", "Mombasa, Kenya", "Afro-pop", "https://www.musicinafrica.net/directory/jovial"],
  "Justin Bieber": ["Canada", "CA", "Stratford, Ontario, Canada", "Pop", "https://music.apple.com/us/artist/justin-bieber/320569549"],
  "Kali Uchis": ["United States", "US", "Alexandria, VA, United States", "R&B/Soul; pop", "https://music.apple.com/us/artist/kali-uchis/894731301"],
  "Kedjevara": ["Côte d'Ivoire", "CI", "Abidjan, Côte d'Ivoire", "Coupé-décalé", "https://music.apple.com/us/artist/kedjevara/381823962"],
  "Kelvin Momo": ["South Africa", "ZA", "Soweto, South Africa", "Amapiano", "https://music.apple.com/us/artist/kelvin-momo/1458403100"],
  "Key Glock": ["United States", "US", "Memphis, TN, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/key-glock/1048375180"],
  "KiDi": ["Ghana", "GH", "Accra, Ghana", "Afrobeats; highlife", "https://www.musicinafrica.net/directory/kidi"],
  "KITSCHKRIEG": ["Germany", "DE", "Berlin, Germany", "Hip-hop; production", "https://music.apple.com/us/artist/kitschkrieg/1069966449"],
  "Kusah": ["Tanzania", "TZ", "Dar es Salaam, Tanzania", "Bongo Flava", "https://www.musicinafrica.net/directory/kusah"],
  "Kweku Smoke": ["Ghana", "GH", "Kumasi, Ghana", "Hip-hop; drill", "https://music.apple.com/us/artist/kweku-smoke/1487483337"],
  "Lasmid": ["Ghana", "GH", "Takoradi, Ghana", "Afrobeats; highlife", "https://www.musicinafrica.net/directory/lasmid"],
  "Lecrae": ["United States", "US", "Houston, TX, United States", "Christian hip-hop", "https://music.apple.com/us/artist/lecrae/15230611"],
  "Lucky Dube": ["South Africa", "ZA", "Ermelo, South Africa", "Reggae", "https://music.apple.com/us/artist/lucky-dube/474139"],
  "M Huncho": ["United Kingdom", "GB", "London, England", "Hip-Hop/Rap", "https://music.apple.com/us/artist/m-huncho/1226613001"],
  "M'Du": ["South Africa", "ZA", "South Africa", "Kwaito", "https://music.apple.com/za/artist/mdu/281878078"],
  "Madilu System": ["DR Congo", "CD", "Kinshasa, DR Congo", "Congolese rumba; soukous", "https://music.apple.com/us/artist/madilu-system/30815123"],
  "Major League DJz": ["South Africa", "ZA", "Johannesburg, South Africa", "Amapiano; DJ", "https://music.apple.com/us/artist/major-league-djz/580528964"],
  "Masego": ["United States", "US", "Virginia, United States", "R&B/Soul; jazz", "https://music.apple.com/us/artist/masego/674485551"],
  "Masicka": ["Jamaica", "JM", "Kingston, Jamaica", "Dancehall", "https://music.apple.com/us/artist/masicka/542750597"],
  "Mr Eazi": ["Nigeria", "NG", "Port Harcourt, Nigeria", "Afrobeats; Banku music", "https://music.apple.com/us/artist/mr-eazi/490466661"],
  "Mr Nice": ["Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/tz/artist/mr-nice/89969925"],
  "Muyeez": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats", "https://music.apple.com/ng/artist/muyeez/1732381145"],
  "Naira Marley": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats; street-pop", "https://music.apple.com/us/artist/naira-marley/365997599"],
  "Nas": ["United States", "US", "Queens, NY, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/nas/35307"],
  "Nemzzz": ["United Kingdom", "GB", "Manchester, England", "Hip-Hop/Rap", "https://music.apple.com/us/artist/nemzzz/1497377979"],
  "NF": ["United States", "US", "Gladwin, MI, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/nf/898094630"],
  "NLE Choppa": ["United States", "US", "Memphis, TN, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/nle-choppa/1441529793"],
  "Noah Kahan": ["United States", "US", "Strafford, VT, United States", "Singer-songwriter", "https://music.apple.com/us/artist/noah-kahan/1217322902"],
  "Notnice": ["Jamaica", "JM", "Jamaica", "Dancehall; producer", "https://music.apple.com/us/artist/notnice/336179189"],
  "Odeal": ["United Kingdom", "GB", "London, England", "R&B/Soul; Afrobeats", "https://music.apple.com/us/artist/odeal/1164700032"],
  "Omega 256": ["Uganda", "UG", "Uganda", "Afro-pop", "https://www.musicinafrica.net/directory/omega-256"],
  "Oscar Mbo": ["South Africa", "ZA", "Pretoria, South Africa", "Deep house", "https://music.apple.com/us/artist/oscar-mbo/1331771625"],
  "R2Bees": ["Ghana", "GH", "Tema, Ghana", "Afrobeats; hiplife", "https://music.apple.com/us/artist/r2bees/467782879"],
  "ROSALÍA": ["Spain", "ES", "Catalonia, Spain", "Pop; flamenco", "https://music.apple.com/us/artist/rosal%C3%ADa/1193536819"],
  "Sam Deep": ["South Africa", "ZA", "South Africa", "Amapiano", "https://music.apple.com/za/artist/sam-deep/1458548629"],
  "Sammy Irungu": ["Kenya", "KE", "Kenya", "Gospel", "https://music.apple.com/us/artist/sammy-irungu/1333714846"],
  "Sean Paul": ["Jamaica", "JM", "Kingston, Jamaica", "Dancehall; reggae", "https://music.apple.com/us/artist/sean-paul/201319"],
  "Shane O": ["Jamaica", "JM", "Kingston, Jamaica", "Dancehall", "https://music.apple.com/us/artist/shane-o/296711020"],
  "Sheebah": ["Uganda", "UG", "Kampala, Uganda", "Afro-pop; dancehall", "https://www.musicinafrica.net/directory/sheebah-karungi"],
  "Shirin David": ["Germany", "DE", "Hamburg, Germany", "Hip-Hop/Rap", "https://music.apple.com/us/artist/shirin-david/1126528949"],
  "Shoday": ["Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/ng/artist/shoday/1555302949"],
  "Slyzza Rsa": ["South Africa", "ZA", "South Africa", "Amapiano", "https://music.apple.com/za/artist/slyzza-rsa/1729031848"],
  "Spice": ["Jamaica", "JM", "Portmore, Jamaica", "Dancehall", "https://music.apple.com/us/artist/spice/13471220"],
  "Steve Lacy": ["United States", "US", "Compton, CA, United States", "Alternative; R&B", "https://music.apple.com/us/artist/steve-lacy/1210217424"],
  "Tabu Ley Rochereau": ["DR Congo", "CD", "Kinshasa, DR Congo", "Congolese rumba", "https://music.apple.com/us/artist/tabu-ley-rochereau/16442328"],
  "Tommy Lee Sparta": ["Jamaica", "JM", "Montego Bay, Jamaica", "Dancehall", "https://music.apple.com/us/artist/tommy-lee-sparta/486821481"],
  "Tyga": ["United States", "US", "Compton, CA, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/tyga/106598105"],
  "Uncle Waffles": ["Eswatini", "SZ", "Eswatini", "Amapiano; DJ", "https://music.apple.com/us/artist/uncle-waffles/1586910863"],
  "V": ["South Korea", "KR", "Daegu, South Korea", "K-pop", "https://music.apple.com/us/artist/v/1191850724"],
  "Vanillah": ["Tanzania", "TZ", "Tanzania", "Bongo Flava; Afro-pop", "https://www.musicinafrica.net/directory/vanillah"],
  "Wale": ["United States", "US", "Washington, DC, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/wale/231136951"],
  "Walter Chilambo": ["Tanzania", "TZ", "Tanzania", "Gospel", "https://www.musicinafrica.net/directory/walter-chilambo"],
  "Wendy Shay": ["Ghana", "GH", "Accra, Ghana", "Afrobeats", "https://www.musicinafrica.net/directory/wendy-shay"],
  "Yemi Alade": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats", "https://www.musicinafrica.net/directory/yemi-alade"],
  "YG": ["United States", "US", "Compton, CA, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/yg/316190158"],
  "Yung Miami": ["United States", "US", "Miami, FL, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/yung-miami/1397336115"],
  "Zara Larsson": ["Sweden", "SE", "Stockholm, Sweden", "Pop", "https://music.apple.com/us/artist/zara-larsson/572252868"],
  "Zinoleesky": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats; street-pop", "https://music.apple.com/us/artist/zinoleesky/1482942496"],
  "Zlatan": ["Nigeria", "NG", "Lagos, Nigeria", "Afrobeats; street-pop", "https://music.apple.com/us/artist/zlatan/479433528"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");

const countryCache = new Map();
async function wikidataEntity(id) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`;
  const response = await fetch(url, { headers: { "User-Agent": "NgomaChartsCMS/1.0" } });
  if (!response.ok) throw new Error(`wikidata ${id} ${response.status}`);
  return (await response.json()).entities[id];
}

function claimIds(entity, property) {
  return (entity.claims?.[property] || [])
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

async function countryFromQid(qid) {
  if (countryCache.has(qid)) return countryCache.get(qid);
  const entity = await wikidataEntity(qid);
  const name = entity.labels?.en?.value || "";
  const code = (entity.claims?.P297 || [])[0]?.mainsnak?.datavalue?.value || "";
  const normalized = countryNameOverrides.get(name) || [name, code];
  const result = { country: normalized[0], country_code: normalized[1] || code };
  countryCache.set(qid, result);
  return result;
}

function wikidataDescriptionLooksMusical(result) {
  return /(singer|rapper|musician|record producer|songwriter|disc jockey|dj|band|duo|group|artist|composer|vocalist|music|producer)/i.test(
    `${result.description || ""} ${result.label || ""}`
  );
}

async function wikidataLookup(name) {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=8&search=${encodeURIComponent(name)}`;
  const response = await fetch(searchUrl, { headers: { "User-Agent": "NgomaChartsCMS/1.0" } });
  if (!response.ok) return null;
  const data = await response.json();
  const exact = (data.search || []).filter((result) =>
    (fold(result.label) === fold(name) || (result.aliases || []).some((alias) => fold(alias) === fold(name))) &&
    wikidataDescriptionLooksMusical(result)
  );
  for (const result of exact) {
    try {
      const entity = await wikidataEntity(result.id);
      const countryIds = [
        ...claimIds(entity, "P495"),
        ...claimIds(entity, "P27"),
        ...claimIds(entity, "P17"),
      ];
      if (countryIds.length) {
        const country = await countryFromQid(countryIds[0]);
        if (country.country && country.country_code) {
          return {
            ...country,
            source_url: `https://www.wikidata.org/wiki/${result.id}`,
            source_note: result.description || "Wikidata exact artist match",
            confidence: "medium",
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function musicBrainzLookup(name) {
  const url = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=8`;
  const response = await fetch(url, { headers: { "User-Agent": "NgomaChartsCMS/1.0 (data-quality repair)" } });
  if (!response.ok) return null;
  const data = await response.json();
  const match = (data.artists || []).find((artist) =>
    fold(artist.name) === fold(name) ||
    fold(artist["sort-name"]) === fold(name) ||
    (artist.aliases || []).some((alias) => fold(alias.name) === fold(name))
  );
  if (!match?.country) return null;
  const country = await restCountry(match.country);
  return {
    country: country?.name || match.country,
    country_code: match.country,
    city_region: match.area?.name || match["begin-area"]?.name || "",
    genre: (match.tags || []).slice(0, 3).map((tag) => tag.name).join("; "),
    source_url: `https://musicbrainz.org/artist/${match.id}`,
    source_note: "MusicBrainz exact artist match",
    confidence: "medium",
  };
}

const restCountryCache = new Map();
async function restCountry(code) {
  if (restCountryCache.has(code)) return restCountryCache.get(code);
  const response = await fetch(`https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}`);
  if (!response.ok) return null;
  const row = (await response.json())?.[0];
  const result = { name: row?.name?.common || code };
  restCountryCache.set(code, result);
  return result;
}

const researched = [];
const unresolved = [];
for (const row of queue.missingArtists) {
  const seed = manualSeeds[row.name];
  if (seed) {
    researched.push({
      id: row.id,
      name: row.name,
      country: seed[0],
      country_code: seed[1],
      city_region: seed[2],
      genre: seed[3],
      source_url: seed[4],
      confidence: "high",
    });
    continue;
  }

  let result = null;
  try {
    result = await wikidataLookup(row.name);
  } catch {}
  if (!result) {
    await sleep(250);
    try {
      result = await musicBrainzLookup(row.name);
    } catch {}
  }
  if (result?.country && result?.country_code) {
    researched.push({ id: row.id, name: row.name, ...result });
  } else {
    unresolved.push(row);
  }
  await sleep(100);
}

const payload = {
  generated_at: new Date().toISOString(),
  researched_count: researched.length,
  unresolved_count: unresolved.length,
  artists: researched.sort((a, b) => a.name.localeCompare(b.name)),
  unresolved,
};
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log(JSON.stringify({ researched: researched.length, unresolved: unresolved.length }, null, 2));
console.log(outPath);
