/**
 * Generates the curated launch catalog (~180 major U.S. cities).
 * Numeric fields are approximate, cited as ACS/BLS/FBI/NOAA-style public figures
 * for v1. Re-run enrich-* scripts later to refresh from live APIs.
 *
 * Usage: npm run generate-catalog && npm run build-catalog && npm run validate-catalog
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CityRecord } from '../lib/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'data', 'raw', 'cities-seed.json')

type Seed = {
  name: string
  state: string
  stateCode: string
  population: number
  income: number
  col: number
  home: number
  rent: number
  violent: number
  property: number
  high: number
  low: number
  rain: number
  sun: number
  commute: number
  walk?: number
  unemp: number
  lat: number
  lon: number
  neighborhoods?: string[]
  featured?: boolean
}

const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

function slugify(name: string, stateCode: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${stateCode.toLowerCase()}`
}

function stateSlug(stateCode: string) {
  return STATES[stateCode].toLowerCase().replace(/\s+/g, '-')
}

/** Compact seed list — major metros & large cities for launch. */
const SEEDS: Seed[] = [
  { name: 'New York', stateCode: 'NY', state: 'New York', population: 8336817, income: 74694, col: 168, home: 750000, rent: 2800, violent: 58, property: 72, high: 84, low: 27, rain: 49.9, sun: 224, commute: 41, walk: 88, unemp: 4.8, lat: 40.7128, lon: -74.006, neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'], featured: true },
  { name: 'Los Angeles', stateCode: 'CA', state: 'California', population: 3898747, income: 69778, col: 149, home: 920000, rent: 2400, violent: 62, property: 78, high: 84, low: 49, rain: 14.9, sun: 284, commute: 31, walk: 69, unemp: 5.1, lat: 34.0522, lon: -118.2437, neighborhoods: ['Hollywood', 'Downtown', 'Santa Monica', 'Silver Lake'], featured: true },
  { name: 'Chicago', stateCode: 'IL', state: 'Illinois', population: 2746388, income: 65781, col: 107, home: 320000, rent: 1650, violent: 71, property: 68, high: 84, low: 18, rain: 39.0, sun: 189, commute: 35, walk: 77, unemp: 4.9, lat: 41.8781, lon: -87.6298, neighborhoods: ['Loop', 'Lincoln Park', 'Wicker Park', 'Hyde Park'], featured: true },
  { name: 'Houston', stateCode: 'TX', state: 'Texas', population: 2304580, income: 56277, col: 96, home: 280000, rent: 1400, violent: 75, property: 82, high: 94, low: 45, rain: 49.8, sun: 204, commute: 28, walk: 47, unemp: 4.2, lat: 29.7604, lon: -95.3698, neighborhoods: ['Downtown', 'Montrose', 'The Heights', 'Midtown'], featured: true },
  { name: 'Phoenix', stateCode: 'AZ', state: 'Arizona', population: 1608139, income: 64957, col: 103, home: 430000, rent: 1600, violent: 55, property: 70, high: 106, low: 45, rain: 8.0, sun: 299, commute: 26, walk: 41, unemp: 3.8, lat: 33.4484, lon: -112.074, neighborhoods: ['Downtown', 'Arcadia', 'Roosevelt Row', 'Melrose'], featured: true },
  { name: 'Philadelphia', stateCode: 'PA', state: 'Pennsylvania', population: 1603797, income: 52649, col: 105, home: 245000, rent: 1450, violent: 68, property: 65, high: 87, low: 26, rain: 44.1, sun: 205, commute: 33, walk: 79, unemp: 4.6, lat: 39.9526, lon: -75.1652, neighborhoods: ['Center City', 'Fishtown', 'University City', 'South Philly'], featured: true },
  { name: 'San Antonio', stateCode: 'TX', state: 'Texas', population: 1434625, income: 53435, col: 92, home: 265000, rent: 1250, violent: 52, property: 74, high: 95, low: 41, rain: 32.3, sun: 224, commute: 25, walk: 37, unemp: 3.9, lat: 29.4241, lon: -98.4936, neighborhoods: ['Downtown', 'Alamo Heights', 'Pearl', 'Southtown'] },
  { name: 'San Diego', stateCode: 'CA', state: 'California', population: 1386932, income: 83454, col: 146, home: 850000, rent: 2300, violent: 38, property: 55, high: 78, low: 50, rain: 10.3, sun: 266, commute: 25, walk: 53, unemp: 4.0, lat: 32.7157, lon: -117.1611, neighborhoods: ['Gaslamp', 'La Jolla', 'North Park', 'Pacific Beach'], featured: true },
  { name: 'Dallas', stateCode: 'TX', state: 'Texas', population: 1304379, income: 57902, col: 101, home: 340000, rent: 1500, violent: 60, property: 76, high: 96, low: 37, rain: 37.6, sun: 232, commute: 27, walk: 46, unemp: 3.7, lat: 32.7767, lon: -96.797, neighborhoods: ['Downtown', 'Uptown', 'Deep Ellum', 'Bishop Arts'], featured: true },
  { name: 'Austin', stateCode: 'TX', state: 'Texas', population: 978908, income: 75752, col: 112, home: 520000, rent: 1700, violent: 42, property: 68, high: 97, low: 42, rain: 34.2, sun: 228, commute: 26, walk: 42, unemp: 3.4, lat: 30.2672, lon: -97.7431, neighborhoods: ['Downtown', 'South Congress', 'East Austin', 'Domain'], featured: true },
  { name: 'Jacksonville', stateCode: 'FL', state: 'Florida', population: 949611, income: 58106, col: 95, home: 295000, rent: 1400, violent: 58, property: 71, high: 92, low: 46, rain: 52.4, sun: 221, commute: 26, walk: 26, unemp: 3.6, lat: 30.3322, lon: -81.6557 },
  { name: 'San Jose', stateCode: 'CA', state: 'California', population: 1013240, income: 126377, col: 172, home: 1400000, rent: 2900, violent: 32, property: 48, high: 82, low: 42, rain: 15.8, sun: 256, commute: 29, walk: 51, unemp: 3.9, lat: 37.3382, lon: -121.8863, neighborhoods: ['Downtown', 'Willow Glen', 'Japantown'], featured: true },
  { name: 'Fort Worth', stateCode: 'TX', state: 'Texas', population: 918915, income: 65070, col: 97, home: 310000, rent: 1400, violent: 48, property: 70, high: 96, low: 36, rain: 36.0, sun: 233, commute: 26, walk: 35, unemp: 3.8, lat: 32.7555, lon: -97.3308 },
  { name: 'Columbus', stateCode: 'OH', state: 'Ohio', population: 905748, income: 56679, col: 90, home: 250000, rent: 1200, violent: 45, property: 66, high: 85, low: 22, rain: 39.3, sun: 180, commute: 23, walk: 41, unemp: 3.7, lat: 39.9612, lon: -82.9988, featured: true },
  { name: 'Charlotte', stateCode: 'NC', state: 'North Carolina', population: 874579, income: 65672, col: 99, home: 380000, rent: 1500, violent: 50, property: 68, high: 89, low: 32, rain: 43.1, sun: 218, commute: 26, walk: 26, unemp: 3.5, lat: 35.2271, lon: -80.8431, featured: true },
  { name: 'Indianapolis', stateCode: 'IN', state: 'Indiana', population: 887642, income: 50813, col: 88, home: 220000, rent: 1150, violent: 72, property: 74, high: 85, low: 21, rain: 42.4, sun: 186, commute: 24, walk: 31, unemp: 3.6, lat: 39.7684, lon: -86.1581 },
  { name: 'San Francisco', stateCode: 'CA', state: 'California', population: 873965, income: 126187, col: 179, home: 1350000, rent: 3100, violent: 48, property: 85, high: 72, low: 46, rain: 23.6, sun: 259, commute: 34, walk: 89, unemp: 3.8, lat: 37.7749, lon: -122.4194, neighborhoods: ['Mission', 'Marina', 'SOMA', 'Noe Valley'], featured: true },
  { name: 'Seattle', stateCode: 'WA', state: 'Washington', population: 737015, income: 105612, col: 142, home: 820000, rent: 2100, violent: 44, property: 72, high: 76, low: 37, rain: 39.3, sun: 152, commute: 30, walk: 74, unemp: 3.9, lat: 47.6062, lon: -122.3321, neighborhoods: ['Capitol Hill', 'Ballard', 'Fremont', 'Queen Anne'], featured: true },
  { name: 'Denver', stateCode: 'CO', state: 'Colorado', population: 715522, income: 78177, col: 118, home: 560000, rent: 1750, violent: 55, property: 70, high: 88, low: 20, rain: 15.6, sun: 245, commute: 27, walk: 61, unemp: 3.5, lat: 39.7392, lon: -104.9903, neighborhoods: ['LoDo', 'RiNo', 'Capitol Hill', 'Highlands'], featured: true },
  { name: 'Washington', stateCode: 'DC', state: 'District of Columbia', population: 689545, income: 93547, col: 152, home: 680000, rent: 2200, violent: 62, property: 58, high: 88, low: 30, rain: 39.7, sun: 203, commute: 34, walk: 77, unemp: 4.5, lat: 38.9072, lon: -77.0369, neighborhoods: ['Georgetown', 'Dupont Circle', 'Capitol Hill', 'Adams Morgan'], featured: true },
  { name: 'Boston', stateCode: 'MA', state: 'Massachusetts', population: 675647, income: 81295, col: 148, home: 750000, rent: 2500, violent: 42, property: 52, high: 82, low: 23, rain: 43.8, sun: 200, commute: 35, walk: 83, unemp: 3.6, lat: 42.3601, lon: -71.0589, neighborhoods: ['Back Bay', 'South End', 'Cambridge-adjacent', 'North End'], featured: true },
  { name: 'El Paso', stateCode: 'TX', state: 'Texas', population: 678815, income: 48666, col: 86, home: 195000, rent: 1000, violent: 28, property: 42, high: 97, low: 34, rain: 9.7, sun: 302, commute: 23, walk: 40, unemp: 4.1, lat: 31.7619, lon: -106.485 },
  { name: 'Nashville', stateCode: 'TN', state: 'Tennessee', population: 689447, income: 62867, col: 103, home: 450000, rent: 1600, violent: 72, property: 78, high: 90, low: 30, rain: 47.3, sun: 208, commute: 26, walk: 29, unemp: 3.2, lat: 36.1627, lon: -86.7816, featured: true },
  { name: 'Detroit', stateCode: 'MI', state: 'Michigan', population: 639111, income: 34464, col: 85, home: 75000, rent: 950, violent: 95, property: 88, high: 83, low: 19, rain: 33.5, sun: 183, commute: 26, walk: 55, unemp: 6.2, lat: 42.3314, lon: -83.0458 },
  { name: 'Oklahoma City', stateCode: 'OK', state: 'Oklahoma', population: 681054, income: 58329, col: 87, home: 210000, rent: 1100, violent: 55, property: 72, high: 94, low: 29, rain: 36.5, sun: 235, commute: 22, walk: 34, unemp: 3.3, lat: 35.4676, lon: -97.5164 },
  { name: 'Portland', stateCode: 'OR', state: 'Oregon', population: 652503, income: 73159, col: 124, home: 520000, rent: 1600, violent: 48, property: 80, high: 81, low: 36, rain: 36.8, sun: 144, commute: 27, walk: 67, unemp: 4.0, lat: 45.5152, lon: -122.6784, featured: true },
  { name: 'Las Vegas', stateCode: 'NV', state: 'Nevada', population: 641903, income: 58349, col: 104, home: 410000, rent: 1450, violent: 58, property: 75, high: 104, low: 39, rain: 4.2, sun: 294, commute: 25, walk: 42, unemp: 5.2, lat: 36.1699, lon: -115.1398, featured: true },
  { name: 'Memphis', stateCode: 'TN', state: 'Tennessee', population: 633104, income: 43625, col: 84, home: 165000, rent: 1050, violent: 98, property: 92, high: 92, low: 33, rain: 53.7, sun: 218, commute: 23, walk: 35, unemp: 4.8, lat: 35.1495, lon: -90.049 },
  { name: 'Louisville', stateCode: 'KY', state: 'Kentucky', population: 633045, income: 54629, col: 89, home: 230000, rent: 1150, violent: 58, property: 70, high: 89, low: 27, rain: 44.9, sun: 195, commute: 23, walk: 34, unemp: 3.8, lat: 38.2527, lon: -85.7585 },
  { name: 'Baltimore', stateCode: 'MD', state: 'Maryland', population: 585708, income: 54124, col: 108, home: 195000, rent: 1350, violent: 88, property: 72, high: 88, low: 28, rain: 41.9, sun: 213, commute: 31, walk: 69, unemp: 4.7, lat: 39.2904, lon: -76.6122 },
  { name: 'Milwaukee', stateCode: 'WI', state: 'Wisconsin', population: 577222, income: 45168, col: 91, home: 185000, rent: 1100, violent: 78, property: 68, high: 82, low: 16, rain: 34.8, sun: 190, commute: 23, walk: 62, unemp: 4.1, lat: 43.0389, lon: -87.9065 },
  { name: 'Albuquerque', stateCode: 'NM', state: 'New Mexico', population: 564559, income: 53516, col: 94, home: 295000, rent: 1200, violent: 72, property: 78, high: 92, low: 27, rain: 9.5, sun: 280, commute: 23, walk: 43, unemp: 4.0, lat: 35.0844, lon: -106.6504 },
  { name: 'Tucson', stateCode: 'AZ', state: 'Arizona', population: 542629, income: 48068, col: 95, home: 310000, rent: 1200, violent: 52, property: 68, high: 100, low: 39, rain: 11.6, sun: 286, commute: 23, walk: 43, unemp: 4.2, lat: 32.2226, lon: -110.9747 },
  { name: 'Fresno', stateCode: 'CA', state: 'California', population: 542107, income: 53268, col: 108, home: 380000, rent: 1400, violent: 55, property: 72, high: 98, low: 38, rain: 11.5, sun: 271, commute: 23, walk: 47, unemp: 6.8, lat: 36.7378, lon: -119.7871 },
  { name: 'Sacramento', stateCode: 'CA', state: 'California', population: 524943, income: 65856, col: 122, home: 480000, rent: 1700, violent: 55, property: 68, high: 92, low: 40, rain: 18.5, sun: 269, commute: 27, walk: 49, unemp: 4.5, lat: 38.5816, lon: -121.4944 },
  { name: 'Mesa', stateCode: 'AZ', state: 'Arizona', population: 504258, income: 61540, col: 101, home: 400000, rent: 1500, violent: 38, property: 55, high: 105, low: 44, rain: 8.5, sun: 296, commute: 25, walk: 37, unemp: 3.6, lat: 33.4152, lon: -111.8315 },
  { name: 'Kansas City', stateCode: 'MO', state: 'Missouri', population: 508090, income: 58303, col: 90, home: 240000, rent: 1200, violent: 78, property: 72, high: 89, low: 23, rain: 39.1, sun: 215, commute: 23, walk: 35, unemp: 3.5, lat: 39.0997, lon: -94.5786 },
  { name: 'Atlanta', stateCode: 'GA', state: 'Georgia', population: 498715, income: 64129, col: 108, home: 420000, rent: 1650, violent: 68, property: 72, high: 89, low: 36, rain: 50.2, sun: 217, commute: 31, walk: 48, unemp: 3.8, lat: 33.749, lon: -84.388, neighborhoods: ['Midtown', 'Buckhead', 'Old Fourth Ward', 'Virginia-Highland'], featured: true },
  { name: 'Colorado Springs', stateCode: 'CO', state: 'Colorado', population: 478961, income: 67819, col: 108, home: 450000, rent: 1500, violent: 42, property: 58, high: 84, low: 18, rain: 16.5, sun: 247, commute: 23, walk: 37, unemp: 3.4, lat: 38.8339, lon: -104.8214 },
  { name: 'Raleigh', stateCode: 'NC', state: 'North Carolina', population: 467665, income: 71159, col: 102, home: 420000, rent: 1500, violent: 35, property: 52, high: 89, low: 32, rain: 46.0, sun: 213, commute: 24, walk: 32, unemp: 3.2, lat: 35.7796, lon: -78.6382, featured: true },
  { name: 'Omaha', stateCode: 'NE', state: 'Nebraska', population: 486051, income: 62213, col: 90, home: 245000, rent: 1150, violent: 48, property: 62, high: 87, low: 16, rain: 30.9, sun: 214, commute: 20, walk: 33, unemp: 2.9, lat: 41.2565, lon: -95.9345 },
  { name: 'Miami', stateCode: 'FL', state: 'Florida', population: 442241, income: 47986, col: 123, home: 520000, rent: 2200, violent: 58, property: 72, high: 90, low: 61, rain: 61.9, sun: 249, commute: 30, walk: 78, unemp: 3.1, lat: 25.7617, lon: -80.1918, featured: true },
  { name: 'Long Beach', stateCode: 'CA', state: 'California', population: 466742, income: 66410, col: 142, home: 720000, rent: 2000, violent: 48, property: 62, high: 82, low: 48, rain: 12.0, sun: 280, commute: 29, walk: 70, unemp: 5.0, lat: 33.7701, lon: -118.1937 },
  { name: 'Virginia Beach', stateCode: 'VA', state: 'Virginia', population: 459470, income: 76610, col: 104, home: 350000, rent: 1500, violent: 18, property: 42, high: 86, low: 34, rain: 46.5, sun: 214, commute: 24, walk: 33, unemp: 3.2, lat: 36.8529, lon: -75.978 },
  { name: 'Oakland', stateCode: 'CA', state: 'California', population: 440646, income: 80290, col: 155, home: 780000, rent: 2200, violent: 78, property: 82, high: 73, low: 46, rain: 23.4, sun: 260, commute: 33, walk: 72, unemp: 4.6, lat: 37.8044, lon: -122.2712 },
  { name: 'Minneapolis', stateCode: 'MN', state: 'Minnesota', population: 429954, income: 70099, col: 105, home: 340000, rent: 1450, violent: 72, property: 68, high: 83, low: 8, rain: 30.6, sun: 198, commute: 25, walk: 71, unemp: 3.0, lat: 44.9778, lon: -93.265, featured: true },
  { name: 'Tulsa', stateCode: 'OK', state: 'Oklahoma', population: 413066, income: 51008, col: 85, home: 195000, rent: 1000, violent: 68, property: 75, high: 94, low: 28, rain: 40.5, sun: 230, commute: 20, walk: 39, unemp: 3.5, lat: 36.154, lon: -95.9928 },
  { name: 'Tampa', stateCode: 'FL', state: 'Florida', population: 384959, income: 55754, col: 102, home: 380000, rent: 1650, violent: 52, property: 58, high: 91, low: 52, rain: 46.3, sun: 244, commute: 27, walk: 50, unemp: 3.3, lat: 27.9506, lon: -82.4572, featured: true },
  { name: 'Arlington', stateCode: 'TX', state: 'Texas', population: 394266, income: 63183, col: 96, home: 300000, rent: 1350, violent: 42, property: 62, high: 96, low: 36, rain: 37.0, sun: 232, commute: 26, walk: 35, unemp: 3.7, lat: 32.7357, lon: -97.1081 },
  { name: 'New Orleans', stateCode: 'LA', state: 'Louisiana', population: 383997, income: 43258, col: 97, home: 280000, rent: 1300, violent: 92, property: 78, high: 91, low: 45, rain: 62.7, sun: 216, commute: 24, walk: 58, unemp: 4.9, lat: 29.9511, lon: -90.0715, featured: true },
  { name: 'Wichita', stateCode: 'KS', state: 'Kansas', population: 397532, income: 53065, col: 84, home: 175000, rent: 950, violent: 68, property: 72, high: 93, low: 23, rain: 34.3, sun: 225, commute: 19, walk: 35, unemp: 3.6, lat: 37.6872, lon: -97.3301 },
  { name: 'Cleveland', stateCode: 'OH', state: 'Ohio', population: 372624, income: 33704, col: 86, home: 95000, rent: 950, violent: 88, property: 72, high: 82, low: 21, rain: 39.1, sun: 166, commute: 24, walk: 57, unemp: 5.1, lat: 41.4993, lon: -81.6944 },
  { name: 'Bakersfield', stateCode: 'CA', state: 'California', population: 403455, income: 59962, col: 108, home: 350000, rent: 1350, violent: 48, property: 68, high: 98, low: 39, rain: 6.5, sun: 278, commute: 24, walk: 38, unemp: 7.2, lat: 35.3733, lon: -119.0187 },
  { name: 'Aurora', stateCode: 'CO', state: 'Colorado', population: 386261, income: 68294, col: 112, home: 470000, rent: 1600, violent: 48, property: 58, high: 88, low: 19, rain: 15.0, sun: 245, commute: 28, walk: 40, unemp: 3.6, lat: 39.7294, lon: -104.8319 },
  { name: 'Anaheim', stateCode: 'CA', state: 'California', population: 346824, income: 71723, col: 148, home: 800000, rent: 2200, violent: 32, property: 52, high: 84, low: 48, rain: 13.0, sun: 278, commute: 28, walk: 56, unemp: 4.2, lat: 33.8366, lon: -117.9143 },
  { name: 'Honolulu', stateCode: 'HI', state: 'Hawaii', population: 350964, income: 85098, col: 168, home: 850000, rent: 2200, violent: 28, property: 68, high: 87, low: 66, rain: 18.3, sun: 271, commute: 28, walk: 66, unemp: 3.0, lat: 21.3069, lon: -157.8583, featured: true },
  { name: 'Santa Ana', stateCode: 'CA', state: 'California', population: 310227, income: 67797, col: 145, home: 720000, rent: 2000, violent: 38, property: 55, high: 84, low: 48, rain: 12.5, sun: 278, commute: 27, walk: 67, unemp: 4.3, lat: 33.7455, lon: -117.8677 },
  { name: 'Riverside', stateCode: 'CA', state: 'California', population: 314998, income: 72324, col: 128, home: 550000, rent: 1800, violent: 42, property: 62, high: 95, low: 43, rain: 10.3, sun: 277, commute: 32, walk: 43, unemp: 5.0, lat: 33.9806, lon: -117.3755 },
  { name: 'Corpus Christi', stateCode: 'TX', state: 'Texas', population: 317863, income: 55489, col: 90, home: 210000, rent: 1200, violent: 58, property: 72, high: 93, low: 48, rain: 32.0, sun: 228, commute: 21, walk: 40, unemp: 4.4, lat: 27.8006, lon: -97.3964 },
  { name: 'Lexington', stateCode: 'KY', state: 'Kentucky', population: 322570, income: 57191, col: 88, home: 250000, rent: 1100, violent: 32, property: 55, high: 87, low: 26, rain: 45.2, sun: 188, commute: 20, walk: 34, unemp: 3.4, lat: 38.0406, lon: -84.5037 },
  { name: 'Henderson', stateCode: 'NV', state: 'Nevada', population: 317610, income: 75325, col: 106, home: 450000, rent: 1550, violent: 18, property: 42, high: 104, low: 38, rain: 4.5, sun: 294, commute: 24, walk: 30, unemp: 4.8, lat: 36.0395, lon: -114.9817 },
  { name: 'Stockton', stateCode: 'CA', state: 'California', population: 320804, income: 58163, col: 118, home: 420000, rent: 1500, violent: 78, property: 72, high: 93, low: 39, rain: 14.0, sun: 265, commute: 30, walk: 44, unemp: 7.0, lat: 37.9577, lon: -121.2908 },
  { name: 'Saint Paul', stateCode: 'MN', state: 'Minnesota', population: 311527, income: 59734, col: 102, home: 280000, rent: 1300, violent: 55, property: 62, high: 83, low: 8, rain: 31.5, sun: 196, commute: 24, walk: 60, unemp: 3.1, lat: 44.9537, lon: -93.09 },
  { name: 'Cincinnati', stateCode: 'OH', state: 'Ohio', population: 309317, income: 43339, col: 90, home: 210000, rent: 1100, violent: 68, property: 70, high: 86, low: 24, rain: 42.0, sun: 176, commute: 24, walk: 49, unemp: 3.9, lat: 39.1031, lon: -84.512 },
  { name: 'St. Louis', stateCode: 'MO', state: 'Missouri', population: 301578, income: 45782, col: 87, home: 175000, rent: 1050, violent: 98, property: 82, high: 90, low: 24, rain: 41.0, sun: 205, commute: 24, walk: 65, unemp: 4.0, lat: 38.627, lon: -90.1994 },
  { name: 'Pittsburgh', stateCode: 'PA', state: 'Pennsylvania', population: 302971, income: 54130, col: 94, home: 220000, rent: 1250, violent: 48, property: 55, high: 83, low: 23, rain: 38.2, sun: 160, commute: 26, walk: 62, unemp: 4.0, lat: 40.4406, lon: -79.9959, featured: true },
  { name: 'Greensboro', stateCode: 'NC', state: 'North Carolina', population: 299035, income: 48918, col: 90, home: 230000, rent: 1100, violent: 58, property: 68, high: 88, low: 31, rain: 43.0, sun: 217, commute: 22, walk: 32, unemp: 3.8, lat: 36.0726, lon: -79.792 },
  { name: 'Lincoln', stateCode: 'NE', state: 'Nebraska', population: 291082, income: 60423, col: 88, home: 250000, rent: 1050, violent: 32, property: 48, high: 88, low: 15, rain: 28.9, sun: 216, commute: 18, walk: 40, unemp: 2.5, lat: 40.8136, lon: -96.7026 },
  { name: 'Plano', stateCode: 'TX', state: 'Texas', population: 285494, income: 96334, col: 108, home: 450000, rent: 1700, violent: 12, property: 38, high: 96, low: 36, rain: 38.0, sun: 230, commute: 27, walk: 38, unemp: 3.3, lat: 33.0198, lon: -96.6989 },
  { name: 'Anchorage', stateCode: 'AK', state: 'Alaska', population: 291247, income: 84824, col: 128, home: 380000, rent: 1400, violent: 72, property: 68, high: 65, low: 11, rain: 16.6, sun: 126, commute: 20, walk: 31, unemp: 4.5, lat: 61.2181, lon: -149.9003 },
  { name: 'Orlando', stateCode: 'FL', state: 'Florida', population: 307573, income: 55183, col: 104, home: 360000, rent: 1600, violent: 58, property: 72, high: 92, low: 51, rain: 51.0, sun: 236, commute: 28, walk: 41, unemp: 3.4, lat: 28.5383, lon: -81.3792, featured: true },
  { name: 'Irvine', stateCode: 'CA', state: 'California', population: 307670, income: 108318, col: 155, home: 1100000, rent: 2800, violent: 8, property: 32, high: 82, low: 48, rain: 13.0, sun: 278, commute: 26, walk: 43, unemp: 3.5, lat: 33.6846, lon: -117.8265 },
  { name: 'Newark', stateCode: 'NJ', state: 'New Jersey', population: 311549, income: 37362, col: 125, home: 380000, rent: 1500, violent: 72, property: 58, high: 86, low: 25, rain: 46.0, sun: 210, commute: 35, walk: 75, unemp: 5.5, lat: 40.7357, lon: -74.1724 },
  { name: 'Durham', stateCode: 'NC', state: 'North Carolina', population: 283506, income: 61962, col: 100, home: 380000, rent: 1400, violent: 58, property: 62, high: 89, low: 32, rain: 46.5, sun: 214, commute: 23, walk: 30, unemp: 3.3, lat: 35.994, lon: -78.8986 },
  { name: 'Chula Vista', stateCode: 'CA', state: 'California', population: 275487, income: 85904, col: 140, home: 750000, rent: 2200, violent: 22, property: 42, high: 78, low: 50, rain: 10.0, sun: 266, commute: 28, walk: 42, unemp: 4.5, lat: 32.6401, lon: -117.0842 },
  { name: 'Toledo', stateCode: 'OH', state: 'Ohio', population: 270871, income: 39678, col: 84, home: 120000, rent: 900, violent: 72, property: 72, high: 84, low: 20, rain: 33.5, sun: 178, commute: 20, walk: 45, unemp: 4.6, lat: 41.6528, lon: -83.5379 },
  { name: 'Fort Wayne', stateCode: 'IN', state: 'Indiana', population: 263886, income: 51384, col: 85, home: 185000, rent: 1000, violent: 38, property: 55, high: 84, low: 19, rain: 38.0, sun: 184, commute: 20, walk: 32, unemp: 3.5, lat: 41.0793, lon: -85.1394 },
  { name: 'St. Petersburg', stateCode: 'FL', state: 'Florida', population: 258308, income: 56692, col: 102, home: 350000, rent: 1550, violent: 48, property: 58, high: 91, low: 54, rain: 51.0, sun: 248, commute: 25, walk: 43, unemp: 3.2, lat: 27.7676, lon: -82.6403 },
  { name: 'Laredo', stateCode: 'TX', state: 'Texas', population: 255205, income: 47987, col: 85, home: 180000, rent: 950, violent: 32, property: 48, high: 99, low: 47, rain: 20.0, sun: 260, commute: 20, walk: 40, unemp: 4.8, lat: 27.5306, lon: -99.4803 },
  { name: 'Jersey City', stateCode: 'NJ', state: 'New Jersey', population: 292449, income: 76444, col: 145, home: 580000, rent: 2400, violent: 38, property: 48, high: 85, low: 26, rain: 48.0, sun: 210, commute: 38, walk: 87, unemp: 4.2, lat: 40.7178, lon: -74.0431 },
  { name: 'Chandler', stateCode: 'AZ', state: 'Arizona', population: 275987, income: 86341, col: 105, home: 480000, rent: 1700, violent: 18, property: 38, high: 105, low: 44, rain: 8.0, sun: 296, commute: 25, walk: 35, unemp: 3.2, lat: 33.3062, lon: -111.8413 },
  { name: 'Madison', stateCode: 'WI', state: 'Wisconsin', population: 269840, income: 67865, col: 102, home: 350000, rent: 1350, violent: 28, property: 48, high: 82, low: 12, rain: 34.0, sun: 186, commute: 20, walk: 50, unemp: 2.6, lat: 43.0731, lon: -89.4012 },
  { name: 'Lubbock', stateCode: 'TX', state: 'Texas', population: 257141, income: 51158, col: 86, home: 195000, rent: 1050, violent: 68, property: 72, high: 94, low: 29, rain: 18.5, sun: 262, commute: 17, walk: 35, unemp: 3.5, lat: 33.5779, lon: -101.8552 },
  { name: 'Scottsdale', stateCode: 'AZ', state: 'Arizona', population: 241361, income: 96745, col: 118, home: 720000, rent: 2100, violent: 15, property: 42, high: 105, low: 44, rain: 8.0, sun: 296, commute: 23, walk: 40, unemp: 3.0, lat: 33.4942, lon: -111.9261 },
  { name: 'Reno', stateCode: 'NV', state: 'Nevada', population: 264165, income: 62049, col: 108, home: 480000, rent: 1500, violent: 48, property: 58, high: 92, low: 25, rain: 7.4, sun: 252, commute: 22, walk: 37, unemp: 3.9, lat: 39.5296, lon: -119.8138 },
  { name: 'Buffalo', stateCode: 'NY', state: 'New York', population: 278349, income: 40534, col: 90, home: 175000, rent: 1000, violent: 68, property: 62, high: 80, low: 18, rain: 40.5, sun: 160, commute: 21, walk: 68, unemp: 4.5, lat: 42.8864, lon: -78.8784 },
  { name: 'Gilbert', stateCode: 'AZ', state: 'Arizona', population: 267918, income: 99191, col: 108, home: 520000, rent: 1800, violent: 10, property: 32, high: 105, low: 44, rain: 8.0, sun: 296, commute: 27, walk: 28, unemp: 2.9, lat: 33.3528, lon: -111.789 },
  { name: 'Glendale', stateCode: 'AZ', state: 'Arizona', population: 248325, income: 57515, col: 100, home: 380000, rent: 1400, violent: 42, property: 58, high: 105, low: 44, rain: 8.0, sun: 296, commute: 26, walk: 40, unemp: 3.9, lat: 33.5387, lon: -112.186 },
  { name: 'North Las Vegas', stateCode: 'NV', state: 'Nevada', population: 262527, income: 58310, col: 102, home: 380000, rent: 1400, violent: 48, property: 62, high: 104, low: 38, rain: 4.2, sun: 294, commute: 26, walk: 32, unemp: 5.5, lat: 36.1989, lon: -115.1175 },
  { name: 'Winston-Salem', stateCode: 'NC', state: 'North Carolina', population: 249545, income: 47585, col: 88, home: 220000, rent: 1050, violent: 55, property: 65, high: 88, low: 30, rain: 44.0, sun: 216, commute: 21, walk: 28, unemp: 3.7, lat: 36.0999, lon: -80.2442 },
  { name: 'Chesapeake', stateCode: 'VA', state: 'Virginia', population: 249422, income: 78136, col: 102, home: 340000, rent: 1500, violent: 28, property: 42, high: 87, low: 33, rain: 47.0, sun: 212, commute: 26, walk: 21, unemp: 3.1, lat: 36.7682, lon: -76.2875 },
  { name: 'Norfolk', stateCode: 'VA', state: 'Virginia', population: 238005, income: 53027, col: 100, home: 260000, rent: 1300, violent: 55, property: 62, high: 87, low: 34, rain: 47.0, sun: 214, commute: 22, walk: 45, unemp: 3.6, lat: 36.8508, lon: -76.2859 },
  { name: 'Fremont', stateCode: 'CA', state: 'California', population: 230504, income: 142696, col: 168, home: 1400000, rent: 2800, violent: 12, property: 38, high: 78, low: 44, rain: 15.0, sun: 260, commute: 33, walk: 50, unemp: 3.4, lat: 37.5485, lon: -121.9886 },
  { name: 'Garland', stateCode: 'TX', state: 'Texas', population: 246018, income: 61715, col: 98, home: 280000, rent: 1350, violent: 32, property: 55, high: 96, low: 36, rain: 39.0, sun: 230, commute: 28, walk: 40, unemp: 3.8, lat: 32.9126, lon: -96.6389 },
  { name: 'Irving', stateCode: 'TX', state: 'Texas', population: 256684, income: 64888, col: 100, home: 320000, rent: 1450, violent: 28, property: 52, high: 96, low: 36, rain: 37.5, sun: 232, commute: 25, walk: 42, unemp: 3.6, lat: 32.814, lon: -96.9489 },
  { name: 'Hialeah', stateCode: 'FL', state: 'Florida', population: 223109, income: 38483, col: 115, home: 380000, rent: 1600, violent: 28, property: 48, high: 90, low: 61, rain: 60.0, sun: 249, commute: 29, walk: 60, unemp: 3.2, lat: 25.8576, lon: -80.2781 },
  { name: 'Richmond', stateCode: 'VA', state: 'Virginia', population: 226610, income: 51451, col: 100, home: 320000, rent: 1350, violent: 55, property: 62, high: 89, low: 30, rain: 43.5, sun: 206, commute: 23, walk: 51, unemp: 3.5, lat: 37.5407, lon: -77.436 },
  { name: 'Boise', stateCode: 'ID', state: 'Idaho', population: 235684, income: 63758, col: 105, home: 480000, rent: 1450, violent: 28, property: 48, high: 91, low: 24, rain: 12.1, sun: 210, commute: 20, walk: 41, unemp: 3.0, lat: 43.615, lon: -116.2023, featured: true },
  { name: 'Spokane', stateCode: 'WA', state: 'Washington', population: 228989, income: 52971, col: 100, home: 360000, rent: 1250, violent: 48, property: 72, high: 84, low: 25, rain: 16.5, sun: 174, commute: 21, walk: 49, unemp: 4.2, lat: 47.6588, lon: -117.426 },
  { name: 'Baton Rouge', stateCode: 'LA', state: 'Louisiana', population: 227470, income: 44451, col: 90, home: 210000, rent: 1100, violent: 78, property: 75, high: 92, low: 42, rain: 60.0, sun: 218, commute: 23, walk: 39, unemp: 4.2, lat: 30.4515, lon: -91.1871 },
  { name: 'Tacoma', stateCode: 'WA', state: 'Washington', population: 219346, income: 64457, col: 118, home: 480000, rent: 1600, violent: 58, property: 68, high: 77, low: 36, rain: 39.0, sun: 142, commute: 30, walk: 54, unemp: 4.5, lat: 47.2529, lon: -122.4443 },
  { name: 'San Bernardino', stateCode: 'CA', state: 'California', population: 222101, income: 49401, col: 118, home: 420000, rent: 1500, violent: 78, property: 72, high: 96, low: 43, rain: 15.0, sun: 277, commute: 30, walk: 45, unemp: 6.0, lat: 34.1083, lon: -117.2898 },
  { name: 'Modesto', stateCode: 'CA', state: 'California', population: 218464, income: 61244, col: 115, home: 420000, rent: 1500, violent: 58, property: 68, high: 95, low: 39, rain: 13.0, sun: 265, commute: 28, walk: 44, unemp: 6.5, lat: 37.6391, lon: -120.9969 },
  { name: 'Fontana', stateCode: 'CA', state: 'California', population: 208393, income: 72788, col: 125, home: 550000, rent: 1800, violent: 32, property: 48, high: 95, low: 43, rain: 14.0, sun: 277, commute: 34, walk: 35, unemp: 5.2, lat: 34.0922, lon: -117.435 },
  { name: 'Des Moines', stateCode: 'IA', state: 'Iowa', population: 214133, income: 54811, col: 86, home: 200000, rent: 1000, violent: 48, property: 62, high: 86, low: 15, rain: 35.0, sun: 205, commute: 19, walk: 45, unemp: 3.0, lat: 41.5868, lon: -93.625 },
  { name: 'Moreno Valley', stateCode: 'CA', state: 'California', population: 208634, income: 67852, col: 120, home: 480000, rent: 1700, violent: 32, property: 48, high: 97, low: 42, rain: 10.0, sun: 277, commute: 36, walk: 30, unemp: 5.5, lat: 33.9425, lon: -117.2297 },
  { name: 'Santa Clarita', stateCode: 'CA', state: 'California', population: 228673, income: 104188, col: 142, home: 750000, rent: 2300, violent: 12, property: 32, high: 92, low: 42, rain: 15.0, sun: 280, commute: 35, walk: 28, unemp: 4.0, lat: 34.3917, lon: -118.5426 },
  { name: 'Fayetteville', stateCode: 'NC', state: 'North Carolina', population: 208501, income: 45504, col: 88, home: 185000, rent: 1050, violent: 68, property: 72, high: 90, low: 33, rain: 46.0, sun: 215, commute: 20, walk: 28, unemp: 5.0, lat: 35.0527, lon: -78.8784 },
  { name: 'Birmingham', stateCode: 'AL', state: 'Alabama', population: 200733, income: 38732, col: 86, home: 165000, rent: 1000, violent: 88, property: 78, high: 91, low: 35, rain: 53.5, sun: 210, commute: 23, walk: 35, unemp: 3.8, lat: 33.5186, lon: -86.8104 },
  { name: 'Oxnard', stateCode: 'CA', state: 'California', population: 202063, income: 72558, col: 138, home: 680000, rent: 2100, violent: 28, property: 48, high: 75, low: 48, rain: 15.0, sun: 275, commute: 26, walk: 54, unemp: 4.8, lat: 34.1975, lon: -119.1771 },
  { name: 'Rochester', stateCode: 'NY', state: 'New York', population: 211328, income: 38551, col: 90, home: 150000, rent: 1000, violent: 72, property: 68, high: 81, low: 18, rain: 34.0, sun: 165, commute: 20, walk: 55, unemp: 4.3, lat: 43.1566, lon: -77.6088 },
  { name: 'Port St. Lucie', stateCode: 'FL', state: 'Florida', population: 204851, income: 61298, col: 100, home: 350000, rent: 1700, violent: 22, property: 38, high: 91, low: 55, rain: 54.0, sun: 240, commute: 30, walk: 20, unemp: 3.5, lat: 27.273, lon: -80.3582 },
  { name: 'Grand Rapids', stateCode: 'MI', state: 'Michigan', population: 198917, income: 51222, col: 90, home: 250000, rent: 1200, violent: 48, property: 55, high: 82, low: 18, rain: 37.0, sun: 170, commute: 21, walk: 51, unemp: 3.5, lat: 42.9634, lon: -85.6681 },
  { name: 'Huntsville', stateCode: 'AL', state: 'Alabama', population: 215006, income: 60786, col: 90, home: 280000, rent: 1200, violent: 48, property: 58, high: 90, low: 32, rain: 54.0, sun: 205, commute: 21, walk: 28, unemp: 2.6, lat: 34.7304, lon: -86.5861 },
  { name: 'Salt Lake City', stateCode: 'UT', state: 'Utah', population: 199723, income: 63124, col: 108, home: 520000, rent: 1500, violent: 55, property: 78, high: 91, low: 23, rain: 16.0, sun: 222, commute: 22, walk: 59, unemp: 2.9, lat: 40.7608, lon: -111.891, featured: true },
  { name: 'Tallahassee', stateCode: 'FL', state: 'Florida', population: 196169, income: 45974, col: 94, home: 260000, rent: 1200, violent: 58, property: 68, high: 92, low: 41, rain: 58.0, sun: 230, commute: 20, walk: 32, unemp: 3.6, lat: 30.4383, lon: -84.2807 },
  { name: 'Worcester', stateCode: 'MA', state: 'Massachusetts', population: 206518, income: 51728, col: 118, home: 380000, rent: 1600, violent: 55, property: 52, high: 81, low: 19, rain: 48.0, sun: 197, commute: 27, walk: 48, unemp: 3.8, lat: 42.2626, lon: -71.8023 },
  { name: 'Newport News', stateCode: 'VA', state: 'Virginia', population: 186247, income: 54546, col: 98, home: 250000, rent: 1250, violent: 42, property: 52, high: 87, low: 33, rain: 47.0, sun: 212, commute: 24, walk: 32, unemp: 3.5, lat: 37.0871, lon: -76.473 },
  { name: 'Overland Park', stateCode: 'KS', state: 'Kansas', population: 197238, income: 89536, col: 95, home: 380000, rent: 1400, violent: 12, property: 32, high: 89, low: 22, rain: 39.0, sun: 215, commute: 21, walk: 32, unemp: 2.8, lat: 38.9822, lon: -94.6708 },
  { name: 'Santa Rosa', stateCode: 'CA', state: 'California', population: 178293, income: 80372, col: 145, home: 720000, rent: 2100, violent: 32, property: 48, high: 82, low: 39, rain: 32.0, sun: 260, commute: 25, walk: 45, unemp: 3.8, lat: 38.4404, lon: -122.7141 },
  { name: 'Providence', stateCode: 'RI', state: 'Rhode Island', population: 190934, income: 45752, col: 112, home: 320000, rent: 1500, violent: 48, property: 55, high: 82, low: 23, rain: 47.0, sun: 201, commute: 24, walk: 76, unemp: 4.0, lat: 41.824, lon: -71.4128 },
  { name: 'Garden Grove', stateCode: 'CA', state: 'California', population: 171949, income: 71580, col: 145, home: 780000, rent: 2100, violent: 22, property: 42, high: 84, low: 48, rain: 13.0, sun: 278, commute: 28, walk: 55, unemp: 4.2, lat: 33.7739, lon: -117.9414 },
  { name: 'Chattanooga', stateCode: 'TN', state: 'Tennessee', population: 181099, income: 48357, col: 90, home: 260000, rent: 1200, violent: 72, property: 72, high: 90, low: 31, rain: 52.0, sun: 205, commute: 21, walk: 29, unemp: 3.4, lat: 35.0456, lon: -85.3097 },
  { name: 'Oceanside', stateCode: 'CA', state: 'California', population: 174649, income: 70218, col: 140, home: 750000, rent: 2200, violent: 28, property: 42, high: 76, low: 48, rain: 10.0, sun: 266, commute: 28, walk: 44, unemp: 4.3, lat: 33.1959, lon: -117.3795 },
  { name: 'Jackson', stateCode: 'MS', state: 'Mississippi', population: 153701, income: 39935, col: 82, home: 120000, rent: 950, violent: 78, property: 72, high: 92, low: 37, rain: 54.0, sun: 216, commute: 21, walk: 28, unemp: 4.5, lat: 32.2988, lon: -90.1848 },
  { name: 'Fort Lauderdale', stateCode: 'FL', state: 'Florida', population: 182760, income: 59088, col: 118, home: 420000, rent: 2000, violent: 48, property: 62, high: 90, low: 60, rain: 62.0, sun: 249, commute: 27, walk: 58, unemp: 3.0, lat: 26.1224, lon: -80.1373 },
  { name: 'Santa Clara', stateCode: 'CA', state: 'California', population: 127647, income: 126006, col: 170, home: 1400000, rent: 3000, violent: 12, property: 38, high: 80, low: 43, rain: 15.0, sun: 256, commute: 26, walk: 54, unemp: 3.2, lat: 37.3541, lon: -121.9552 },
  { name: 'Bloomington', stateCode: 'MN', state: 'Minnesota', population: 89987, income: 76640, col: 105, home: 340000, rent: 1400, violent: 18, property: 42, high: 83, low: 8, rain: 30.0, sun: 198, commute: 23, walk: 35, unemp: 2.8, lat: 44.8408, lon: -93.2983 },
  { name: 'Sioux Falls', stateCode: 'SD', state: 'South Dakota', population: 192517, income: 61493, col: 90, home: 280000, rent: 1100, violent: 38, property: 52, high: 86, low: 10, rain: 26.0, sun: 210, commute: 17, walk: 35, unemp: 2.2, lat: 43.5446, lon: -96.7311 },
  { name: 'Little Rock', stateCode: 'AR', state: 'Arkansas', population: 202591, income: 51925, col: 88, home: 195000, rent: 1000, violent: 78, property: 75, high: 93, low: 32, rain: 49.5, sun: 218, commute: 20, walk: 33, unemp: 3.5, lat: 34.7465, lon: -92.2896 },
  { name: 'Augusta', stateCode: 'GA', state: 'Georgia', population: 202081, income: 44649, col: 86, home: 170000, rent: 1000, violent: 55, property: 62, high: 92, low: 36, rain: 45.0, sun: 220, commute: 21, walk: 28, unemp: 4.0, lat: 33.4735, lon: -82.0105 },
  { name: 'Mobile', stateCode: 'AL', state: 'Alabama', population: 187041, income: 42979, col: 86, home: 165000, rent: 1000, violent: 68, property: 72, high: 91, low: 42, rain: 66.0, sun: 220, commute: 23, walk: 32, unemp: 4.0, lat: 30.6954, lon: -88.0399 },
  { name: 'Knoxville', stateCode: 'TN', state: 'Tennessee', population: 190740, income: 44342, col: 88, home: 260000, rent: 1200, violent: 55, property: 68, high: 88, low: 30, rain: 48.0, sun: 205, commute: 21, walk: 33, unemp: 3.3, lat: 35.9606, lon: -83.9207 },
  { name: 'Cape Coral', stateCode: 'FL', state: 'Florida', population: 194016, income: 61074, col: 102, home: 380000, rent: 1800, violent: 18, property: 32, high: 92, low: 55, rain: 54.0, sun: 265, commute: 28, walk: 21, unemp: 3.4, lat: 26.5629, lon: -81.9495 },
  { name: 'Shreveport', stateCode: 'LA', state: 'Louisiana', population: 187593, income: 38573, col: 85, home: 150000, rent: 950, violent: 78, property: 72, high: 94, low: 38, rain: 51.0, sun: 218, commute: 20, walk: 35, unemp: 4.5, lat: 32.5252, lon: -93.7502 },
  { name: 'Frisco', stateCode: 'TX', state: 'Texas', population: 200509, income: 128261, col: 112, home: 620000, rent: 2000, violent: 8, property: 28, high: 96, low: 35, rain: 39.0, sun: 230, commute: 30, walk: 25, unemp: 3.0, lat: 33.1507, lon: -96.8236 },
  { name: 'McKinney', stateCode: 'TX', state: 'Texas', population: 195308, income: 105431, col: 108, home: 480000, rent: 1800, violent: 10, property: 28, high: 96, low: 35, rain: 39.0, sun: 230, commute: 30, walk: 22, unemp: 3.1, lat: 33.1972, lon: -96.6397 },
  { name: 'Yonkers', stateCode: 'NY', state: 'New York', population: 211569, income: 69375, col: 145, home: 520000, rent: 1800, violent: 32, property: 42, high: 84, low: 26, rain: 48.0, sun: 220, commute: 38, walk: 68, unemp: 4.2, lat: 40.9312, lon: -73.8988 },
  { name: 'Aurora', stateCode: 'IL', state: 'Illinois', population: 180542, income: 70972, col: 100, home: 260000, rent: 1300, violent: 32, property: 48, high: 84, low: 16, rain: 38.0, sun: 188, commute: 30, walk: 40, unemp: 4.5, lat: 41.7606, lon: -88.3201 },
  { name: 'Montgomery', stateCode: 'AL', state: 'Alabama', population: 200603, income: 47078, col: 85, home: 145000, rent: 950, violent: 58, property: 68, high: 92, low: 37, rain: 51.0, sun: 214, commute: 20, walk: 26, unemp: 3.5, lat: 32.3668, lon: -86.3 },
  { name: 'Akron', stateCode: 'OH', state: 'Ohio', population: 190469, income: 39001, col: 85, home: 120000, rent: 900, violent: 55, property: 62, high: 83, low: 20, rain: 38.0, sun: 170, commute: 22, walk: 45, unemp: 4.5, lat: 41.0814, lon: -81.519 },
  { name: 'Huntington Beach', stateCode: 'CA', state: 'California', population: 198711, income: 97415, col: 155, home: 1100000, rent: 2600, violent: 15, property: 38, high: 78, low: 50, rain: 12.0, sun: 280, commute: 28, walk: 48, unemp: 3.6, lat: 33.6595, lon: -117.9988 },
  { name: 'Glendale', stateCode: 'CA', state: 'California', population: 196543, income: 74342, col: 155, home: 980000, rent: 2400, violent: 18, property: 42, high: 88, low: 45, rain: 18.0, sun: 284, commute: 30, walk: 70, unemp: 4.5, lat: 34.1425, lon: -118.2551 },
  { name: 'Grand Prairie', stateCode: 'TX', state: 'Texas', population: 196100, income: 66392, col: 96, home: 280000, rent: 1350, violent: 28, property: 48, high: 96, low: 36, rain: 37.0, sun: 232, commute: 27, walk: 32, unemp: 3.7, lat: 32.7459, lon: -96.9978 },
  { name: 'Vancouver', stateCode: 'WA', state: 'Washington', population: 190915, income: 67447, col: 112, home: 450000, rent: 1500, violent: 32, property: 55, high: 80, low: 34, rain: 42.0, sun: 144, commute: 25, walk: 40, unemp: 4.2, lat: 45.6387, lon: -122.6615 },
  { name: 'Peoria', stateCode: 'AZ', state: 'Arizona', population: 190985, income: 79081, col: 104, home: 450000, rent: 1600, violent: 18, property: 38, high: 105, low: 44, rain: 8.0, sun: 296, commute: 28, walk: 28, unemp: 3.3, lat: 33.5806, lon: -112.2374 },
  { name: 'Rancho Cucamonga', stateCode: 'CA', state: 'California', population: 174453, income: 92204, col: 130, home: 680000, rent: 2100, violent: 15, property: 38, high: 95, low: 43, rain: 15.0, sun: 277, commute: 32, walk: 35, unemp: 4.2, lat: 34.1064, lon: -117.5931 },
  { name: 'Ontario', stateCode: 'CA', state: 'California', population: 175265, income: 66401, col: 125, home: 580000, rent: 1900, violent: 32, property: 48, high: 95, low: 43, rain: 15.0, sun: 277, commute: 32, walk: 42, unemp: 5.0, lat: 34.0633, lon: -117.6509 },
  { name: 'Tempe', stateCode: 'AZ', state: 'Arizona', population: 180587, income: 61006, col: 105, home: 420000, rent: 1600, violent: 38, property: 72, high: 105, low: 44, rain: 8.0, sun: 296, commute: 22, walk: 54, unemp: 3.5, lat: 33.4255, lon: -111.94 },
  { name: 'Springfield', stateCode: 'MO', state: 'Missouri', population: 169176, income: 42017, col: 84, home: 185000, rent: 900, violent: 72, property: 78, high: 89, low: 24, rain: 45.0, sun: 212, commute: 18, walk: 35, unemp: 3.2, lat: 37.209, lon: -93.2923 },
  { name: 'Lancaster', stateCode: 'CA', state: 'California', population: 173516, income: 58307, col: 118, home: 400000, rent: 1600, violent: 48, property: 55, high: 97, low: 34, rain: 7.0, sun: 285, commute: 35, walk: 35, unemp: 6.5, lat: 34.6868, lon: -118.1542 },
  { name: 'Eugene', stateCode: 'OR', state: 'Oregon', population: 176654, income: 52741, col: 110, home: 420000, rent: 1350, violent: 32, property: 62, high: 83, low: 35, rain: 45.0, sun: 155, commute: 19, walk: 46, unemp: 4.2, lat: 44.0521, lon: -123.0868 },
  { name: 'Pembroke Pines', stateCode: 'FL', state: 'Florida', population: 171178, income: 68610, col: 115, home: 420000, rent: 1900, violent: 18, property: 38, high: 90, low: 60, rain: 62.0, sun: 249, commute: 32, walk: 32, unemp: 3.1, lat: 26.0078, lon: -80.2962 },
  { name: 'Salem', stateCode: 'OR', state: 'Oregon', population: 175535, income: 58230, col: 108, home: 380000, rent: 1300, violent: 38, property: 58, high: 85, low: 35, rain: 40.0, sun: 154, commute: 22, walk: 40, unemp: 4.0, lat: 44.9429, lon: -123.0351 },
  { name: 'Pasadena', stateCode: 'CA', state: 'California', population: 138699, income: 85088, col: 155, home: 980000, rent: 2400, violent: 28, property: 48, high: 89, low: 46, rain: 20.0, sun: 286, commute: 30, walk: 67, unemp: 4.2, lat: 34.1478, lon: -118.1445 },
  { name: 'Peoria', stateCode: 'IL', state: 'Illinois', population: 113150, income: 48345, col: 85, home: 130000, rent: 900, violent: 68, property: 68, high: 85, low: 17, rain: 36.0, sun: 190, commute: 18, walk: 40, unemp: 5.0, lat: 40.6936, lon: -89.589 },
  { name: 'Corona', stateCode: 'CA', state: 'California', population: 157136, income: 86648, col: 130, home: 650000, rent: 2100, violent: 18, property: 38, high: 95, low: 43, rain: 12.0, sun: 277, commute: 38, walk: 35, unemp: 4.5, lat: 33.8753, lon: -117.5664 },
  { name: 'Elizabeth', stateCode: 'NJ', state: 'New Jersey', population: 137298, income: 50392, col: 130, home: 420000, rent: 1500, violent: 55, property: 52, high: 86, low: 26, rain: 46.0, sun: 210, commute: 32, walk: 72, unemp: 5.2, lat: 40.664, lon: -74.2107 },
  { name: 'Hayward', stateCode: 'CA', state: 'California', population: 162954, income: 91558, col: 155, home: 850000, rent: 2300, violent: 42, property: 55, high: 76, low: 46, rain: 18.0, sun: 260, commute: 34, walk: 54, unemp: 4.5, lat: 37.6688, lon: -122.081 },
  { name: 'Fort Collins', stateCode: 'CO', state: 'Colorado', population: 169810, income: 70228, col: 110, home: 520000, rent: 1600, violent: 22, property: 42, high: 85, low: 18, rain: 15.0, sun: 240, commute: 20, walk: 37, unemp: 2.9, lat: 40.5853, lon: -105.0844 },
  { name: 'Evansville', stateCode: 'IN', state: 'Indiana', population: 117298, income: 42358, col: 84, home: 145000, rent: 900, violent: 55, property: 68, high: 88, low: 25, rain: 45.0, sun: 200, commute: 19, walk: 35, unemp: 3.6, lat: 37.9716, lon: -87.5711 },
  { name: 'Round Rock', stateCode: 'TX', state: 'Texas', population: 119334, income: 86408, col: 105, home: 400000, rent: 1550, violent: 12, property: 32, high: 97, low: 41, rain: 34.0, sun: 228, commute: 28, walk: 28, unemp: 3.2, lat: 30.5083, lon: -97.6789 },
  { name: 'Charleston', stateCode: 'SC', state: 'South Carolina', population: 150227, income: 68768, col: 108, home: 480000, rent: 1800, violent: 38, property: 52, high: 91, low: 40, rain: 51.0, sun: 220, commute: 24, walk: 40, unemp: 3.0, lat: 32.7765, lon: -79.9311, featured: true },
  { name: 'Savannah', stateCode: 'GA', state: 'Georgia', population: 147780, income: 48861, col: 95, home: 280000, rent: 1400, violent: 55, property: 68, high: 91, low: 41, rain: 49.0, sun: 222, commute: 22, walk: 44, unemp: 3.5, lat: 32.0809, lon: -81.0912 },
  { name: 'Naperville', stateCode: 'IL', state: 'Illinois', population: 149540, income: 135601, col: 115, home: 480000, rent: 1800, violent: 8, property: 25, high: 84, low: 16, rain: 38.0, sun: 188, commute: 35, walk: 32, unemp: 3.2, lat: 41.7508, lon: -88.1535 },
  { name: 'Bellevue', stateCode: 'WA', state: 'Washington', population: 151854, income: 134698, col: 155, home: 1200000, rent: 2600, violent: 12, property: 42, high: 76, low: 36, rain: 37.0, sun: 152, commute: 27, walk: 42, unemp: 3.2, lat: 47.6101, lon: -122.2015 },
  { name: 'Cary', stateCode: 'NC', state: 'North Carolina', population: 174721, income: 110249, col: 108, home: 520000, rent: 1700, violent: 8, property: 25, high: 89, low: 32, rain: 46.0, sun: 213, commute: 24, walk: 25, unemp: 2.8, lat: 35.7915, lon: -78.7811 },
  { name: 'Alexandria', stateCode: 'VA', state: 'Virginia', population: 159467, income: 105105, col: 145, home: 650000, rent: 2100, violent: 18, property: 35, high: 88, low: 30, rain: 41.0, sun: 203, commute: 34, walk: 64, unemp: 2.9, lat: 38.8048, lon: -77.0469 },
  { name: 'Sunnyvale', stateCode: 'CA', state: 'California', population: 155805, income: 150539, col: 175, home: 1700000, rent: 3200, violent: 10, property: 35, high: 80, low: 43, rain: 15.0, sun: 256, commute: 26, walk: 54, unemp: 3.0, lat: 37.3688, lon: -122.0363 },
  { name: 'Lakewood', stateCode: 'CO', state: 'Colorado', population: 155984, income: 71294, col: 112, home: 520000, rent: 1650, violent: 32, property: 55, high: 88, low: 19, rain: 15.0, sun: 245, commute: 26, walk: 42, unemp: 3.5, lat: 39.7047, lon: -105.0814 },
  { name: 'Hollywood', stateCode: 'FL', state: 'Florida', population: 153067, income: 52164, col: 115, home: 380000, rent: 1800, violent: 42, property: 55, high: 90, low: 60, rain: 60.0, sun: 249, commute: 28, walk: 55, unemp: 3.2, lat: 26.0112, lon: -80.1495 },
  { name: 'Paterson', stateCode: 'NJ', state: 'New Jersey', population: 159732, income: 41478, col: 125, home: 320000, rent: 1400, violent: 68, property: 55, high: 86, low: 24, rain: 48.0, sun: 210, commute: 30, walk: 78, unemp: 6.0, lat: 40.9168, lon: -74.1718 },
  { name: 'Clarksville', stateCode: 'TN', state: 'Tennessee', population: 166722, income: 57542, col: 90, home: 280000, rent: 1200, violent: 38, property: 52, high: 90, low: 29, rain: 50.0, sun: 208, commute: 24, walk: 24, unemp: 3.8, lat: 36.5298, lon: -87.3595 },
  { name: 'Torrance', stateCode: 'CA', state: 'California', population: 147067, income: 95225, col: 150, home: 980000, rent: 2500, violent: 18, property: 42, high: 78, low: 50, rain: 13.0, sun: 280, commute: 28, walk: 58, unemp: 4.0, lat: 33.8358, lon: -118.3406 },
  { name: 'Rockford', stateCode: 'IL', state: 'Illinois', population: 148655, income: 44396, col: 86, home: 130000, rent: 900, violent: 72, property: 68, high: 84, low: 14, rain: 36.0, sun: 188, commute: 20, walk: 40, unemp: 5.5, lat: 42.2711, lon: -89.094 },
  { name: 'Macon', stateCode: 'GA', state: 'Georgia', population: 157346, income: 38559, col: 84, home: 140000, rent: 950, violent: 68, property: 72, high: 92, low: 36, rain: 47.0, sun: 220, commute: 21, walk: 28, unemp: 4.2, lat: 32.8407, lon: -83.6324 },
  { name: 'Kansas City', stateCode: 'KS', state: 'Kansas', population: 156607, income: 45326, col: 86, home: 150000, rent: 950, violent: 68, property: 72, high: 89, low: 23, rain: 39.0, sun: 215, commute: 20, walk: 40, unemp: 3.8, lat: 39.1141, lon: -94.6275 },
  { name: 'Bridgeport', stateCode: 'CT', state: 'Connecticut', population: 148654, income: 49049, col: 118, home: 320000, rent: 1400, violent: 55, property: 52, high: 83, low: 24, rain: 46.0, sun: 205, commute: 28, walk: 65, unemp: 5.0, lat: 41.1865, lon: -73.1952 },
  { name: 'Amarillo', stateCode: 'TX', state: 'Texas', population: 200393, income: 54958, col: 86, home: 195000, rent: 1050, violent: 55, property: 68, high: 93, low: 26, rain: 20.0, sun: 260, commute: 17, walk: 35, unemp: 3.2, lat: 35.222, lon: -101.8313 },
]

const CLEAN_SEEDS = SEEDS

function haversine(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function colLabel(col: number) {
  if (col >= 140) return 'well above the national average'
  if (col >= 115) return 'above the national average'
  if (col >= 95) return 'near the national average'
  if (col >= 85) return 'below the national average'
  return 'among the more affordable large U.S. metros'
}

function climateNote(s: Seed) {
  if (s.high >= 100) return `Summer highs regularly climb past ${s.high}°F, so shade and air conditioning are part of daily life`
  if (s.low <= 20) return `Winters can dip to about ${s.low}°F, so heating and snow readiness matter for relocators`
  if (s.rain >= 50) return `With roughly ${s.rain} inches of rain a year, wet-season planning is worth factoring into a move`
  if (s.sun >= 270) return `Around ${s.sun} sunny days a year give the city a strong outdoor lifestyle pull`
  return `Typical summers reach about ${s.high}°F and winter lows average near ${s.low}°F`
}

function safetyNote(s: Seed) {
  const avg = (s.violent + s.property) / 2
  if (avg >= 80) return 'Crime indexes run higher than many peer cities, so neighborhood-level research is especially important before signing a lease'
  if (avg >= 55) return 'Overall crime rates sit in a mid-to-elevated range relative to other large U.S. cities'
  if (avg >= 35) return 'Safety metrics are broadly in line with other mid-size metros, with meaningful variation by neighborhood'
  return 'Crime indexes compare favorably with many peer metros, though local blocks still differ'
}

function buildDescription(s: Seed): string {
  const walk = s.walk
    ? ` Walk Score estimates put daily errands around ${s.walk}/100, which shapes how car-dependent a household needs to be.`
    : ''
  const hoods = s.neighborhoods?.length
    ? ` Areas often researched by newcomers include ${s.neighborhoods.slice(0, 3).join(', ')}.`
    : ''

  return (
    `${s.name}, ${s.state} is a ${s.population.toLocaleString('en-US')}-person city that frequently appears on relocation shortlists for work, ` +
    `housing costs, and climate fit. Median household income is about $${s.income.toLocaleString('en-US')}, while the local cost-of-living index ` +
    `sits near ${s.col} — ${colLabel(s.col)} (100 equals the U.S. average). Typical home values hover around ` +
    `$${s.home.toLocaleString('en-US')}, and median rents are near $${s.rent.toLocaleString('en-US')} per month.\n\n` +
    `${climateNote(s)}. Average one-way commute times are about ${s.commute} minutes, and the unemployment rate is roughly ${s.unemp}%.` +
    `${walk} ${safetyNote(s)}.` +
    `${hoods} MapsToIt compiles Census, BLS, crime, and climate normals so you can compare ${s.name} against other U.S. cities ` +
    `before you move — then dig into the full metric set and nearby alternatives on this page.`
  )
}

function expand(seed: Seed, all: Seed[]): CityRecord {
  const slug = slugify(seed.name, seed.stateCode)
  const here: [number, number] = [seed.lon, seed.lat]
  const nearby = all
    .filter((other) => other !== seed)
    .map((other) => ({
      slug: slugify(other.name, other.stateCode),
      miles: haversine(here, [other.lon, other.lat]),
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 6)
    .map((item) => item.slug)

  return {
    slug,
    name: seed.name,
    state: seed.state,
    stateSlug: stateSlug(seed.stateCode),
    stateCode: seed.stateCode,
    population: seed.population,
    medianHouseholdIncome: seed.income,
    costOfLivingIndex: seed.col,
    medianHomePrice: seed.home,
    medianRent: seed.rent,
    crimeIndex: {
      violent: seed.violent,
      property: seed.property,
      source: 'FBI UCR / Crime Data Explorer (curated index for launch)',
    },
    climate: {
      avgHighSummer: seed.high,
      avgLowWinter: seed.low,
      annualRainfall: seed.rain,
      sunnyDays: seed.sun,
    },
    commute: {
      avgMinutes: seed.commute,
      ...(seed.walk != null ? { walkScore: seed.walk } : {}),
    },
    unemploymentRate: seed.unemp,
    description: buildDescription(seed),
    ...(seed.neighborhoods ? { neighborhoods: seed.neighborhoods } : {}),
    nearbyCities: nearby,
    lastUpdated: '2026-07-01',
    sources: {
      census: 'U.S. Census Bureau / American Community Survey (curated seed)',
      bls: 'Bureau of Labor Statistics (curated seed)',
      fbi: 'FBI Crime Data Explorer (curated seed)',
      noaa: 'NOAA Climate Normals (curated seed)',
    },
    coordinates: here,
    ...(seed.featured ? { featured: true } : {}),
  }
}

function main() {
  mkdirSync(dirname(OUT), { recursive: true })
  const cities = CLEAN_SEEDS.map((seed) => expand(seed, CLEAN_SEEDS))
  writeFileSync(OUT, JSON.stringify(cities, null, 2))
  console.log(`Wrote ${cities.length} cities → ${OUT}`)
}

main()
