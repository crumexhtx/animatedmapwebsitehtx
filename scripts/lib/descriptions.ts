import type { CityRecord } from '../../lib/types'

const REGION_NOTES: Record<string, string> = {
  AL: 'Gulf Coast humidity and inland pine hills shape day-to-day living here.',
  AK: 'Long summer daylight and long winter nights are part of the relocation calculus.',
  AZ: 'Desert heat and monsoon bursts define the outdoor calendar.',
  AR: 'Ozark foothills and river bottoms give the state a quieter, lower-cost profile.',
  CA: 'Pacific weather, wildfire seasons, and housing scarcity dominate relocation tradeoffs.',
  CO: 'High plains sun and Front Range mountain access pull outdoor-oriented movers.',
  CT: 'Coastal New England seasons and Northeast corridor job links frame the market.',
  DE: 'A compact Mid-Atlantic footprint keeps beach, city, and suburbs unusually close.',
  FL: 'Subtropical summers, hurricane planning, and no state income tax loom large.',
  GA: 'Piedmont heat and a sprawling logistics/job belt shape commute realities.',
  HI: 'Island logistics, trade winds, and high shipping costs show up in everyday prices.',
  ID: 'High-desert basins and rapid in-migration have remade many local housing markets.',
  IL: 'Great Lakes winters and a dense rail/road grid define regional mobility.',
  IN: 'Midwest industrial corridors and flat farmland still set the cost baseline.',
  IA: 'Prairie winters and a strong agribusiness employment base anchor the economy.',
  KS: 'Wide-open plains weather — wind, heat, and tornado season — is a planning factor.',
  KY: 'Ohio River valleys and rolling horse-country hills create distinct micro-markets.',
  LA: 'Gulf moisture, festival culture, and floodplain risk are everyday considerations.',
  ME: 'Cold Atlantic winters and a tourism-heavy coast shape seasonal employment.',
  MD: 'Chesapeake shoreline living sits between federal-job gravity and beach weekends.',
  MA: 'Four sharp seasons and a dense education/biotech corridor drive demand.',
  MI: 'Lake-effect snow and automotive supply chains still color the local economy.',
  MN: 'Harsh winters and a strong medical/tech employment base define Twin Cities life.',
  MS: 'Hot, humid summers and lower housing costs are the headline tradeoff.',
  MO: 'Continental seasons and a central U.S. logistics position shape daily life.',
  MT: 'Big-sky winters and long distances between services matter for relocators.',
  NE: 'Plains weather extremes and a steady agribusiness economy set expectations.',
  NV: 'Arid basins, gaming/tourism cycles, and fast suburban growth dominate.',
  NH: 'Short summers and tax structure quirks pull many New England movers.',
  NJ: 'Dense suburbs, port logistics, and quick Manhattan access define many towns.',
  NM: 'High-desert light, monsoon storms, and Hispanic cultural roots are unmistakable.',
  NY: 'Snow-belt Upstate and transit-heavy downstate markets feel like different worlds.',
  NC: 'Piedmont research corridors and coastal storm exposure both matter.',
  ND: 'Long winters and energy-cycle employment swings are hard to ignore.',
  OH: 'Great Lakes industry towns and Midwestern seasons still set the tone.',
  OK: 'Tornado alley weather and a diversified energy economy shape planning.',
  OR: 'Wet winters west of the Cascades and dry east-side climates split the state.',
  PA: 'Appalachian ridges and legacy industrial river towns create varied housing stock.',
  RI: 'A tiny coastal state where beach towns and Providence jobs sit close together.',
  SC: 'Lowcountry humidity and inland Piedmont growth corridors both pull movers.',
  SD: 'Wide plains, cold winters, and relatively open housing markets define the pitch.',
  TN: 'Music/tourism hubs and auto manufacturing corridors sit under humid summers.',
  TX: 'Hot summers, sprawling freeways, and no state income tax dominate comparisons.',
  UT: 'Wasatch Front powder days and rapid suburban expansion are the draw.',
  VT: 'Green Mountain winters and small-city scale attract a specific relocator.',
  VA: 'Federal-contractor suburbs and Atlantic coastal towns pull different budgets.',
  WA: 'Gray winters west of the Cascades and dry inland basins split lifestyles.',
  WV: 'Appalachian terrain and lower housing costs define many relocation pitches.',
  WI: 'Lake-effect cold and dairy/manufacturing employment still shape daily life.',
  WY: 'High, dry basins and energy employment cycles set the local tempo.',
  DC: 'Federal employment gravity and dense walkable neighborhoods define the District.',
}

function hashSlug(slug: string) {
  let h = 0
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return h
}

function pick<T>(items: T[], slug: string, salt: number) {
  return items[(hashSlug(slug) + salt) % items.length]
}

