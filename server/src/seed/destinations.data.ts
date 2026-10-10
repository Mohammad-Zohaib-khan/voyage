/**
 * Seed content for Voyage.
 *
 * Photography: free-to-use photos from Unsplash (https://unsplash.com/license), hot-linked from
 * images.unsplash.com with photographer credit and a link to each photo page.
 *
 * Costs: illustrative, per-person, per-day estimates in US cents for a mid-range trip, compiled
 * for this demo. They are not live prices, quotes or availability, and the UI says so.
 *
 * Seasons and highlights are general, widely published travel knowledge. They are not live
 * weather, safety or opening-hours information.
 */

export interface SeedImage {
  id: string;
  alt: string;
  credit: string;
  page: string;
  focus?: string;
}

export interface SeedDestination {
  slug: string;
  /** Approximate centre of the place (WGS84), used to plot it on the globe. */
  location: { lat: number; lng: number };
  name: string;
  country: string;
  region: 'asia' | 'europe' | 'africa' | 'americas' | 'oceania' | 'middle-east';
  summary: string;
  description: string[];
  hero: SeedImage;
  gallery: SeedImage[];
  travelStyles: Array<'coast' | 'mountains' | 'culture' | 'outdoors' | 'slow-travel'>;
  bestMonths: number[];
  seasonNote: string;
  suggestedDays: { min: number; max: number };
  /** USD cents per person per day: accommodation, food, transport, activities, miscellaneous. */
  costs: [number, number, number, number, number];
  highlights: Array<{ title: string; body: string }>;
  tips: string[];
  featuredRank: number;
}

export const COST_ASSUMPTIONS =
  'Per person, per day, for a mid-range trip: a double room in a well-reviewed hotel or guesthouse, two sit-down meals plus snacks, local transport, and one paid activity. An illustrative estimate written for this demo, not a live or verified price.';

