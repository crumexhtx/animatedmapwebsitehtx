import type {
  AtlasDataset,
  DatasetCategory,
  FlowArc,
  LineSegment,
  PathMetric,
  RegionMetric,
  WeightedPoint,
} from './types'

export const categories: Array<{ name: DatasetCategory; emoji: string }> = [
  { name: 'Demographics', emoji: '◉' },
  { name: 'Mobility', emoji: '↗' },
  { name: 'Safety', emoji: '⚠' },
  { name: 'Infrastructure', emoji: '▦' },
]

export const layerLabels: Record<AtlasDataset['mapLayer'], string> = {
  hexagon: 'HexagonLayer · spatial aggregation',
  screengrid: 'ScreenGridLayer · GPU grid density',
  arc: 'ArcLayer · origin–destination flows',
  polygon: 'GeoJsonLayer · extruded polygons',
  path: 'GeoJsonLayer · metric paths',
  line: 'LineLayer · corridor segments',
}

function region(
  id: string,
  name: string,
  coordinates: [number, number],
  population: number,
  rawValue: number,
  perCapita = Number(((rawValue / population) * 100_000).toFixed(2)),
): RegionMetric {
  return { id, name, coordinates, population, rawValue, perCapita }
}

function scatterPoints(
  regions: RegionMetric[],
  scale = 1,
): WeightedPoint[] {
  const points: WeightedPoint[] = []
  regions.forEach((item) => {
    const count = Math.max(8, Math.round(item.perCapita * scale))
    for (let index = 0; index < count; index += 1) {
      const radius = Math.sqrt((index + 1) / count) * 1.8
      const angle = index * 2.399963
      const longitudeScale = Math.max(0.35, Math.cos((item.coordinates[1] * Math.PI) / 180))
      points.push({
        coordinates: [
          item.coordinates[0] + (Math.cos(angle) * radius) / longitudeScale,
          item.coordinates[1] + Math.sin(angle) * radius * 0.75,
        ],
        weight: item.perCapita,
        regionId: item.id,
        regionName: item.name,
      })
    }
  })
  return points
}

/** Traffic fatalities per 100,000 people — NHTSA-style rates by state. */
const fatalityRegions: RegionMetric[] = [
  region('ms', 'Mississippi', [-89.3985, 32.3547], 2_939_690, 936, 31.8),
  region('al', 'Alabama', [-86.9023, 32.3182], 5_108_468, 1_380, 27.0),
  region('sc', 'South Carolina', [-81.1637, 33.8361], 5_373_555, 1_397, 26.0),
  region('la', 'Louisiana', [-91.9623, 30.9843], 4_573_749, 1_143, 25.0),
  region('wy', 'Wyoming', [-107.2903, 43.076], 584_057, 140, 24.0),
  region('nm', 'New Mexico', [-105.8701, 34.5199], 2_114_371, 487, 23.0),
  region('ar', 'Arkansas', [-92.3731, 35.201], 3_067_732, 675, 22.0),
  region('ok', 'Oklahoma', [-97.5164, 35.4676], 4_053_824, 851, 21.0),
  region('ky', 'Kentucky', [-84.27, 37.8393], 4_526_154, 860, 19.0),
  region('tn', 'Tennessee', [-86.5804, 35.5175], 7_126_489, 1_282, 18.0),
  region('tx', 'Texas', [-99.9018, 31.9686], 30_503_301, 4_880, 16.0),
  region('fl', 'Florida', [-81.5158, 27.6648], 22_610_726, 3_391, 15.0),
  region('ca', 'California', [-119.4179, 36.7783], 38_965_193, 4_286, 11.0),
  region('ny', 'New York', [-74.2179, 43.2994], 19_571_216, 1_173, 6.0),
  region('ma', 'Massachusetts', [-71.3824, 42.4072], 7_001_399, 350, 5.0),
  region('ri', 'Rhode Island', [-71.4774, 41.5801], 1_095_610, 49, 4.5),
].sort((a, b) => b.perCapita - a.perCapita)

