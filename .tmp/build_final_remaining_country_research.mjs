import fs from "node:fs";

const queuePath =
  "C:/Users/HP/Desktop/Ngoma Charts Folder/files/ngoma_charts_backend/backend/.tmp/remaining_alert_queues.json";
const outPath = ".tmp/remaining_artist_country_research_final.json";

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));

const sources = {
  apple: "https://music.apple.com",
  shazam: "https://www.shazam.com",
  spotify: "https://open.spotify.com",
  audiomack: "https://audiomack.com",
  popnable: "https://popnable.com",
};

const profile = (
  country,
  country_code,
  city_region = "",
  genre = "",
  source_url = sources.apple,
  confidence = "medium",
  source_note = ""
) => ({ country, country_code, city_region, genre, source_url, confidence, source_note });

const artistProfiles = {
  BBO: profile(
    "Nigeria",
    "NG",
    "Ijebu, Ogun State, Nigeria",
    "Gospel",
    "https://audiomack.com/officialbbo/song/my-god",
    "high",
    "Audiomack lists BBO in Lagos, Nigeria; Popnable/Spotify profile identifies him as Nigerian."
  ),
  "Black Coco": profile(
    "Cameroon",
    "CM",
    "Limbe, Cameroon",
    "Worldwide; dancehall",
    "https://music.apple.com/us/artist/black-coco/1551157237",
    "high",
    "Apple Music/Shazam artist profile lists hometown/from as Limbe, Cameroon."
  ),
  "Brayan Crist": profile(
    "United States",
    "US",
    "",
    "Pop",
    "https://music.apple.com/us/album/fix-the-ride-single/1865286358",
    "low",
    "Release source lists a US LLC rights holder; no stronger public country profile found."
  ),
  "Broken Trails": profile(
    "United States",
    "US",
    "",
    "Country",
    "https://www.shazam.com/artist/broken-trails/1850428773",
    "low",
    "Shazam/Apple artist pages classify the project as country music; public country profile is sparse."
  ),
  "brux XTN": profile("United Kingdom", "GB", "", "Hip-Hop/Rap", "https://open.spotify.com/search/brux%20XTN%20Paid%20to%20Exist", "low"),
  Caine: profile(
    "Mauritius",
    "MU",
    "Mauritius",
    "Dance; dancehall remix",
    "https://open.spotify.com/artist/2qfjPpLn8838tvaseAB7FW",
    "high",
    "Spotify artist bio says Caine is a DJ/composer from Mauritius."
  ),
  "Catholic Church Songs": profile("Vatican City", "VA", "Vatican City", "Christian & Gospel", "https://music.apple.com/search?term=Catholic%20Church%20Songs%20Ave%20Maria", "low", "Generic Catholic catalogue artist; Vatican City used for the institutional Catholic Church credit."),
  Chiktay: profile(
    "France",
    "FR",
    "French Antilles",
    "Zouk",
    "https://music.apple.com/us/artist/chiktay/268800174",
    "high",
    "Apple Music/Qobuz describe Chiktay as a French Antilles/Guadeloupe zouk group."
  ),
  Chill77: profile("Sweden", "SE", "", "Afro-soul; pop", "https://music.apple.com/search?term=Chill77%20Papaoutai%20Afro%20Soul", "low", "Release metadata links Chill77 with Unjaps AB; public artist profile is sparse."),
  "Chris Grey": profile(
    "Canada",
    "CA",
    "Toronto, Ontario, Canada",
    "Alt-R&B; pop",
    "https://www.rebellionrecords.com/artists/chris-grey",
    "high",
    "Label bio describes Chris Grey as Toronto-based; interviews identify him as from Toronto."
  ),
  CJS: profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=CJS%20Hebu%20Nieleze", "low"),
  "Coconut Rootz": profile(
    "United States",
    "US",
    "Torrance, CA, United States",
    "Reggae; Caribbean",
    "https://audiomack.com/coconutrootz/song/my-everything",
    "medium",
    "Audiomack profile for the release lists Torrance, California."
  ),
  CrashDummy: profile("United Kingdom", "GB", "", "Hip-Hop/Rap", "https://open.spotify.com/search/CrashDummy%20Ndotz%20DJ%20MAC", "low", "Charted with UK act Ndotz and DJ MAC on Watch Me Now."),
  "Criss MJ": profile("United Kingdom", "GB", "London, England", "Afrobeats; Afro-fusion", "https://music.apple.com/us/artist/criss-mj/1788171077", "medium", "Apple Music profile lists the artist as from City of London."),
  "Dela Cuffy": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Dela%20Cuffy%20Mind%20Your%20Business", "low"),
  "Delana Hope": profile("United States", "US", "", "Christian & Gospel", "https://music.apple.com/search?term=Delana%20Hope%20I%20Speak%20Blessings", "low"),
  "Di Genius": profile("Jamaica", "JM", "Kingston, Jamaica", "Dancehall; producer", "https://music.apple.com/us/artist/di-genius/269557250", "high"),
  "DJ CHEEM": profile("United Kingdom", "GB", "", "Dancehall; DJ", "https://open.spotify.com/search/DJ%20CHEEM%20Party%20Lit", "low", "Charted with UK act JETTI on Party Lit."),
  "DJ Grauchi": profile(
    "Kenya",
    "KE",
    "Nairobi, Kenya",
    "DJ; Afrobeats",
    "https://music.apple.com/us/album/the-sounds-of-nairobi-dj-mix/1809246349",
    "high",
    "Apple Music describes DJ Grauchi as a Kenyan DJ and entertainer representing Nairobi."
  ),
  "Dj Kezz": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://www.shazam.com/search/Dj%20Kezz%20Ushuhuda", "medium", "Shazam similar-artist context places Dj Kezz in the Kenyan/Swahili gospel cluster."),
  "DJ MAC": profile("United Kingdom", "GB", "", "Hip-Hop/Rap; DJ", "https://open.spotify.com/search/DJ%20MAC%20Ndotz%20Watch%20Me%20Now", "low", "Charted with UK act Ndotz on Watch Me Now."),
  "Dolv Gvng": profile("Kenya", "KE", "Kenya", "Hip-Hop/Rap", "https://music.apple.com/search?term=Dolv%20Gvng%20Try%20Me", "low"),
  "Dr Sarah K": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=Dr%20Sarah%20K%20Gacumbiri", "medium"),
  "Drex D": profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://www.shazam.com/search/Drex%20D%20Sensational", "low"),
  "DWAYNE SPIKES": profile("Kenya", "KE", "Nairobi, Kenya", "Gengetone; hip-hop", "https://music.apple.com/us/artist/dwayne-spikes/1193510100", "medium"),
  "Emanuel Nicarios": profile("Tanzania", "TZ", "Tanzania", "Christian & Gospel", "https://music.apple.com/search?term=Emanuel%20Nicarios%20Nitaamini", "medium"),
  "English Audio Bible": profile("United States", "US", "", "Spoken word; Christian", "https://music.apple.com/search?term=English%20Audio%20Bible%20In%20the%20Silence", "low", "Generic English-language audio-bible catalogue artist."),
  Eshconinco: profile(
    "Jamaica",
    "JM",
    "Kingston, Jamaica",
    "Reggae; dancehall",
    "https://riddim-id.com/artists/7994/eshconinco",
    "high",
    "Riddim-ID biography lists Eshconinco as born in Kingston, Jamaica."
  ),
  Faceless: profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/us/artist/faceless/1722816884", "medium", "Apple Music profile clusters Faceless with Nigerian Afrobeats artists."),
  "Faith Grey": profile("United States", "US", "", "Pop", "https://music.apple.com/search?term=Faith%20Grey%20Electric%20Heat", "low"),
  "Fat Papi": profile("United States", "US", "", "Hip-Hop/Rap", "https://open.spotify.com/search/Fat%20Papi%20FREAKED%20OUT", "low"),
  "Fenix Flexin": profile("United States", "US", "Los Angeles, CA, United States", "Hip-Hop/Rap", "https://music.apple.com/us/artist/fenix-flexin/1457975655", "high"),
  "FRAH KE": profile("Kenya", "KE", "Kenya", "Gengetone; Afrobeats", "https://music.apple.com/search?term=FRAH%20KE%20Vuva", "medium"),
  "Free Da Truth": profile("Kenya", "KE", "Kenya", "Hip-Hop/Rap", "https://music.apple.com/search?term=Free%20Da%20Truth%20MZEE%20WA%20HOVYO", "low"),
  Furryx: profile("United States", "US", "", "Pop", "https://music.apple.com/search?term=Furryx%20Over%20the%20Vibes", "low"),
  "GIFT MELODY": profile("Tanzania", "TZ", "Tanzania", "Christian & Gospel", "https://www.shazam.com/song/1877578316/ubaya-wa-dhambi", "medium", "Swahili gospel release; Shazam lists gospel peers including Tanzanian/Swahili acts."),
  "Greenworld music": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://www.shazam.com/artist/greenworld-music/1885222675", "medium", "Shazam catalogue is Kikuyu/Kenyan Catholic-gospel focused."),
  "Harry Craze": profile(
    "Kenya",
    "KE",
    "Nairobi, Kenya",
    "Gengetone; hip-hop",
    "https://audiomack.com/harry-craze",
    "high",
    "Audiomack profile lists Harry Craze in Nairobi, Kenya."
  ),
  "Hildah Watiri": profile("Kenya", "KE", "Nairobi, Kenya", "Christian & Gospel", "https://music.apple.com/ke/artist/hildah-watiri/1891494483", "medium"),
  Hornsphere: profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Hornsphere%20Lavender%20Watendawili", "medium", "Charted with Kenyan duo Watendawili on Lavender."),
  Hyce: profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://open.spotify.com/artist/1KQuzZH1ix85vt0n3iiRTA", "high", "Spotify/Apple profile places Hyce in Nigerian Afrobeats context with BoyPee, Brown Joel and Davido collaborations."),
  "Jorh Creta": profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Jorh%20Creta%20Simwachi", "low"),
  "Josh Kamba": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Josh%20Kamba%20DML", "low"),
  "Kabelo Tiro aka skavenja": profile("South Africa", "ZA", "South Africa", "Amapiano", "https://music.apple.com/search?term=Kabelo%20Tiro%20skavenja%20KWANTLE%20KWAA", "medium"),
  "Kano Choir": profile("Nigeria", "NG", "Kano, Nigeria", "Choir; Christian & Gospel", "https://music.apple.com/search?term=Kano%20Choir", "low", "Generic choir credit tied to Kano, Nigeria."),
  Kassam: profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Kassam%20Nikupe", "low"),
  KayArchonn: profile("United States", "US", "", "Electronic; remix", "https://music.apple.com/search?term=KayArchonn%20where.t.at%20she%20goes%20by", "low"),
  "Kendi Kiremi": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Kendi%20Kiremi%20confirm%20remix", "medium"),
  "Kevin Kade": profile(
    "Rwanda",
    "RW",
    "Rwanda",
    "Afrobeats",
    "https://popnable.com/rwanda/songs/1410300-kevin-kade-ndi-ready",
    "high",
    "Popnable and local coverage identify Ndi Ready/Kevin Kade as Rwandan."
  ),
  Khadeair: profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Khadeair%20Magumba", "low"),
  "King Bubby": profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=King%20Bubby%20Nakutaka", "low"),
  "King Soundboi": profile(
    "Nigeria",
    "NG",
    "Ibadan, Nigeria",
    "Afrobeats; street-hop",
    "https://audiomack.com/king_soundboi/album/premium-lamba",
    "high",
    "Audiomack profile lists Ibadan, Nigeria; Independent Nigeria profile identifies him as Nigerian."
  ),
  Kingpheezle: profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://www.shazam.com/search/Kingpheezle%20Dr%20Ring%20Ding%20Tipsy%20Gee", "medium", "Charted with Kenyan act Tipsy Gee, but catalogue context is Afrobeats/Nigeria."),
  Kinoti: profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=Kinoti%20Hildah%20Watiri", "medium"),
  "Kisii All Stars": profile("Kenya", "KE", "Kisii, Kenya", "Afro-pop", "https://music.apple.com/search?term=Kisii%20All%20Stars%20MUKAYO", "medium"),
  Laflare: profile("United States", "US", "", "Reggae; Caribbean", "https://music.apple.com/search?term=Laflare%20Right%20By%20Your%20Side", "low"),
  "Levelz UP": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Levelz%20UP%20How%20are%20you", "low"),
  "Lift Soul Records": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=Lift%20Soul%20Records%20Niko%20Na%20Neema", "low"),
  "LOVIXX & STOSLIV": profile("United States", "US", "", "Pop", "https://music.apple.com/search?term=LOVIXX%20STOSLIV%20Don%27t%20Tell%20Your%20Dreams", "low"),
  "LR GLOBAL": profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=LR%20GLOBAL%20Kamwambie", "low"),
  "Mad G Odeya": profile("Kenya", "KE", "Kenya", "Gengetone; dancehall", "https://music.apple.com/search?term=Mad%20G%20Odeya%20Shake%20That%20Thing", "medium"),
  Mavoicetz: profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Mavoicetz%20Limenoga", "low"),
  Mikado: profile("France", "FR", "France", "Shatta remix; dance", "https://music.apple.com/search?term=Mikado%20LA%20PLI%20SI%20TOL%20Shatta%20Remix", "medium"),
  "Miracle LRE": profile("United States", "US", "", "Hip-Hop/Rap", "https://music.apple.com/search?term=Miracle%20LRE%20Sorry%20I%27m%20Different", "low"),
  "Moses Luka": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=Moses%20Luka%20Moja", "low"),
  MSA: profile("South Africa", "ZA", "South Africa", "Amapiano", "https://music.apple.com/search?term=MSA%20Lengoma%20sami%20kay%20Misokuhle", "medium"),
  Nahj: profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Nahj%20My%20Lady", "low"),
  "Nahsh kariuki Official": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Nahsh%20kariuki%20Official%20WAWILI", "medium"),
  "NG'ETHE STEVE": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=NG%27ETHE%20STEVE%20Munyamaruri", "medium"),
  "Nia Pearl": profile("South Africa", "ZA", "Mthatha, Eastern Cape, South Africa", "Amapiano", "https://www.musicinafrica.net/directory/nia-pearl", "high"),
  NO11: profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/search?term=NO11%20HOW%20FAR", "low"),
  Ntombemhlope: profile(
    "South Africa",
    "ZA",
    "Eastern Cape, South Africa",
    "Amapiano; Afro House",
    "https://open.spotify.com/intl-fr/artist/4T8Zzw2BBUGop3qrTxsQZv",
    "high",
    "Spotify bio describes Ntombemhlope as a South African singer with Eastern Cape roots."
  ),
  Oberz: profile("Nigeria", "NG", "Nigeria", "Afrobeats; Afro-fusion", "https://open.spotify.com/artist/1URhWT4bXKGpVkfDFe1R1v", "high"),
  "Official Tikiti": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=Official%20Tikiti%20Mimina%20Neema", "low"),
  Pam: profile(
    "Kenya",
    "KE",
    "Kenya",
    "Genge; Kenyan classics",
    "https://www.shazam.com/song/1809246762/usimpe-roho-mixed",
    "high",
    "Usimpe Roho appears in DJ Grauchi's The Sounds of Nairobi mix and Kenyan local classics metadata."
  ),
  "Party Wright": profile("Jamaica", "JM", "Jamaica", "Dancehall", "https://music.apple.com/search?term=Party%20Wright%20Stamina", "low"),
  "Patrick Kubuya": profile("DR Congo", "CD", "DR Congo", "Christian & Gospel", "https://music.apple.com/search?term=Patrick%20Kubuya%20Moyo%20Wangu", "medium"),
  "Pelzy Never Mind": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://music.apple.com/search?term=Pelzy%20Never%20Mind%20NJOO", "low"),
  Peterbril: profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/search?term=Peterbril%20Nitolee", "low"),
  "Phany Love": profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Phany%20Love%20Huyu", "low"),
  prodshushy: profile("United States", "US", "", "Hip-Hop/Rap; producer", "https://open.spotify.com/search/prodshushy%20FREAKED%20OUT", "low"),
  "Purps On The Beat": profile("United States", "US", "", "Hip-Hop/Rap; producer", "https://music.apple.com/search?term=Purps%20On%20The%20Beat", "low"),
  "R.M.H": profile("Rwanda", "RW", "Rwanda", "Afro-pop", "https://music.apple.com/search?term=R.M.H%20Imbobo", "low"),
  "Rachats Classic": profile("Tanzania", "TZ", "Tanzania", "Christian & Gospel", "https://music.apple.com/search?term=Rachats%20Classic%20Mimi%20Ni%20Nani", "low"),
  "Ragal Ironbull": profile("Kenya", "KE", "Kenya", "Hip-Hop/Rap", "https://music.apple.com/search?term=Ragal%20Ironbull%20VALHALLA%20CALLING", "low"),
  ragerx: profile("United States", "US", "", "Hip-Hop/Rap", "https://music.apple.com/search?term=ragerx%20Dream%20Chaser", "low"),
  "REI AMI": profile("United States", "US", "Maryland, United States", "Alternative; pop", "https://music.apple.com/us/artist/rei-ami/1465315907", "high"),
  "Roland MANTAMA": profile("DR Congo", "CD", "DR Congo", "Afro-pop", "https://music.apple.com/search?term=Roland%20MANTAMA%20Mayday%20RDC", "medium", "Mayday RDC title and catalogue context point to DR Congo."),
  "Ronis Goliath": profile("South Africa", "ZA", "South Africa", "Amapiano; Afro-pop", "https://music.apple.com/search?term=Ronis%20Goliath%20Tell%20Me%20One%20Lie", "low"),
  Ronoo: profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Ronoo%20Mbona%20unanichukia", "low"),
  "Rord Kelly": profile("Nigeria", "NG", "Enugu State, Nigeria", "Igbo drill; hip-hop", "https://open.spotify.com/artist/1S3mrT2p2gYiVJKCjr7RFo", "high"),
  "Sam Wa Ukweli": profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://www.musicinafrica.net/directory/sam-wa-ukweli", "high"),
  SAMAD: profile("Nigeria", "NG", "Nigeria", "Afrobeat", "https://popnable.com/nigeria/songs/1265851-samad-lameda", "high"),
  SamDan: profile("Trinidad and Tobago", "TT", "Trinidad and Tobago", "Soca; dancehall", "https://music.apple.com/search?term=SamDan%20Bend%20Ova%20Kman6ixx", "low"),
  SdoDiRoba: profile("South Africa", "ZA", "South Africa", "Amapiano", "https://music.apple.com/za/artist/sdodiroba/1808518725", "high"),
  shewahdexta: profile("Jamaica", "JM", "Jamaica", "Dancehall", "https://music.apple.com/search?term=shewahdexta%20Birkin%20Bag", "low"),
  "Shift to Abundance": profile("United States", "US", "", "Spoken word; wellness", "https://music.apple.com/search?term=Shift%20to%20Abundance%20Mirror%20To%20Magic", "low"),
  "SIJI.": profile("Tanzania", "TZ", "Tanzania", "Bongo Flava; Afro-pop", "https://music.apple.com/search?term=SIJI%20KOMSA", "low"),
  slayr: profile("United States", "US", "", "Hip-Hop/Rap", "https://music.apple.com/search?term=slayr%20Half%20Blood%20BloodLuxe", "low"),
  SleepTherapy: profile("United States", "US", "", "Ambient; sleep", "https://music.apple.com/search?term=SleepTherapy%20Rain%20Sounds", "low"),
  Solpulse: profile("United States", "US", "", "Reggae; soul", "https://music.apple.com/search?term=Solpulse%20You%20%26%20Me", "low"),
  "Song Writer's Playbook": profile("United States", "US", "", "Pop", "https://music.apple.com/search?term=Song%20Writer%27s%20Playbook%20Too%20Sweet%20to%20Share", "low"),
  "Sounds Of Afrika Music": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://www.shazam.com/search/Sounds%20Of%20Afrika%20Music%20Ombi%20Langu", "medium"),
  Stahgee: profile("Nigeria", "NG", "Nigeria", "Afrobeats; hip-hop", "https://music.apple.com/search?term=Stahgee%20Dying%20Minute", "medium"),
  Sykes: profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Sykes%20Tanzania%20artist", "medium"),
  "T Peller": profile("Nigeria", "NG", "Nigeria", "Afro-pop", "https://www.shazam.com/song/1890555572/dey-for-you", "high"),
  "THE LIGHTBEARERS TZ": profile("Tanzania", "TZ", "Tanzania", "Christian & Gospel", "https://www.shazam.com/song/1800492123/tumaini-letu", "high"),
  "The Wamagatas": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=The%20Wamagatas%20EBENEZER", "low"),
  "Time N Gold": profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/search?term=Time%20N%20Gold%20Vision", "low"),
  "Timi Dre": profile("Nigeria", "NG", "Lagos, Nigeria",
    "Afrobeats; Afro-fusion",
    "https://audiomack.com/TimiDre",
    "high",
    "Audiomack profile says Timi Dre is originally from Lagos, Nigeria."
  ),
  "Tipsy Gee": profile("Kenya", "KE", "Kenya", "African dancehall; gengetone", "https://popnable.com/kenya/artists/132533-tipsy-gee/songs", "high"),
  Tkandz: profile("Nigeria", "NG", "Nigeria", "Afrobeats", "https://music.apple.com/search?term=Tkandz%20Now%20or%20Never", "low"),
  "Trinix Remix": profile("France", "FR", "France", "Dance; electronic", "https://music.apple.com/us/artist/trinix/595770975", "high"),
  Unjaps: profile("Sweden", "SE", "Sweden", "Afro-soul; pop", "https://music.apple.com/search?term=Unjaps%20Papaoutai%20Afro%20Soul", "low", "Release metadata lists Unjaps AB."),
  "V-Be": profile("Kenya", "KE", "Kenya", "Afro-pop", "https://www.famousbirthdays.com/bands/vijana-barubaru.html", "high"),
  "Vailedmoon music": profile("United States", "US", "", "Reggae; pop", "https://music.apple.com/search?term=Vailedmoon%20music%20Tell%20me%20what%20to%20do", "low"),
  Valiant: profile("Jamaica", "JM", "Jamaica", "Dancehall", "https://music.apple.com/us/artist/valiant/1458263741", "high"),
  Vicoka: profile("Tanzania", "TZ", "Tanzania", "Bongo Flava; Afro-pop", "https://music.apple.com/search?term=Vicoka%20SPIRIT", "low"),
  "Virusi Mbaya": profile("Kenya", "KE", "Kenya", "Hip-Hop/Rap", "https://music.apple.com/us/artist/virusi-mbaya/1505295150", "medium", "Catalogue and collaborators are Kenyan; Souled Out includes Kenyan/Sheng titles and Dapstrem context."),
  "where.t.at": profile("United States", "US", "", "Electronic; remix", "https://music.apple.com/search?term=where.t.at%20she%20goes%20by", "low"),
  "World hive": profile("Kenya", "KE", "Kenya", "Christian & Gospel", "https://music.apple.com/search?term=World%20hive%20God%20of%20miracles", "low"),
  WorshipWithCorry: profile("Tanzania", "TZ", "Tanzania", "Christian & Gospel", "https://www.shazam.com/artist/gift-melody/1763496850", "medium", "Shazam gospel cluster lists WorshipWithCorry alongside Tanzanian/Swahili gospel artists."),
  Xouh: profile("Tanzania", "TZ", "Tanzania", "Bongo Flava", "https://music.apple.com/search?term=Xouh%20My%20Baby", "low"),
  "YOUNG RAPPERS": profile("Nigeria", "NG", "Nigeria", "Hip-Hop/Rap", "https://music.apple.com/search?term=YOUNG%20RAPPERS%20NEED%20THE%20MONEY", "low"),
  Zagga: profile("Jamaica", "JM", "Jamaica", "Dancehall", "https://music.apple.com/us/artist/zagga/282741425", "high"),
};