function colLabel(col: number) {
  if (col >= 140) return 'well above the national housing-cost baseline'
  if (col >= 115) return 'above the national housing-cost baseline'
  if (col >= 95) return 'close to the national housing-cost baseline'
  if (col >= 85) return 'below the national housing-cost baseline'
  return 'among the more affordable large markets in this catalog on housing costs'
}

function housingAngle(city: CityRecord) {
  const rentShare = (city.medianRent * 12) / Math.max(city.medianHouseholdIncome, 1)
  const variants = [
    `Ownership is a high bar — typical values near $${city.medianHomePrice.toLocaleString('en-US')} push many newcomers toward renting first.`,
    `Budget for median rents around $${city.medianRent.toLocaleString('en-US')} a month before you lock a neighborhood.`,
    `A typical home near $${city.medianHomePrice.toLocaleString('en-US')} and rents around $${city.medianRent.toLocaleString('en-US')} frame most shortlists.`,
    `Entry home prices around $${city.medianHomePrice.toLocaleString('en-US')} still look attainable compared with coastal metros.`,
  ]
  if (city.medianHomePrice >= 800000) return variants[0]
  if (rentShare >= 0.35) return variants[1]
  if (city.medianHomePrice <= 220000) return variants[3]
  return pick(variants, city.slug, 3)
}

function climateAngle(city: CityRecord) {
  if (city.climate.avgHighSummer >= 100) {
    return `Summer highs near ${city.climate.avgHighSummer}°F make shade, pools, and strong A/C practical necessities.`
  }
  if (city.climate.avgLowWinter <= 20) {
    return `Winter lows around ${city.climate.avgLowWinter}°F mean heating costs and snow logistics belong on the checklist.`
  }
  if (city.climate.annualRainfall >= 50) {
    return `With about ${city.climate.annualRainfall} inches of rain a year, wet-season drainage and mold checks are worth asking about.`
  }
  if (city.climate.sunnyDays >= 270) {
    return `Roughly ${city.climate.sunnyDays} sunny days a year give outdoor routines unusual calendar reliability.`
  }
  return pick(
    [
      `Expect summer highs near ${city.climate.avgHighSummer}°F and winter lows around ${city.climate.avgLowWinter}°F.`,
      `The normals show about ${city.climate.annualRainfall} inches of rain and ${city.climate.sunnyDays} sunny days across a typical year.`,
      `Pack for ${city.climate.avgHighSummer}°F summer peaks; winter mornings often settle near ${city.climate.avgLowWinter}°F.`,
    ],
    city.slug,
    5,
  )
}

function safetyAngle(city: CityRecord) {
  if (city.crimeIndex.source === 'data unavailable') {
    return pick(
      [
        `Official FBI agency crime rates were not published for this place in the latest pull, so treat safety as a neighborhood-level research task.`,
        `FBI Crime Data Explorer did not return usable agency rates here — verify recent local PD reports block by block.`,
        `Crime rates are marked unavailable for this municipality in our FBI CDE pull; do not rely on a citywide index.`,
      ],
      city.slug,
      7,
    )
  }
  const violent = city.crimeIndex.violent
  if (violent >= 800) {
    return `FBI CDE violent-offense rates run comparatively high (~${violent} per 100k annualized), so block-by-block due diligence is especially important.`
  }
  if (violent >= 400) {
    return `Violent-offense rates near ${violent} per 100k sit in a mid-to-elevated band versus many peer cities in this catalog.`
  }
  if (violent >= 200) {
    return `Violent-offense rates around ${violent} per 100k are moderate for a large U.S. city, with meaningful variation by neighborhood.`
  }
  return `Violent-offense rates near ${violent} per 100k compare favorably with many peer metros, though local blocks still differ.`
}

function placeHook(city: CityRecord) {
  const hoods = city.neighborhoods ?? []
  if (hoods.length >= 3) {
    return pick(
      [
        `Newcomers often start housing searches in ${hoods[0]} and ${hoods[1]}, then compare against ${hoods[2]} once a commute target is clear.`,
        `${hoods[0]} draws the first wave of relocators; ${hoods[1]} and ${hoods[2]} tend to show up once people trade vibe for school or parking tradeoffs.`,
        `Ask locals about ${hoods[0]} versus ${hoods[1]} — those two pockets illustrate how different daily life can feel inside the same city limits, with ${hoods[2]} as a common third option.`,
        `If you only tour one corridor, make it ${hoods[0]}; if you have a weekend, contrast it with ${hoods[1]} and the quieter edges near ${hoods[2]}.`,
      ],
      city.slug,
      11,
    )
  }
  if (hoods.length === 2) {
    return `Newcomers often start around ${hoods[0]} before widening toward ${hoods[1]} once they know their commute.`
  }
  if (hoods.length === 1) {
    return `${hoods[0]} is the pocket most relocators hear about first — verify it at rush hour before signing.`
  }
  if (city.population >= 1000000) {
    return `${city.name} functions as a true metro core — job density is high, but so is competition for well-located rentals.`
  }
  if (city.population >= 400000) {
    return `${city.name} sits in that mid-to-large city band where urban and quieter residential pockets often share one municipal boundary.`
  }
  return `${city.name} is compact enough that a single wrong neighborhood choice is easy to feel day to day — visit at commute hour before signing.`
}