/** Major ACS-style state migration flows (net movers, illustrative). */
const migrationArcs: FlowArc[] = [
  { id: 'ca-tx', sourceName: 'California', targetName: 'Texas', source: [-119.4179, 36.7783], target: [-99.9018, 31.9686], value: 104_000 },
  { id: 'ny-fl', sourceName: 'New York', targetName: 'Florida', source: [-74.2179, 43.2994], target: [-81.5158, 27.6648], value: 72_000 },
  { id: 'ca-az', sourceName: 'California', targetName: 'Arizona', source: [-119.4179, 36.7783], target: [-111.0937, 34.0489], value: 48_000 },
  { id: 'il-fl', sourceName: 'Illinois', targetName: 'Florida', source: [-89.3985, 40.6331], target: [-81.5158, 27.6648], value: 41_000 },
  { id: 'ny-nc', sourceName: 'New York', targetName: 'North Carolina', source: [-74.2179, 43.2994], target: [-79.0193, 35.7596], value: 36_000 },
  { id: 'nj-fl', sourceName: 'New Jersey', targetName: 'Florida', source: [-74.4057, 40.0583], target: [-81.5158, 27.6648], value: 33_000 },
  { id: 'ca-nv', sourceName: 'California', targetName: 'Nevada', source: [-119.4179, 36.7783], target: [-116.4194, 38.8026], value: 31_000 },
  { id: 'wa-tx', sourceName: 'Washington', targetName: 'Texas', source: [-120.7401, 47.7511], target: [-99.9018, 31.9686], value: 27_000 },
  { id: 'ma-fl', sourceName: 'Massachusetts', targetName: 'Florida', source: [-71.3824, 42.4072], target: [-81.5158, 27.6648], value: 24_000 },
  { id: 'il-tx', sourceName: 'Illinois', targetName: 'Texas', source: [-89.3985, 40.6331], target: [-99.9018, 31.9686], value: 22_000 },
  { id: 'pa-fl', sourceName: 'Pennsylvania', targetName: 'Florida', source: [-77.1945, 41.2033], target: [-81.5158, 27.6648], value: 21_000 },
  { id: 'ny-nj', sourceName: 'New York', targetName: 'New Jersey', source: [-74.2179, 43.2994], target: [-74.4057, 40.0583], value: 18_000 },
]

const migrationRegions: RegionMetric[] = [
  region('tx', 'Texas', [-99.9018, 31.9686], 30_503_301, 230_000, 754),
  region('fl', 'Florida', [-81.5158, 27.6648], 22_610_726, 210_000, 928),
  region('nc', 'North Carolina', [-79.0193, 35.7596], 10_835_491, 78_000, 720),
  region('az', 'Arizona', [-111.0937, 34.0489], 7_431_344, 66_000, 888),
  region('nv', 'Nevada', [-116.4194, 38.8026], 3_194_176, 38_000, 1_189),
  region('ca', 'California', [-119.4179, 36.7783], 38_965_193, -145_000, -372),
  region('ny', 'New York', [-74.2179, 43.2994], 19_571_216, -120_000, -613),
  region('il', 'Illinois', [-89.3985, 40.6331], 12_549_798, -72_000, -574),
].sort((a, b) => Math.abs(b.perCapita) - Math.abs(a.perCapita))

/** Metro employment density sample points for ScreenGridLayer. */
const employmentMetros: RegionMetric[] = [
  region('nyc', 'New York metro', [-73.9857, 40.7484], 19_900_000, 9_800_000, 49_246),
  region('lax', 'Los Angeles metro', [-118.2437, 34.0522], 12_900_000, 6_100_000, 47_287),
  region('chi', 'Chicago metro', [-87.6298, 41.8781], 9_400_000, 4_700_000, 50_000),
  region('dfw', 'Dallas–Fort Worth', [-96.797, 32.7767], 7_900_000, 4_100_000, 51_899),
  region('hou', 'Houston metro', [-95.3698, 29.7604], 7_300_000, 3_600_000, 49_315),
  region('was', 'Washington metro', [-77.0369, 38.9072], 6_300_000, 3_400_000, 53_968),
  region('mia', 'Miami metro', [-80.1918, 25.7617], 6_100_000, 2_900_000, 47_541),
  region('atl', 'Atlanta metro', [-84.388, 33.749], 6_200_000, 3_100_000, 50_000),
  region('bos', 'Boston metro', [-71.0589, 42.3601], 4_900_000, 2_700_000, 55_102),
  region('sea', 'Seattle metro', [-122.3321, 47.6062], 4_100_000, 2_300_000, 56_098),
]