const rows = [];
const unresolved = [];
for (const artist of queue.missingArtists) {
  if (artist.name === "Various Artists") continue;
  const base = artistProfiles[artist.name];
  if (!base) {
    unresolved.push(artist);
    continue;
  }
  rows.push({
    id: artist.id,
    name: artist.name,
    ...base,
    overwrite: /Country\/code mismatch/i.test(artist.problem || ""),
  });
}

const releaseCountries = [
  {
    id: 19382,
    title: "Saiyaara (Original Motion Picture Soundtrack)",
    country: "India",
    country_code: "IN",
    genre: "Bollywood; soundtrack",
    source_url: "https://music.apple.com/us/album/saiyaara-original-motion-picture-soundtrack/1824400207",
    confidence: "high",
    overwrite: true,
  },
  {
    id: 20510,
    title: "Saiyaara (Extended Album) [Original Motion Picture Soundtrack]",
    country: "India",
    country_code: "IN",
    genre: "Bollywood; soundtrack",
    source_url: "https://music.apple.com/us/album/saiyaara-original-motion-picture-soundtrack/1824400207",
    confidence: "high",
    overwrite: true,
  },
  {
    id: 19412,
    title: "Story Book Riddim",
    country: "Jamaica",
    country_code: "JM",
    genre: "Dancehall",
    source_url: "https://www.qobuz.com/us-en/album/story-book-riddim-various-artists/cri5ehavv4l8a",
    confidence: "high",
    overwrite: true,
  },
];

const payload = {
  generated_at: new Date().toISOString(),
  source_queue: queuePath,
  researched_count: rows.length,
  unresolved_count: unresolved.length,
  artists: rows.sort((a, b) => a.name.localeCompare(b.name)),
  release_countries: releaseCountries,
  unresolved,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log(JSON.stringify({
  researched: payload.researched_count,
  unresolved: payload.unresolved_count,
  release_countries: payload.release_countries.length,
  outPath,
}, null, 2));
if (unresolved.length) {
  console.error(unresolved.map((row) => `${row.id}\t${row.name}`).join("\n"));
  process.exitCode = 1;
}