export const DESTINATIONS: SeedDestination[] = [
  {
    slug: 'kyoto',
    location: { lat: 35.0116, lng: 135.7681 },
    name: 'Kyoto',
    country: 'Japan',
    region: 'asia',
    summary: 'Temple gardens, wooden machiya streets and a food culture built on the seasons.',
    description: [
      'Kyoto was Japan’s imperial capital for more than a thousand years, and it still holds an extraordinary concentration of temples, shrines and gardens. Seventeen sites in and around the city are listed together by UNESCO as the Historic Monuments of Ancient Kyoto.',
      'The rewarding way to see it is slowly: one district per day, early starts before the crowds, and long afternoons in tea houses or on the paths along the Kamo River.',
    ],
    hero: {
      id: 'photo-1478436127897-769e1b3f0f36',
      alt: 'A stone path running through a tunnel of vermilion torii gates',
      credit: 'Lin Mei',
      page: 'https://unsplash.com/photos/gray-pathway-between-red-and-black-wooden-pillar-NYyCqdBOKwc',
    },
    gallery: [
      {
        id: 'photo-1632923754832-60642c12a7ed',
        alt: 'Visitors walking along a path through a tall bamboo grove',
        credit: 'Thuy Duong Nguyen',
        page: 'https://unsplash.com/photos/a-group-of-people-walking-through-a-bamboo-forest-fsJ0basri8U',
      },
      {
        id: 'photo-1610238115511-81be15284155',
        alt: 'A covered wooden walkway in a Japanese garden among red autumn maples',
        credit: 'Samuel Berner',
        page: 'https://unsplash.com/photos/wooden-walkway-in-japanese-autumn-garden-u8fS3_bSWdI',
      },
    ],
    travelStyles: ['culture', 'slow-travel'],
    bestMonths: [3, 4, 5, 10, 11],
    seasonNote: 'Cherry blossom (late March to early April) and autumn colour (mid to late November) are beautiful and very busy. Summers are hot and humid.',
    suggestedDays: { min: 3, max: 5 },
    costs: [9000, 4000, 1500, 2500, 1000],
    highlights: [
      { title: 'Fushimi Inari Taisha', body: 'Thousands of vermilion torii gates climb the wooded slopes of Mount Inari. Walk beyond the first viewpoint and the crowds thin quickly.' },
      { title: 'Arashiyama', body: 'The bamboo grove, Tenryū-ji’s garden and the river at Togetsukyō bridge make a full western-district day.' },
      { title: 'Higashiyama and Gion', body: 'Preserved lanes of wooden townhouses between Kiyomizu-dera and Yasaka Shrine, best walked in the early morning.' },
      { title: 'Nishiki Market', body: 'A narrow covered market of pickles, tofu, knives and seasonal sweets in the centre of the city.' },
    ],
    tips: [
      'A rechargeable IC card covers city buses, subways and many shops.',
      'Many temples close their gates around 4:30–5 pm; plan sights for the morning.',
      'Photography is restricted in parts of Gion’s private lanes. Follow posted signs.',
      'Book popular kaiseki restaurants and temple lodgings well ahead in spring and autumn.',
    ],
    featuredRank: 1,
  },
  {
    slug: 'amalfi-coast',
    location: { lat: 40.634, lng: 14.6027 },
    name: 'Amalfi Coast',
    country: 'Italy',
    region: 'europe',
    summary: 'Pastel villages stacked above the Tyrrhenian Sea, lemon terraces and long lunches.',
    description: [
      'The Amalfi Coast runs for about fifty kilometres along the southern side of the Sorrento Peninsula. Positano, Amalfi and Ravello cling to cliffs linked by a single famously narrow road.',
      'Base yourself in one town and use ferries and footpaths rather than the car. The coast rewards unhurried days: a morning swim, a hike, a long lunch, an evening passeggiata.',
    ],
    hero: {
      id: 'photo-1612698093158-e07ac200d44e',
      alt: 'Colourful buildings on a rocky cliffside above turquoise water in Amalfi',
      credit: 'Tom Podmore',
      page: 'https://unsplash.com/photos/colorful-buildings-on-amalfi-cliffside-1zkHXas1GIo',
    },
    gallery: [
      {
        id: 'photo-1561956021-947f09ae0101',
        alt: 'Houses stacked on a steep cliffside overlooking the sea in Positano',
        credit: 'Jordan Steranka',
        page: 'https://unsplash.com/photos/positano-cliffside-houses-in-italy-z0L0mo__9bg',
      },
      {
        id: 'photo-1583844056361-4418a8f2a985',
        alt: 'Positano lit up at night above the dark sea, in a long exposure',
        credit: 'Sebastian Leonhardt',
        page: 'https://unsplash.com/photos/positano-village-on-amalfi-coast-PkWac9CLWVA',
      },
    ],
    travelStyles: ['coast', 'slow-travel'],
    bestMonths: [5, 6, 9, 10],
    seasonNote: 'May, June, September and early October are warm enough to swim without peak-summer crowds. Many hotels close from November to March.',
    suggestedDays: { min: 4, max: 7 },
    costs: [16000, 6000, 2500, 3000, 1500],
    highlights: [
      { title: 'Path of the Gods', body: 'A cliff-top trail from Bomerano towards Nocelle with views straight down to Positano. Start early in warm months.' },
      { title: 'Ravello', body: 'Set high above the sea, with the gardens of Villa Rufolo and Villa Cimbrone and their famous terrace.' },
      { title: 'Ferries between towns', body: 'Seasonal boats link Salerno, Amalfi, Positano and Capri, and are often quicker than the road.' },
      { title: 'Lemon terraces', body: 'The large sfusato lemons grown on the terraces flavour everything from pastries to limoncello.' },
    ],
    tips: [
      'Driving is stressful in summer; buses and ferries are the calmer option.',
      'Expect steps everywhere. Pack light and wear shoes with grip.',
      'Beach clubs charge for loungers; small public sections are free.',
      'Ferry timetables are seasonal and weather-dependent. Check on the day.',
    ],
    featuredRank: 2,
  },
  {
    slug: 'ladakh',
    location: { lat: 34.1526, lng: 77.5771 },
    name: 'Ladakh',
    country: 'India',
    region: 'asia',
    summary: 'High-altitude desert, Buddhist monasteries and some of the world’s highest roads.',
    description: [
      'Ladakh sits between the Karakoram and the Great Himalaya, with Leh at roughly 3,500 metres. Its landscape of bare mountains, river valleys and turquoise lakes is unlike anywhere else in India.',
      'Altitude shapes every plan. Arrive slowly, rest for the first days, and build in buffer time: mountain passes and flights can close at short notice.',
    ],
    hero: {
      id: 'photo-1619837374214-f5b9eb80876d',
      alt: 'The Indus and Zanskar rivers meeting at the Sangam confluence between bare mountains',
      credit: 'Prabhav Kashyap Godavarthy',
      page: 'https://unsplash.com/photos/indus-and-zanskar-rivers-at-sangam-XTroPPNq6JA',
    },
    gallery: [
      {
        id: 'photo-1593118845043-359e5f628214',
        alt: 'Prayer flags on grey sand beside a lake and mountains',
        credit: 'Hans-Jurgen Mager',
        page: 'https://unsplash.com/photos/blue-yellow-and-red-textile-on-gray-sand-near-lake-and-mountain-during-daytime-MrW_AqAFNR0',
      },
      {
        id: 'photo-1617824077360-7a77db40aae1',
        alt: 'An empty road leading towards a mountain range under a blue sky',
        credit: 'Vatsal Bhatt',
        page: 'https://unsplash.com/photos/gray-concrete-road-near-mountain-range-under-blue-sky-during-daytime-KwhxKAjhIjQ',
      },
    ],
    travelStyles: ['mountains', 'outdoors'],
    bestMonths: [6, 7, 8, 9],
    seasonNote: 'Road access is usually best from about June to September. Winter is extremely cold and many routes close.',
    suggestedDays: { min: 7, max: 12 },
    costs: [3500, 1500, 2500, 1500, 500],
    highlights: [
      { title: 'Pangong Tso', body: 'A long, high lake that shifts from blue to green with the light, reached over the Chang La pass.' },
      { title: 'Nubra Valley', body: 'Sand dunes, double-humped camels and the Diskit monastery, over one of the region’s high passes.' },
      { title: 'Monasteries', body: 'Thiksey, Hemis and Lamayuru each have a distinct setting and character; morning prayers are open to quiet visitors.' },
      { title: 'Sangam', body: 'The confluence of the Indus and Zanskar rivers, an easy half-day from Leh.' },
    ],
    tips: [
      'Rest for at least 48 hours in Leh before going higher; altitude sickness is common.',
      'Some areas require Inner Line Permits; local agents and hotels can arrange them.',
      'Carry cash: ATMs are limited outside Leh.',
      'Mobile coverage is patchy, and some networks do not work at all. Check before you go.',
    ],
    featuredRank: 3,
  },
  {
    slug: 'lisbon',
    location: { lat: 38.7223, lng: -9.1393 },
    name: 'Lisbon',
    country: 'Portugal',
    region: 'europe',
    summary: 'Hills of azulejo-tiled houses, river light, fado and a famously good tram ride.',
    description: [
      'Lisbon spreads over steep hills above the wide estuary of the Tagus. Its old neighbourhoods, Alfama, Mouraria and Graça, survived the 1755 earthquake better than the rebuilt grid of the Baixa below.',
      'The city is compact enough to walk, if you accept the climbs. Day trips to Sintra, Cascais and the Arrábida coast are easy by train or bus.',
    ],
    hero: {
      id: 'photo-1562250883-a18ef907fcab',
      alt: 'A yellow Lisbon tram passing a pale building',
      credit: 'Julian Dik',
      page: 'https://unsplash.com/photos/yellow-and-white-train-near-building-WVVmRyJ98XY',
    },
    gallery: [
      {
        id: 'photo-1599069182504-a5127593e349',
        alt: 'People walking along a sloping pavement between Lisbon buildings',
        credit: 'André Lergier',
        page: 'https://unsplash.com/photos/people-walking-on-sidewalk-between-buildings-during-daytime-SY7l9JXjxco',
      },
      {
        id: 'photo-1711125174987-645d1a9d6466',
        alt: 'A yellow tram travelling down a street lined with tall buildings',
        credit: 'Daniil Korbut',
        page: 'https://unsplash.com/photos/a-yellow-trolley-car-traveling-down-a-street-next-to-tall-buildings-1Y-JJlh1qMo',
      },
    ],
    travelStyles: ['culture', 'coast'],
    bestMonths: [4, 5, 6, 9, 10],
    seasonNote: 'Spring and early autumn are mild and bright. July and August are hot and the centre is crowded.',
    suggestedDays: { min: 3, max: 5 },
    costs: [7500, 3500, 1000, 2000, 800],
    highlights: [
      { title: 'Alfama', body: 'A maze of stairways and small squares below the castle, with fado houses that come alive after dark.' },
      { title: 'Belém', body: 'The Jerónimos Monastery, the Belém Tower and the custard tarts at the bakery beside them.' },
      { title: 'Miradouros', body: 'Viewpoints such as Senhora do Monte and Santa Luzia, best at sunset.' },
      { title: 'Sintra', body: 'Palaces and forested hills about forty minutes by train, worth a full day.' },
    ],
    tips: [
      'Tram 28 is scenic but packed; ride it early or walk parts of the route.',
      'Cobblestones are slippery after rain. Wear shoes with grip.',
      'Restaurants may bring bread and olives to the table; they are charged if eaten.',
      'Book Sintra’s palaces ahead in summer and arrive at opening time.',
    ],
    featuredRank: 4,
  },
  {
    slug: 'torres-del-paine',
    location: { lat: -50.9423, lng: -73.4068 },
    name: 'Torres del Paine',
    country: 'Chile',
    region: 'americas',
    summary: 'Granite towers, glaciers and wind-swept lakes at the edge of Patagonia.',
    description: [
      'Torres del Paine National Park protects a compact massif of granite spires, glaciers and lakes in Chilean Patagonia, a long drive north of Puerto Natales.',
      'Most visitors come to walk, either the multi-day W and O circuits or day hikes from lodges. The weather changes fast, so build spare days into any plan.',
    ],
    hero: {
      id: 'photo-1658312627438-30d1299683fd',
      alt: 'A lake below the jagged rock peaks of Torres del Paine National Park',
      credit: 'Mario La Pergola',
      page: 'https://unsplash.com/photos/a-body-of-water-with-rocky-mountains-in-the-background-with-torres-del-paine-national-park-in-the-background-LG3K7bTn-VQ',
    },
    gallery: [
      {
        id: 'photo-1637580981046-6e14709be202',
        alt: 'Animals grazing on open grassland in front of a mountain range',
        credit: 'Andrew Svk',
        page: 'https://unsplash.com/photos/a-group-of-llamas-grazing-in-front-of-a-mountain-7oJ4D_ewB7c',
      },
      {
        id: 'photo-1544198365-f5d60b6d8190',
        alt: 'Glacier ice beneath mountains on a clear day',
        credit: 'Kurt Cotoaga',
        page: 'https://unsplash.com/photos/glacier-mountains-during-day-cqbLg3lZEpk',
      },
    ],
    travelStyles: ['mountains', 'outdoors'],
    bestMonths: [11, 12, 1, 2, 3],
    seasonNote: 'The southern summer, roughly November to March, has the longest days and most services. Strong winds are common in every season.',
    suggestedDays: { min: 5, max: 9 },
    costs: [12000, 4500, 3500, 5000, 1000],
    highlights: [
      { title: 'Base of the Towers', body: 'A steep full-day hike to the glacial lake beneath the three granite towers.' },
      { title: 'The W Trek', body: 'Four to five days linking the towers, the French Valley and Grey Glacier, with refugios and campsites.' },
      { title: 'Grey Glacier', body: 'Icebergs drift in Lago Grey below the glacier front, visible from trails or by boat.' },
      { title: 'Wildlife', body: 'Guanacos are common; rheas, condors and, with luck and a guide, pumas.' },
    ],
    tips: [
      'Refugios and campsites on the W must be booked in advance for the summer season.',
      'Pack for four seasons in a day, including proper waterproofs.',
      'Park entry is paid separately from accommodation; check the official site for current rules.',
      'Fire is strictly prohibited outside designated areas; past fires have damaged the park.',
    ],
    featuredRank: 5,
  },
  {
    slug: 'udaipur',
    location: { lat: 24.5854, lng: 73.7125 },
    name: 'Udaipur',
    country: 'India',
    region: 'asia',
    summary: 'A lake city of palaces, rooftop evenings and miniature-painting workshops.',
    description: [
      'Udaipur was founded in the sixteenth century as the capital of the Mewar kingdom and is built around a series of artificial lakes. The City Palace runs along the eastern shore of Lake Pichola.',
      'It is one of Rajasthan’s gentlest cities: stay near the water, explore the old lanes on foot and leave time for a sunset boat ride.',
    ],
    hero: {
      id: 'photo-1695956353120-54ce5e91632b',
      alt: 'The City Palace on the banks of Lake Pichola at golden hour',
      credit: 'Maitree Patel',
      page: 'https://unsplash.com/photos/city-palace-on-lake-pichola-udaipur-t2x2R0ZpXpw',
    },
    gallery: [
      {
        id: 'photo-1615836245337-f5b9b2303f10',
        alt: 'A red and white boat on the lake beside pale stone buildings',
        credit: 'Jainam Mehta',
        page: 'https://unsplash.com/photos/red-and-white-boat-on-body-of-water-near-beige-concrete-building-during-daytime-AVFjDGbqiqE',
      },
      {
        id: 'photo-1633702738734-443da2c18f3c',
        alt: 'A large white palace that appears to float on the lake',
        credit: 'Subhashis Das',
        page: 'https://unsplash.com/photos/a-large-white-building-sitting-on-top-of-a-lake-Jmfy_ec20bk',
      },
    ],
    travelStyles: ['culture', 'slow-travel'],
    bestMonths: [10, 11, 12, 1, 2, 3],
    seasonNote: 'October to March is pleasant. April to June is very hot; the monsoon arrives around July and refills the lakes.',
    suggestedDays: { min: 2, max: 4 },
    costs: [5000, 1800, 800, 1500, 500],
    highlights: [
      { title: 'City Palace', body: 'A complex of courtyards, mirrored rooms and lake views built up over several centuries.' },
      { title: 'Lake Pichola by boat', body: 'Late-afternoon boats pass the Lake Palace and Jag Mandir island as the light turns gold.' },
      { title: 'Bagore ki Haveli', body: 'An eighteenth-century mansion on Gangaur Ghat with an evening programme of folk dance.' },
      { title: 'Sajjangarh', body: 'The hilltop Monsoon Palace, a short drive out, for wide views over the lakes at sunset.' },
    ],
    tips: [
      'Agree auto-rickshaw fares before setting off, or use an app-based ride.',
      'Dress modestly for temples and remove shoes where asked.',
      'Ranakpur’s Jain temple and Kumbhalgarh fort make a long but rewarding day trip.',
      'Rooftop restaurants are popular at sunset; arrive early for a lake-facing table.',
    ],
    featuredRank: 6,
  },
  {
    slug: 'kerala-backwaters',
    location: { lat: 9.4981, lng: 76.3388 },
    name: 'Kerala Backwaters',
    country: 'India',
    region: 'asia',
    summary: 'Palm-lined canals, village life and slow days on a converted rice barge.',
    description: [
      'Behind Kerala’s coast lies a web of lagoons, lakes and canals stretching between Kollam and Kochi, centred on Vembanad Lake, Alappuzha and Kumarakom.',
      'Travel here is deliberately slow. An overnight houseboat, a homestay on a quiet canal and a few days in Fort Kochi make a balanced first visit.',
    ],
    hero: {
      id: 'photo-1704365159747-1f7b8913044f',
      alt: 'Two boats on a calm river lined with palm trees',
      credit: 'Swastik Arora',
      page: 'https://unsplash.com/photos/two-boats-are-in-the-middle-of-a-river-surrounded-by-palm-trees-6R_k1QF1LCw',
    },
    gallery: [
      {
        id: 'photo-1609828913552-f9138ed9e42d',
        alt: 'A wooden boat on still water beside green palm trees',
        credit: 'Dileep M',
        page: 'https://unsplash.com/photos/brown-wooden-boat-on-body-of-water-near-green-palm-trees-during-daytime-rv5ddI1WyCw',
      },
      {
        id: 'photo-1593417033942-bcdf26b74700',
        alt: 'A wooden house on the water among trees',
        credit: 'Kunal Kalra',
        page: 'https://unsplash.com/photos/brown-wooden-house-on-lake-during-daytime-1OWl1_gtCZw',
      },
    ],
    travelStyles: ['slow-travel', 'coast'],
    bestMonths: [10, 11, 12, 1, 2, 3],
    seasonNote: 'October to March is the most comfortable. The monsoon (roughly June to September) is lush and quiet, with heavy rain.',
    suggestedDays: { min: 3, max: 6 },
    costs: [5000, 1500, 1500, 2500, 500],
    highlights: [
      { title: 'Houseboat night', body: 'A kettuvallam, a converted rice barge, drifts through canals with meals cooked on board.' },
      { title: 'Canoe through village canals', body: 'Smaller boats reach narrow waterways that houseboats cannot, past paddy fields and ferry stops.' },
      { title: 'Fort Kochi', body: 'Chinese fishing nets, colonial-era streets, spice warehouses and an excellent café scene.' },
      { title: 'Kathakali', body: 'Kerala’s classical dance-drama, often staged for visitors with an explanation of its gestures.' },
    ],
    tips: [
      'Agree exactly what a houseboat price includes (meals, route, cruising hours) before paying.',
      'Houseboats usually moor for the night and stop cruising in the evening.',
      'Carry insect repellent for dusk on the water.',
      'Cash is still useful in villages and on smaller boats.',
    ],
    featuredRank: 7,
  },
  {
    slug: 'zermatt',
    location: { lat: 46.0207, lng: 7.7491 },
    name: 'Zermatt',
    country: 'Switzerland',
    region: 'europe',
    summary: 'A car-free Alpine village at the foot of the Matterhorn.',
    description: [
      'Zermatt sits at the head of the Mattertal valley, with the Matterhorn rising above the village. Private petrol cars are not permitted; visitors arrive by train from Täsch or further down the valley.',
      'Summer brings high hiking trails and mountain railways; winter brings one of the Alps’ longest ski seasons, linked across the border to Italy.',
    ],
    hero: {
      id: 'photo-1571274834067-3a24675547b4',
      alt: 'Brown wooden chalets with a snow-covered peak behind them',
      credit: 'Daniel Cox',
      page: 'https://unsplash.com/photos/brown-houses-viewing-mountain-under-blue-and-white-sky-during-daytime-UzCh9tp1VLs',
    },
    gallery: [
      {
        id: 'photo-1545161296-d9c2c241f2ad',
        alt: 'A snow-coated mountain peak against the sky',
        credit: 'Fabrice Villard',
        page: 'https://unsplash.com/photos/mountain-coated-with-snow-QrRSm-QbjW0',
      },
      {
        id: 'photo-1706953608349-4333b9707277',
        alt: 'A mountain reflected in a small lake in front of it',
        credit: 'Lukáš Konvica',
        page: 'https://unsplash.com/photos/a-mountain-with-a-lake-in-front-of-it-2fDlpki7Hx0',
      },
    ],
    travelStyles: ['mountains', 'outdoors'],
    bestMonths: [1, 2, 3, 7, 8, 9],
    seasonNote: 'Ski season runs roughly from late November to April; hiking from about late June to September. Some lifts close for maintenance between seasons.',
    suggestedDays: { min: 3, max: 6 },
    costs: [20000, 7000, 4000, 5000, 1500],
    highlights: [
      { title: 'Gornergrat railway', body: 'A cog railway climbing to over 3,000 metres with a wide view of the Matterhorn and surrounding glaciers.' },
      { title: 'Five Lakes Walk', body: 'A summer trail past small lakes, several of which reflect the Matterhorn on calm mornings.' },
      { title: 'Matterhorn Glacier Paradise', body: 'Cable cars to a high viewing platform with year-round snow.' },
      { title: 'Hinterdorf', body: 'The old quarter of dark larch barns and granaries raised on stone discs.' },
    ],
    tips: [
      'Park in Täsch and take the shuttle train; cars cannot be driven into the village.',
      'Mountain weather changes quickly; check lift and trail status each morning.',
      'Swiss travel passes may discount some mountain railways. Check what yours covers.',
      'Book accommodation early for the Christmas and February holiday weeks.',
    ],
    featuredRank: 8,
  },
  {
    slug: 'marrakech',
    location: { lat: 31.6295, lng: -7.9811 },
    name: 'Marrakech',
    country: 'Morocco',
    region: 'africa',
    summary: 'Medina souks, riad courtyards and the High Atlas on the horizon.',
    description: [
      'Marrakech grew from an eleventh-century Almoravid foundation into one of Morocco’s great imperial cities. Its walled medina is a UNESCO World Heritage site.',
      'The medina can feel intense at first. A riad stay, a guided first morning and a day in the Atlas foothills make the city easier to enjoy.',
    ],
    hero: {
      id: 'photo-1597212618440-806262de4f6b',
      alt: 'The Koutoubia minaret rising above Marrakech with the snow-capped Atlas behind',
      credit: 'Paul Macallan',
      page: 'https://unsplash.com/photos/koutoubia-mosque-minaret-in-marrakesh-CFKksjYRSQ8',
    },
    gallery: [
      {
        id: 'photo-1580746738099-1cb74f972feb',
        alt: 'Baskets of colourful spices and dried flowers at a market stall',
        credit: 'zakariae daoui',
        page: 'https://unsplash.com/photos/spices-and-dried-flowers-in-market-Dql2_LN5sRg',
      },
      {
        id: 'photo-1653323792487-6ecc6217040b',
        alt: 'A horse-drawn carriage passing the Koutoubia Mosque',
        credit: 'Rumman Amin',
        page: 'https://unsplash.com/photos/horse-carriage-at-koutoubia-mosque-marrakech-bzFHhYKdIa0',
      },
    ],
    travelStyles: ['culture'],
    bestMonths: [3, 4, 5, 10, 11],
    seasonNote: 'Spring and autumn are warm and dry. Summer regularly exceeds 40 °C; winter nights are cold.',
    suggestedDays: { min: 3, max: 5 },
    costs: [5000, 2000, 800, 2000, 700],
    highlights: [
      { title: 'Jemaa el-Fnaa', body: 'The main square, quiet by day and filled with food stalls, musicians and storytellers at night.' },
      { title: 'Bahia Palace', body: 'Nineteenth-century courtyards, painted cedar ceilings and gardens of orange trees.' },
      { title: 'Jardin Majorelle', body: 'A cobalt-blue villa and botanical garden, best visited at opening time.' },
      { title: 'The souks', body: 'Lanes organised by craft: leather, brass, carpets, lanterns and spices.' },
    ],
    tips: [
      'Agree taxi fares before getting in, or ask your riad to arrange transfers.',
      'Polite, firm refusals work best with persistent guides.',
      'Dress modestly in the medina, especially shoulders and knees.',
      'Non-Muslims cannot enter most mosques, including the Koutoubia.',
    ],
    featuredRank: 9,
  },
  {
    slug: 'santorini',
    location: { lat: 36.3932, lng: 25.4615 },
    name: 'Santorini',
    country: 'Greece',
    region: 'europe',
    summary: 'Whitewashed villages on the rim of a flooded volcanic caldera.',
    description: [
      'Santorini is what remains of a volcanic island that collapsed in a huge eruption in the Late Bronze Age. Villages such as Fira, Imerovigli and Oia line the cliffs above the flooded caldera.',
      'Stay on the caldera for the views, or on the quieter eastern side for beaches and better value. The island is at its best outside the July–August peak.',
    ],
    hero: {
      id: 'photo-1580502304784-8985b7eb7260',
      alt: 'White buildings on a cliffside in Oia lit by warm evening light',
      credit: 'James Ting',
      page: 'https://unsplash.com/photos/white-buildings-on-oia-cliffside-6N2mSJsKTtA',
    },
    gallery: [
      {
        id: 'photo-1570077188670-e3a8d69ac5ff',
        alt: 'Blue domes and white houses above the sea in Santorini',
        credit: 'Pretty Pink',
        page: 'https://unsplash.com/photos/santorini-greece-kYxgm42SQso',
      },
      {
        id: 'photo-1533104816931-20fa691ff6ca',
        alt: 'A closed blue gate in a white wall',
        credit: 'Ryan Spencer',
        page: 'https://unsplash.com/photos/closed-blue-gate-WJDR8_QxVR8',
      },
    ],
    travelStyles: ['coast'],
    bestMonths: [5, 6, 9, 10],
    seasonNote: 'Late spring and early autumn are warm with fewer cruise visitors. Many businesses close from November to March.',
    suggestedDays: { min: 3, max: 4 },
    costs: [15000, 5000, 1500, 3000, 1200],
    highlights: [
      { title: 'Fira to Oia walk', body: 'A roughly ten-kilometre path along the caldera rim through Imerovigli. Start early in summer.' },
      { title: 'Akrotiri', body: 'A Bronze Age town preserved under volcanic ash, now protected beneath a modern roof.' },
      { title: 'Caldera by boat', body: 'Boat trips visit the volcanic islets of Nea Kameni and the hot springs.' },
      { title: 'Volcanic wines', body: 'Assyrtiko vines grow in low basket shapes against the wind; several wineries offer tastings.' },
    ],
    tips: [
      'Sunset in Oia is extremely crowded; consider watching from Imerovigli instead.',
      'Check cruise ship schedules and plan Fira and Oia around them.',
      'Beaches are volcanic sand or pebbles and get very hot. Bring water shoes.',
      'Book caldera-view rooms and summer ferries well ahead.',
    ],
    featuredRank: 10,
  },
  {
    slug: 'iceland-south-coast',
    location: { lat: 63.4186, lng: -19.006 },
    name: 'Iceland’s South Coast',
    country: 'Iceland',
    region: 'europe',
    summary: 'Waterfalls, black-sand beaches and glacier lagoons along the Ring Road.',
    description: [
      'The stretch of Route 1 east of Reykjavík packs in waterfalls, volcanic beaches, glacier tongues and the iceberg lagoon at Jökulsárlón.',
      'Distances are manageable but daylight and weather are not guaranteed. Drive conservatively, and keep the itinerary flexible.',
    ],
    hero: {
      id: 'photo-1667420137384-8e7c17369e0e',
      alt: 'A waterfall pouring over a high cliff',
      credit: 'Yvon Hoogers',
      page: 'https://unsplash.com/photos/a-waterfall-with-a-cliff-in-the-background-EC1krzTR3a0',
    },
    gallery: [
      {
        id: 'photo-1504829857797-ddff29c27927',
        alt: 'Rugged mountain terrain beside a body of water',
        credit: 'Norris Niman',
        page: 'https://unsplash.com/photos/mountain-terrain-near-body-of-water-ABtmE3jhaPQ',
      },
      {
        id: 'photo-1704311348019-6c454b5b7616',
        alt: 'The sun setting over the ocean with cliffs in the background',
        credit: 'Misha Martin',
        page: 'https://unsplash.com/photos/the-sun-is-setting-over-the-ocean-with-cliffs-in-the-background-3ATXXUq0q-g',
      },
    ],
    travelStyles: ['outdoors', 'coast'],
    bestMonths: [6, 7, 8, 9],
    seasonNote: 'Summer brings near-continuous daylight and open roads. Winter offers aurora chances but short days and frequent storms.',
    suggestedDays: { min: 4, max: 7 },
    costs: [16000, 6000, 6000, 3500, 1500],
    highlights: [
      { title: 'Seljalandsfoss and Skógafoss', body: 'Two waterfalls close to the road: one you can walk behind, one with a stair to the top.' },
      { title: 'Reynisfjara', body: 'A black-sand beach with basalt columns near Vík. Dangerous waves; stay well back from the water.' },
      { title: 'Jökulsárlón', body: 'Icebergs calved from Breiðamerkurjökull drift to the sea; pieces wash up on nearby Diamond Beach.' },
      { title: 'Glacier walks', body: 'Guided walks on outlet glaciers such as Sólheimajökull, with crampons and a qualified guide.' },
    ],
    tips: [
      'Check road conditions and weather warnings every morning before driving.',
      'Never walk on glaciers without a certified guide.',
      'Fuel stations can be far apart in the east; keep the tank above half.',
      'Supermarkets are much cheaper than restaurants for lunches.',
    ],
    featuredRank: 11,
  },
  {
    slug: 'queenstown',
    location: { lat: -45.0312, lng: 168.6626 },
    name: 'Queenstown',
    country: 'New Zealand',
    region: 'oceania',
    summary: 'A lakeside town ringed by the Remarkables, with Fiordland on its doorstep.',
    description: [
      'Queenstown sits on the shore of Lake Wakatipu in the South Island’s Otago region. It is best known for adventure sport, but the surrounding walks, wineries and lakes suit slower trips just as well.',
      'It is also the usual base for Milford Sound and the Great Walks of Fiordland and Mount Aspiring.',
    ],
    hero: {
      id: 'photo-1547314283-befb6cc5cf29',
      alt: 'Buildings beside a lake with mountains behind under a blue sky',
      credit: 'Ömer Faruk Bekdemir',
      page: 'https://unsplash.com/photos/buildings-near-body-of-water-and-mountains-under-clear-blue-sky-and-white-clouds-at-daytime-5BuxuWIJF1Q',
    },
    gallery: [
      {
        id: 'photo-1600466403153-50193d187dde',
        alt: 'Aerial view of a lake framed by mountains',
        credit: 'Peter Luo',
        page: 'https://unsplash.com/photos/aerial-view-of-lake-and-mountains-during-daytime-i1EyNs_rvk8',
      },
      {
        id: 'photo-1600476019922-fb69c71b0b53',
        alt: 'A boat on the lake near green trees and a mountain',
        credit: 'David Maunsell',
        page: 'https://unsplash.com/photos/white-and-black-boat-on-body-of-water-near-green-trees-and-mountain-during-daytime-jzvEmwf4Vls',
      },
    ],
    travelStyles: ['mountains', 'outdoors'],
    bestMonths: [12, 1, 2, 3, 7, 8],
    seasonNote: 'Summer (December to March) suits walking and lake days; winter (June to August) brings skiing at nearby fields.',
    suggestedDays: { min: 4, max: 7 },
    costs: [12000, 5000, 2500, 6000, 1000],
    highlights: [
      { title: 'Milford Sound', body: 'A fiord of sheer cliffs and waterfalls, reached by a long scenic drive, a coach, or a flight.' },
      { title: 'Ben Lomond Track', body: 'A demanding full-day climb above the gondola with views across the lake.' },
      { title: 'Glenorchy', body: 'A quiet settlement at the head of the lake, with walks into the Dart and Rees valleys.' },
      { title: 'Arrowtown', body: 'A restored gold-rush village, especially beautiful in autumn colour around April.' },
    ],
    tips: [
      'Great Walk huts and campsites must be booked through the Department of Conservation.',
      'The Milford road can close for avalanche risk in winter. Check before setting out.',
      'Sunlight is strong; use high-factor sunscreen even on cool days.',
      'Popular activities sell out in peak summer and school holidays.',
    ],
    featuredRank: 12,
  },
  {
    slug: 'cape-town',
    location: { lat: -33.9249, lng: 18.4241 },
    name: 'Cape Town',
    country: 'South Africa',
    region: 'africa',
    summary: 'Table Mountain above two oceans, wine valleys and a penguin colony.',
    description: [
      'Cape Town spreads around the foot of Table Mountain on the Cape Peninsula. Within an hour are Atlantic beaches, the Cape Point nature reserve and the winelands of Stellenbosch and Franschhoek.',
      'Plan around the wind and the weather on the mountain, and get local advice on which areas to walk in after dark.',
    ],
    hero: {
      id: 'photo-1580060839134-75a5edca2e99',
      alt: 'Aerial view of Cape Town spread beneath a flat-topped mountain',
      credit: 'Tobias Reich',
      page: 'https://unsplash.com/photos/aerial-view-of-city-near-mountain-during-daytime-1GgWbP74phY',
    },
    gallery: [
      {
        id: 'photo-1576485375217-d6a95e34d043',
        alt: 'Clifton beach below the Twelve Apostles mountain range',
        credit: 'kylefromthenorth',
        page: 'https://unsplash.com/photos/clifton-beach-and-twelve-apostles-mountains-UrhglJ-2Q8M',
      },
      {
        id: 'photo-1496497243327-9dccd845c35f',
        alt: 'African penguins on a beach beside large granite boulders',
        credit: 'Casey Allen',
        page: 'https://unsplash.com/photos/african-penguins-on-seashore-beside-boulder-UjpEGHu8uNU',
      },
    ],
    travelStyles: ['coast', 'outdoors'],
    bestMonths: [11, 12, 1, 2, 3],
    seasonNote: 'The southern summer, November to March, is dry and warm but windy. Winter (June to August) is wetter and cooler.',
    suggestedDays: { min: 4, max: 7 },
    costs: [7000, 3000, 1500, 2500, 800],
    highlights: [
      { title: 'Table Mountain', body: 'Take the cableway or hike Platteklip Gorge; the cableway closes in high wind.' },
      { title: 'Boulders Beach', body: 'A protected colony of African penguins near Simon’s Town, viewed from boardwalks.' },
      { title: 'Chapman’s Peak Drive', body: 'A toll road carved into the cliffs between Hout Bay and Noordhoek.' },
      { title: 'The Winelands', body: 'Historic estates in Stellenbosch and Franschhoek, an easy day trip.' },
    ],
    tips: [
      'Check the cableway status before heading up; it closes in strong wind or cloud.',
      'Hike popular trails in groups and in daylight, and ask locally about current safety.',
      'The Atlantic side is cold year-round; False Bay beaches are warmer.',
      'Use app-based rides or arranged transport at night.',
    ],
    featuredRank: 13,
  },
  {
    slug: 'hoi-an',
    location: { lat: 15.8801, lng: 108.338 },
    name: 'Hội An',
    country: 'Vietnam',
    region: 'asia',
    summary: 'A lantern-lit trading port of tailors, riverside cafés and nearby beaches.',
    description: [
      'Hội An was an important trading port from the fifteenth to the nineteenth century, and its old town preserves Chinese assembly halls, Japanese-influenced architecture and wooden shophouses. It is a UNESCO World Heritage site.',
      'Cycle out to the rice fields and An Bàng beach by day, and return to the old town in the evening when the lanterns are lit.',
    ],
    hero: {
      id: 'photo-1563354860-799d15199ac3',
      alt: 'Rows of glowing coloured silk lanterns at night',
      credit: 'Thanh Soledas',
      page: 'https://unsplash.com/photos/assorted-color-chinese-lanterns-at-night-XGuZ4HlC5qU',
    },
    gallery: [
      {
        id: 'photo-1635777957702-3d39b9bdfde0',
        alt: 'The river running through Hội An beside a yellow building',
        credit: 'Phú Nguyễn Đạt',
        page: 'https://unsplash.com/photos/a-river-running-through-a-city-next-to-a-yellow-building-TguuCt67ark',
      },
      {
        id: 'photo-1664650440553-ab53804814b3',
        alt: 'Wooden boats moored along the riverbank',
        credit: 'Filipe Freitas',
        page: 'https://unsplash.com/photos/a-group-of-boats-are-parked-on-the-side-of-a-river-XDBRl4bL_5w',
      },
    ],
    travelStyles: ['culture', 'slow-travel', 'coast'],
    bestMonths: [2, 3, 4, 5],
    seasonNote: 'February to May is dry and pleasant. October and November bring heavy rain and occasional flooding in the old town.',
    suggestedDays: { min: 3, max: 5 },
    costs: [3500, 1500, 500, 1500, 500],
    highlights: [
      { title: 'The old town', body: 'Assembly halls, merchant houses and the Japanese Covered Bridge, entered with a ticket that funds conservation.' },
      { title: 'Lantern evenings', body: 'Lanterns light the riverfront after dusk; small boats float candles on the Thu Bồn.' },
      { title: 'Cycling to the fields', body: 'Flat lanes lead through rice paddies and vegetable villages towards the beach.' },
      { title: 'Mỹ Sơn', body: 'Ruins of Cham Hindu temples in a jungle valley, about an hour away.' },
    ],
    tips: [
      'Tailors can make clothes in a day or two; allow time for a second fitting.',
      'Parts of the old town are closed to motorbikes at set hours, which makes walking pleasant.',
      'Try cao lầu, the noodle dish closely associated with the town.',
      'Visit Mỹ Sơn early to avoid midday heat.',
    ],
    featuredRank: 14,
  },
  {
    slug: 'banff',
    location: { lat: 51.1784, lng: -115.5708 },
    name: 'Banff',
    country: 'Canada',
    region: 'americas',
    summary: 'Glacier-fed lakes and the Rocky Mountains in Canada’s first national park.',
    description: [
      'Banff National Park, established in 1885, protects a stretch of the Canadian Rockies west of Calgary. The town of Banff and the hamlet of Lake Louise are the two main bases.',
      'The famous lakes are busy in summer. Shuttles, early starts and a few lesser-known trails make a big difference.',
    ],
    hero: {
      id: 'photo-1558818061-547b1114aa6a',
      alt: 'Moraine Lake beneath a wall of peaks in the Canadian Rockies',
      credit: 'David Wirzba',
      page: 'https://unsplash.com/photos/moraine-lake-canada-wxalerEiUVQ',
    },
    gallery: [
      {
        id: 'photo-1561134643-668f9057cce4',
        alt: 'Trees beside a mountain lake at golden hour',
        credit: 'Jacky Huang',
        page: 'https://unsplash.com/photos/trees-near-a-mountain-beside-body-of-water-during-golden-hour-6rC8fmNW3pk',
      },
      {
        id: 'photo-1610878180933-123728745d22',
        alt: 'A vivid blue lake surrounded by mountains and forest',
        credit: 'David McLenachan',
        page: 'https://unsplash.com/photos/a-blue-lake-surrounded-by-mountains-and-trees-K8IlloSJ4fI',
      },
    ],
    travelStyles: ['mountains', 'outdoors'],
    bestMonths: [6, 7, 8, 9, 1, 2],
    seasonNote: 'Lakes are usually ice-free from about June; larches turn gold in mid to late September. Winter brings skiing and frozen-lake walks.',
    suggestedDays: { min: 4, max: 7 },
    costs: [15000, 5000, 3000, 2500, 1000],
    highlights: [
      { title: 'Moraine Lake', body: 'A glacier-fed lake below the Valley of the Ten Peaks. Personal vehicle access is restricted; use shuttles.' },
      { title: 'Lake Louise', body: 'Walk past the lakeshore to the Plain of Six Glaciers or the Lake Agnes tea house.' },
      { title: 'Icefields Parkway', body: 'A 230-kilometre road north to Jasper past glaciers and turquoise lakes.' },
      { title: 'Johnston Canyon', body: 'Catwalks along a limestone canyon to two sets of falls.' },
    ],
    tips: [
      'A national park pass is required; it is checked at park gates.',
      'Carry bear spray on trails and know how to use it.',
      'Reserve Parks Canada shuttles to Moraine Lake and Lake Louise in summer.',
      'Some high passes keep snow into July; check trail reports.',
    ],
    featuredRank: 15,
  },
  {
    slug: 'oaxaca',
    location: { lat: 17.0732, lng: -96.7266 },
    name: 'Oaxaca',
    country: 'Mexico',
    region: 'americas',
    summary: 'Colonial streets, Zapotec ruins, seven moles and village markets.',
    description: [
      'Oaxaca de Juárez is a colonial city in a high valley of southern Mexico, surrounded by Indigenous Zapotec and Mixtec communities known for weaving, pottery and mezcal.',
      'Food is a central reason to visit. Combine market mornings, cooking classes and trips out to Monte Albán and the craft villages of the valley.',
    ],
    hero: {
      id: 'photo-1686448921254-b326a7914d2f',
      alt: 'A street of colourful buildings strung with papel picado flags',
      credit: 'Anastasiia Malai',
      page: 'https://unsplash.com/photos/a-street-lined-with-colorful-flags-and-buildings-8JNAY3kbfpI',
    },
    gallery: [
      {
        id: 'photo-1562869929-bda0650edb1f',
        alt: 'Stacks of multicoloured woven textiles',
        credit: 'analuisa gamboa',
        page: 'https://unsplash.com/photos/multicolored-textiles-lot-0ohjyDUIUq0',
      },
      {
        id: 'photo-1660670173026-ec491dd3dd1a',
        alt: 'A domed colonial building above a courtyard with people walking',
        credit: 'ryan doyle',
        page: 'https://unsplash.com/photos/a-large-building-with-a-dome-and-a-courtyard-with-people-walking-around-kO-USq1pmR4',
      },
    ],
    travelStyles: ['culture', 'slow-travel'],
    bestMonths: [10, 11, 12, 1, 2, 3],
    seasonNote: 'The dry season runs from about October to April. Día de Muertos (31 October to 2 November) is remarkable and books out early.',
    suggestedDays: { min: 4, max: 7 },
    costs: [5500, 2500, 800, 2000, 700],
    highlights: [
      { title: 'Monte Albán', body: 'A Zapotec ceremonial city on a levelled mountaintop above the valley.' },
      { title: 'Santo Domingo de Guzmán', body: 'A baroque church and former monastery, now also a museum with an ethnobotanical garden.' },
      { title: 'Markets', body: 'Mercado 20 de Noviembre for grilled meats and Benito Juárez for chocolate, chillies and mole pastes.' },
      { title: 'Valley villages', body: 'Teotitlán del Valle for weaving and San Bartolo Coyotepec for black pottery.' },
    ],
    tips: [
      'The city sits around 1,550 metres; evenings can be cool.',
      'Go to Monte Albán early for cooler temperatures and softer light.',
      'Ask before photographing people, particularly in villages and markets.',
      'Buy textiles directly from workshops where possible.',
    ],
    featuredRank: 16,
  },
  {
    slug: 'scottish-highlands',
    location: { lat: 56.6826, lng: -5.1023 },
    name: 'Scottish Highlands',
    country: 'United Kingdom',
    region: 'europe',
    summary: 'Glens, lochs and long summer evenings on quiet single-track roads.',
    description: [
      'The Highlands cover the mountainous north and west of Scotland: Glencoe, the Great Glen, Skye and the remote north-west coast.',
      'Distances look short on a map but roads are slow and beautiful. Fewer bases and longer stays make for a calmer trip.',
    ],
    hero: {
      id: 'photo-1563908865396-d51d56bfc94c',
      alt: 'A view over a loch and surrounding mountains',
      credit: 'Katia De Juan',
      page: 'https://unsplash.com/photos/overlooking-lake-and-mountains-egIV6BeAG6U',
    },
    gallery: [
      {
        id: 'photo-1479380775964-55daf90193fe',
        alt: 'A small cabin beneath a mountain',
        credit: 'Katie Barrett',
        page: 'https://unsplash.com/photos/cabin-near-mountain-aLIJlPrrjRM',
      },
      {
        id: 'photo-1700159411878-bb8bb3301bed',
        alt: 'A river running through a lush green valley',
        credit: 'Bryce Mercier',
        page: 'https://unsplash.com/photos/a-river-running-through-a-lush-green-valley-3IxAGNck1kE',
      },
    ],
    travelStyles: ['mountains', 'outdoors', 'slow-travel'],
    bestMonths: [5, 6, 7, 8, 9],
    seasonNote: 'May and September often have the best balance of weather and quiet roads. Midges are worst in still, damp summer evenings.',
    suggestedDays: { min: 5, max: 10 },
    costs: [10000, 4500, 3500, 2000, 1000],
    highlights: [
      { title: 'Glencoe', body: 'A dramatic glen of steep mountains, with walks from gentle valley paths to serious ridges.' },
      { title: 'Isle of Skye', body: 'The Quiraing, the Old Man of Storr and the Cuillin mountains. Book accommodation early.' },
      { title: 'The West Highland Line', body: 'A railway from Glasgow to Mallaig across moorland and the Glenfinnan Viaduct.' },
      { title: 'Wester Ross', body: 'Quiet coastal roads, white-sand beaches and the Bealach na Bà pass to Applecross.' },
    ],
    tips: [
      'Use passing places on single-track roads to let others overtake.',
      'Scotland’s outdoor access code gives broad rights to roam, with responsibilities.',
      'Pack midge repellent and a head net for summer.',
      'Weather on the hills changes fast; carry layers and a map, not just a phone.',
    ],
    featuredRank: 17,
  },
  {
    slug: 'petra-wadi-rum',
    location: { lat: 30.3285, lng: 35.4444 },
    name: 'Petra and Wadi Rum',
    country: 'Jordan',
    region: 'middle-east',
    summary: 'A rose-red city carved into sandstone, and a desert of red dunes and rock arches.',
    description: [
      'Petra was the capital of the Nabataean kingdom, its tombs and temples cut into sandstone cliffs more than two thousand years ago. It is reached on foot through a narrow gorge, the Siq.',
      'Wadi Rum, about two hours south, is a protected desert valley of sandstone mountains, best experienced overnight at a Bedouin-run camp.',
    ],
    hero: {
      id: 'photo-1580834341580-8c17a3a630ca',
      alt: 'The Treasury carved into sandstone cliffs at Petra, with people below',
      credit: 'Alex Vasey',
      page: 'https://unsplash.com/photos/treasury-in-petra-sandstone-canyon-5_Bu25SV6X8',
    },
    gallery: [
      {
        id: 'photo-1579606032821-4e6161c81bd3',
        alt: 'A camel in front of a towering rock formation',
        credit: 'Juanma Clemente-Alloza',
        page: 'https://unsplash.com/photos/brown-camel-in-front-of-brown-rock-formation-during-daytime-py8omnp-hko',
      },
      {
        id: 'photo-1589825274556-94746a018766',
        alt: 'People walking over rocky sandstone terrain',
        credit: 'Ahmad Qaisieh',
        page: 'https://unsplash.com/photos/people-walking-on-brown-rocky-mountain-during-daytime-mYEqvgcY1G4',
      },
    ],
    travelStyles: ['culture', 'outdoors'],
    bestMonths: [3, 4, 5, 10, 11],
    seasonNote: 'Spring and autumn are ideal. Summer is very hot in the desert; winter nights in Wadi Rum can drop close to freezing.',
    suggestedDays: { min: 3, max: 5 },
    costs: [8000, 3000, 2500, 5000, 800],
    highlights: [
      { title: 'The Siq and the Treasury', body: 'A kilometre-long gorge that opens dramatically onto Al-Khazneh. Arrive at opening time.' },
      { title: 'The Monastery', body: 'Around 800 steps lead to Ad Deir, larger than the Treasury and far quieter.' },
      { title: 'A night in Wadi Rum', body: 'Jeep or camel trips between rock bridges and dunes, then a camp under very dark skies.' },
      { title: 'Little Petra', body: 'A smaller Nabataean site a short drive north, often almost empty.' },
    ],
    tips: [
      'Petra is huge; a two-day ticket allows a calmer pace.',
      'The Jordan Pass bundles the tourist visa with entry to Petra and other sites for many nationalities. Check eligibility.',
      'Carry plenty of water and sun protection; there is little shade.',
      'Choose operators that treat working animals well, or walk.',
    ],
    featuredRank: 18,
  },
];