/** Interstate corridor fatality rates for path visualization. */
const highwayPaths: PathMetric[] = [
  {
    id: 'i95',
    name: 'I-95 East Coast',
    value: 1.42,
    path: [
      [-80.1918, 25.7617], [-81.3792, 28.5383], [-80.8431, 35.2271], [-77.0369, 38.9072],
      [-75.1652, 39.9526], [-74.006, 40.7128], [-71.0589, 42.3601], [-70.2553, 43.6591],
    ],
  },
  {
    id: 'i10',
    name: 'I-10 Southern',
    value: 1.18,
    path: [
      [-118.2437, 34.0522], [-112.074, 33.4484], [-106.6504, 32.0722], [-99.9018, 31.9686],
      [-95.3698, 29.7604], [-90.0715, 29.9511], [-84.2807, 30.4383], [-81.6557, 30.3322],
    ],
  },
  {
    id: 'i80',
    name: 'I-80 Cross-country',
    value: 0.96,
    path: [
      [-122.4194, 37.7749], [-121.4944, 38.5816], [-119.8138, 39.5296], [-111.891, 40.7608],
      [-104.9903, 39.7392], [-96.6817, 40.8136], [-87.6298, 41.8781], [-74.1724, 40.7357],
    ],
  },
  {
    id: 'i5',
    name: 'I-5 West Coast',
    value: 0.88,
    path: [
      [-122.6784, 45.5152], [-122.3321, 47.6062], [-121.4944, 38.5816], [-118.2437, 34.0522],
      [-117.1611, 32.7157],
    ],
  },
  {
    id: 'i35',
    name: 'I-35 Central',
    value: 1.31,
    path: [
      [-93.265, 44.9778], [-93.625, 41.5868], [-94.5786, 39.0997], [-97.5164, 35.4676],
      [-97.7431, 30.2672], [-98.4936, 29.4241],
    ],
  },
  {
    id: 'i90',
    name: 'I-90 Northern',
    value: 0.79,
    path: [
      [-122.3321, 47.6062], [-112.0391, 46.5891], [-100.3468, 44.3148], [-93.265, 44.9778],
      [-87.6298, 41.8781], [-81.6944, 41.4993], [-71.0589, 42.3601],
    ],
  },
]

const highwayRegions: RegionMetric[] = highwayPaths.map((path) =>
  region(path.id, path.name, path.path[Math.floor(path.path.length / 2)], 1_000_000, Math.round(path.value * 1000), path.value),
).sort((a, b) => b.perCapita - a.perCapita)

/** Major domestic flight corridors for LineLayer. */
const flightLines: LineSegment[] = [
  { id: 'jfk-lax', name: 'JFK → LAX', source: [-73.7781, 40.6413], target: [-118.4085, 33.9416], value: 42 },
  { id: 'ord-lax', name: 'ORD → LAX', source: [-87.9073, 41.9742], target: [-118.4085, 33.9416], value: 38 },
  { id: 'atl-lax', name: 'ATL → LAX', source: [-84.4277, 33.6407], target: [-118.4085, 33.9416], value: 35 },
  { id: 'jfk-mia', name: 'JFK → MIA', source: [-73.7781, 40.6413], target: [-80.2906, 25.7959], value: 33 },
  { id: 'ord-dfw', name: 'ORD → DFW', source: [-87.9073, 41.9742], target: [-97.0403, 32.8998], value: 31 },
  { id: 'sea-lax', name: 'SEA → LAX', source: [-122.3088, 47.4502], target: [-118.4085, 33.9416], value: 29 },
  { id: 'bos-ord', name: 'BOS → ORD', source: [-71.0096, 42.3656], target: [-87.9073, 41.9742], value: 27 },
  { id: 'den-lax', name: 'DEN → LAX', source: [-104.6731, 39.8561], target: [-118.4085, 33.9416], value: 26 },
  { id: 'atl-jfk', name: 'ATL → JFK', source: [-84.4277, 33.6407], target: [-73.7781, 40.6413], value: 25 },
  { id: 'sfo-jfk', name: 'SFO → JFK', source: [-122.375, 37.6189], target: [-73.7781, 40.6413], value: 24 },
  { id: 'dfw-lga', name: 'DFW → LGA', source: [-97.0403, 32.8998], target: [-73.8726, 40.7769], value: 22 },
  { id: 'msp-ord', name: 'MSP → ORD', source: [-93.2218, 44.8848], target: [-87.9073, 41.9742], value: 19 },
]