function workAngle(city: CityRecord) {
  if (city.unemploymentRate <= 3) {
    return `A recent county unemployment reading near ${city.unemploymentRate.toFixed(1)}% suggests a relatively tight local labor market.`
  }
  if (city.unemploymentRate >= 5.5) {
    return `Unemployment near ${city.unemploymentRate.toFixed(1)}% is elevated versus many peer cities, so industry mix matters more in a move decision.`
  }
  return pick(
    [
      `Unemployment recently ran near ${city.unemploymentRate.toFixed(1)}%, broadly in line with many large U.S. counties.`,
      `BLS LAUS puts recent unemployment around ${city.unemploymentRate.toFixed(1)}% for the surrounding county.`,
      `Labor-market readings near ${city.unemploymentRate.toFixed(1)}% unemployment are neither boom nor bust by national standards.`,
    ],
    city.slug,
    13,
  )
}

function opener(city: CityRecord) {
  return pick(
    [
      `${city.name}, ${city.state} counts about ${city.population.toLocaleString('en-US')} residents inside the city limits.`,
      `About ${city.population.toLocaleString('en-US')} people live in ${city.name}, ${city.stateCode}.`,
      `${city.name} (pop. ${city.population.toLocaleString('en-US')}) sits in ${city.state}.`,
      `Relocators eyeing ${city.name}, ${city.state} will find roughly ${city.population.toLocaleString('en-US')} residents within city limits.`,
    ],
    city.slug,
    17,
  )
}

function incomeLine(city: CityRecord) {
  return pick(
    [
      `Median household income is roughly $${city.medianHouseholdIncome.toLocaleString('en-US')}, while the ACS housing-cost index sits near ${city.costOfLivingIndex} — ${colLabel(city.costOfLivingIndex)} (100 ≈ U.S. average).`,
      `Households here report a median income near $${city.medianHouseholdIncome.toLocaleString('en-US')}; our housing-derived cost index is about ${city.costOfLivingIndex} (${colLabel(city.costOfLivingIndex)}).`,
      `With median income around $${city.medianHouseholdIncome.toLocaleString('en-US')} and a cost index of ${city.costOfLivingIndex}, the market reads ${colLabel(city.costOfLivingIndex)}.`,
    ],
    city.slug,
    19,
  )
}

function commuteLine(city: CityRecord) {
  const walk =
    city.commute.walkScore != null
      ? pick(
          [
            `, and Walk Score estimates land around ${city.commute.walkScore}/100`,
            `; Walk Score is about ${city.commute.walkScore}`,
            `, with walkability near ${city.commute.walkScore}/100`,
          ],
          city.slug,
          23,
        )
      : ''
  return pick(
    [
      `Average one-way commute time is about ${city.commute.avgMinutes} minutes${walk}.`,
      `Plan on roughly ${city.commute.avgMinutes} minutes each way for a typical commute${walk}.`,
      `Commutes average near ${city.commute.avgMinutes} minutes one-way${walk}.`,
    ],
    city.slug,
    29,
  )
}

export function buildUniqueDescription(city: CityRecord) {
  const region =
    REGION_NOTES[city.stateCode] ??
    'Regional climate and job mix shape how the numbers feel on the ground.'

  const blocks = [
    `${opener(city)} ${incomeLine(city)} ${housingAngle(city)}`,
    `${region} ${climateAngle(city)} ${commuteLine(city)} ${workAngle(city)} ${safetyAngle(city)}`,
    `${placeHook(city)} Figures on this page are merged from Census ACS, BLS LAUS, FBI Crime Data Explorer, and NOAA Climate Normals — use them to compare ${city.name} with nearby alternatives before you relocate.`,
  ]

  // Rotate paragraph order slightly so unrelated cities share fewer leading shingles.
  const rotation = hashSlug(city.slug) % 3
  if (rotation === 1) return [blocks[1], blocks[0], blocks[2]].join('\n\n')
  if (rotation === 2) return [blocks[0], blocks[2], blocks[1]].join('\n\n')
  return blocks.join('\n\n')
}