const flightRegions: RegionMetric[] = [
  region('lax', 'Los Angeles (LAX)', [-118.4085, 33.9416], 3_800_000, 210, 55.3),
  region('jfk', 'New York (JFK)', [-73.7781, 40.6413], 8_300_000, 180, 21.7),
  region('ord', 'Chicago (ORD)', [-87.9073, 41.9742], 2_700_000, 160, 59.3),
  region('atl', 'Atlanta (ATL)', [-84.4277, 33.6407], 500_000, 150, 300),
  region('dfw', 'Dallas (DFW)', [-97.0403, 32.8998], 1_300_000, 120, 92.3),
].sort((a, b) => b.perCapita - a.perCapita)

/** Population density by state for GeoJson polygon extrusion. */
const densityRegions: RegionMetric[] = [
  region('nj', 'New Jersey', [-74.4057, 40.0583], 9_290_841, 1_263, 1263),
  region('ri', 'Rhode Island', [-71.4774, 41.5801], 1_095_610, 1_061, 1061),
  region('ma', 'Massachusetts', [-71.3824, 42.4072], 7_001_399, 901, 901),
  region('ct', 'Connecticut', [-72.6851, 41.6032], 3_617_176, 745, 745),
  region('md', 'Maryland', [-76.6413, 39.0458], 6_180_253, 636, 636),
  region('de', 'Delaware', [-75.5277, 38.9108], 1_031_890, 508, 508),
  region('ny', 'New York', [-74.2179, 43.2994], 19_571_216, 429, 429),
  region('fl', 'Florida', [-81.5158, 27.6648], 22_610_726, 402, 402),
  region('pa', 'Pennsylvania', [-77.1945, 41.2033], 12_961_683, 290, 290),
  region('oh', 'Ohio', [-82.9071, 40.4173], 11_785_935, 288, 288),
  region('ca', 'California', [-119.4179, 36.7783], 38_965_193, 254, 254),
  region('il', 'Illinois', [-89.3985, 40.6331], 12_549_798, 230, 230),
  region('tx', 'Texas', [-99.9018, 31.9686], 30_503_301, 117, 117),
  region('co', 'Colorado', [-105.7821, 39.5501], 5_877_610, 56, 56),
  region('mt', 'Montana', [-110.3626, 46.8797], 1_132_812, 7.5, 7.5),
  region('wy', 'Wyoming', [-107.2903, 43.076], 584_057, 6.0, 6.0),
  region('ak', 'Alaska', [-152.4044, 64.2008], 733_406, 1.3, 1.3),
].sort((a, b) => b.perCapita - a.perCapita)

export const datasets: AtlasDataset[] = [
  {
    id: 'us-population-density',
    country: 'United States of America',
    countryCode: 'US',
    category: 'Demographics',
    title: 'Population density by state',
    eyebrow: 'Extruded choropleth',
    summary:
      'People per square mile across US states. Polygon height and color encode density—the same GeoJsonLayer pattern used for Vancouver property values.',
    metric: 'people per mi²',
    unit: 'per square mile',
    mapLayer: 'polygon',
    accent: '#7ba7ff',
    sourceLabel: 'US Census Bureau · PublicaMundi states GeoJSON',
    sourceUrl: 'https://www.census.gov/data.html',
    exampleReference: 'https://deck.gl/examples/geojson-layer-polygons',
    polygonUrl: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
    polygonValueKey: 'density',
    regions: densityRegions,
  },
  {
    id: 'us-migration-arcs',
    country: 'United States of America',
    countryCode: 'US',
    category: 'Mobility',
    title: 'State-to-state migration flows',
    eyebrow: 'Origin–destination arcs',
    summary:
      'Major domestic relocation corridors modeled after ACS migration flows. Arc width scales with mover volume—matching the deck.gl county migration example.',
    metric: 'net movers',
    unit: 'annual movers',
    mapLayer: 'arc',
    accent: '#ff784f',
    sourceLabel: 'US Census Bureau ACS Migration Flows',
    sourceUrl: 'https://www.census.gov/data/developers/data-sets/acs-migration-flows.html',
    exampleReference: 'https://deck.gl/examples/arc-layer',
    regions: migrationRegions,
    arcs: migrationArcs,
  },
  {
    id: 'us-traffic-hex',
    country: 'United States of America',
    countryCode: 'US',
    category: 'Safety',
    title: 'Traffic fatality intensity',
    eyebrow: 'Hexagon aggregation',
    summary:
      'State fatality rates expanded into weighted sample points, then aggregated into hex cells—the same HexagonLayer approach as the UK road safety demo.',
    metric: 'fatalities per 100k',
    unit: 'per 100,000 residents',
    mapLayer: 'hexagon',
    accent: '#ffcf4a',
    sourceLabel: 'NHTSA Fatality Analysis Reporting System',
    sourceUrl: 'https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars',
    exampleReference: 'https://deck.gl/examples/hexagon-layer',
    regions: fatalityRegions,
    points: scatterPoints(fatalityRegions, 1.4),
  },
  {
    id: 'us-employment-grid',
    country: 'United States of America',
    countryCode: 'US',
    category: 'Demographics',
    title: 'Metro employment density',
    eyebrow: 'Screen-space grid',
    summary:
      'Employment concentrations around major metros rendered as a ScreenGridLayer—GPU-aggregated cells similar to Uber pickup density maps.',
    metric: 'jobs per 100k residents',
    unit: 'per 100,000 residents',
    mapLayer: 'screengrid',
    accent: '#65d9ff',
    sourceLabel: 'BLS Metropolitan Area Employment',
    sourceUrl: 'https://www.bls.gov/sae/',
    exampleReference: 'https://deck.gl/examples/screen-grid-layer',
    regions: employmentMetros,
    points: scatterPoints(employmentMetros, 0.08),
  },
  {
    id: 'us-highway-paths',
    country: 'United States of America',
    countryCode: 'US',
    category: 'Safety',
    title: 'Interstate fatality rates',
    eyebrow: 'Metric path network',
    summary:
      'Primary interstate corridors colored by fatalities per 1,000 miles—matching the GeoJsonLayer path example for US highway safety.',
    metric: 'fatalities per 1,000 mi',
    unit: 'per 1,000 miles',
    mapLayer: 'path',
    accent: '#ff6f91',
    sourceLabel: 'NHTSA · FHWA Highway Statistics',
    sourceUrl: 'https://www.fhwa.dot.gov/policyinformation/statistics.cfm',
    exampleReference: 'https://deck.gl/examples/geojson-layer-paths',
    regions: highwayRegions,
    paths: highwayPaths,
  },
  {
    id: 'us-flight-lines',
    country: 'United States of America',
    countryCode: 'US',
    category: 'Infrastructure',
    title: 'Domestic flight corridors',
    eyebrow: 'Line segments',
    summary:
      'High-volume US airport pairs as LineLayer segments—the same pattern used for Heathrow flight-path visualizations in the deck.gl gallery.',
    metric: 'daily flights',
    unit: 'avg daily flights',
    mapLayer: 'line',
    accent: '#b695ff',
    sourceLabel: 'BTS Airline On-Time Statistics',
    sourceUrl: 'https://www.transtats.bts.gov/',
    exampleReference: 'https://deck.gl/examples/line-layer',
    regions: flightRegions,
    lines: flightLines,
  },
]

export const availableCountries = [...new Set(datasets.map((dataset) => dataset.country))].sort()

export function datasetsForCountry(country: string) {
  return datasets.filter((dataset) => dataset.country === country)
}
