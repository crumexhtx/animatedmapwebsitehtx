import type { CityRecord, NationalBaselines, StateRecord } from '@/lib/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

export type SnapshotMetric = {
  label: string
  value: string
  note?: string
}

function hashSlug(slug: string) {
  let h = 0
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return h
}

function pick<T>(items: T[], slug: string, salt = 0) {
  return items[(hashSlug(slug) + salt) % items.length]
}

function colPhrase(index: number) {
  if (index >= 140) return 'well above the U.S. housing-cost baseline'
  if (index >= 115) return 'above the U.S. housing-cost baseline'
  if (index >= 95) return 'near the U.S. housing-cost baseline'
  if (index >= 85) return 'below the U.S. housing-cost baseline'
  return 'among the more affordable large markets in this catalog'
}

/** 40–80 word direct answer for “Should I move to / how expensive is {city}?” */
export function buildCityDirectAnswer(city: CityRecord, national: NationalBaselines) {
  const crimeBit =
    city.crimeIndex.source === 'data unavailable'
      ? 'Official citywide FBI crime rates are currently unavailable, so treat safety as a neighborhood-level check.'
      : `Violent-offense rates run about ${city.crimeIndex.violent} per 100k (catalog avg ${national.crimeViolent}).`

  const variants = [
    `${city.name}, ${city.stateCode} has a MapsToIt housing cost index of ${city.costOfLivingIndex} (${colPhrase(city.costOfLivingIndex)}; 100 = U.S. avg). ` +
      `Median home value is about ${formatCurrency(city.medianHomePrice)} and median rent about ${formatCurrency(city.medianRent)}, ` +
      `against national ACS medians of ${formatCurrency(national.medianHomeValue)} and ${formatCurrency(national.medianRent)}. ` +
      `Median household income is roughly ${formatCurrency(city.medianHouseholdIncome)}. ` +
      `Typical commute is ${city.commute.avgMinutes} minutes; summer highs average ${city.climate.avgHighSummer}°F. ${crimeBit}`,

    `For relocators asking how much ${city.name} costs: the housing index sits at ${city.costOfLivingIndex} versus 100 nationally, ` +
      `with homes near ${formatCurrency(city.medianHomePrice)} and rents near ${formatCurrency(city.medianRent)}. ` +
      `Local median income is about ${formatCurrency(city.medianHouseholdIncome)} and unemployment recently ran ${formatPercent(city.unemploymentRate)} ` +
      `(U.S. ${formatPercent(national.unemploymentRate)}). Commutes average ${city.commute.avgMinutes} minutes. ${crimeBit}`,

    `${city.name} planning snapshot: population ${formatNumber(city.population)}, housing index ${city.costOfLivingIndex} (${colPhrase(city.costOfLivingIndex)}), ` +
      `median home ${formatCurrency(city.medianHomePrice)}, median rent ${formatCurrency(city.medianRent)}, ` +
      `and income near ${formatCurrency(city.medianHouseholdIncome)}. ` +
      `Expect ${city.climate.avgHighSummer}°F summer highs, ${city.climate.avgLowWinter}°F winter lows, and about ${city.commute.avgMinutes}-minute one-way commutes. ${crimeBit}`,
  ]

  return pick(variants, city.slug, 1)
}

export function buildCitySnapshotMetrics(city: CityRecord, national: NationalBaselines): SnapshotMetric[] {
  const crimeUnavailable = city.crimeIndex.source === 'data unavailable'
  return [
    {
      label: 'Housing cost index',
      value: String(city.costOfLivingIndex),
      note: `U.S. avg ${national.costOfLivingIndex}`,
    },
    {
      label: 'Median home value',
      value: formatCurrency(city.medianHomePrice),
      note: `U.S. ${formatCurrency(national.medianHomeValue)}`,
    },
    {
      label: 'Median rent',
      value: formatCurrency(city.medianRent),
      note: `U.S. ${formatCurrency(national.medianRent)}`,
    },
    {
      label: 'Median income',
      value: formatCurrency(city.medianHouseholdIncome),
      note: `U.S. ${formatCurrency(national.medianHouseholdIncome)}`,
    },
    {
      label: 'Unemployment',
      value: formatPercent(city.unemploymentRate),
      note: `U.S. ${formatPercent(national.unemploymentRate)}`,
    },
    {
      label: 'Avg commute',
      value: `${city.commute.avgMinutes} min`,
      note: `Catalog avg ${national.commuteMinutes} min`,
    },
    {
      label: 'Violent crime',
      value: crimeUnavailable ? 'Unavailable' : `${city.crimeIndex.violent}`,
      note: crimeUnavailable ? 'FBI gap' : `per 100k · avg ${national.crimeViolent}`,
    },
    {
      label: 'Summer high',
      value: `${city.climate.avgHighSummer}°F`,
      note: `Catalog avg ${national.avgHighSummer}°F`,
    },
  ]
}

export function buildStateDirectAnswer(state: StateRecord) {
  const variants = [
    `${state.name} currently has ${state.cityCount} full MapsToIt city profiles covering about ${formatNumber(state.population)} residents in the published set. ` +
      `Across those cities, average median household income is roughly ${formatCurrency(state.medianHouseholdIncome)} and the blended housing cost index is near ${state.costOfLivingIndex} (100 = U.S. average). ` +
      `Use the city list below to compare housing, commute, climate, and safety before you relocate.`,

    `Relocators comparing ${state.name} cities will find ${state.cityCount} mapped profiles here (~${formatNumber(state.population)} combined residents). ` +
      `Catalog-average income sits near ${formatCurrency(state.medianHouseholdIncome)} with a housing index around ${state.costOfLivingIndex}. ` +
      `Open any city page for proprietary rent, home-value, unemployment, and climate figures versus U.S. baselines.`,
  ]
  return pick(variants, state.slug, 2)
}

export function buildStateSnapshotMetrics(state: StateRecord): SnapshotMetric[] {
  return [
    { label: 'Cities mapped', value: String(state.cityCount) },
    { label: 'Combined population', value: formatNumber(state.population) },
    { label: 'Avg median income', value: formatCurrency(state.medianHouseholdIncome) },
    { label: 'Avg housing index', value: String(state.costOfLivingIndex), note: '100 = U.S. avg' },
  ]
}

export type AnswerSection = {
  heading: string
  answer: string
  bullets?: string[]
}

/** Question-style H2 sections with varied answer-first copy for relocator queries. */
export function buildCityAnswerSections(city: CityRecord, national: NationalBaselines): AnswerSection[] {
  const colDelta = city.costOfLivingIndex - national.costOfLivingIndex
  const expensiveAnswer = pick(
    [
      `${city.name}'s housing cost index is ${city.costOfLivingIndex} versus ${national.costOfLivingIndex} nationally — ${colPhrase(city.costOfLivingIndex)}. ` +
        `That gap is driven mainly by ACS median home values (${formatCurrency(city.medianHomePrice)} vs ${formatCurrency(national.medianHomeValue)}) and rents (${formatCurrency(city.medianRent)} vs ${formatCurrency(national.medianRent)}).`,
      `Compared with the U.S. average, ${city.name} runs ${Math.abs(colDelta)} points ${colDelta >= 0 ? 'higher' : 'lower'} on MapsToIt's ACS housing index. ` +
        `Use that single number as a quick filter, then dig into home and rent cells for the budget you actually need.`,
    ],
    city.slug,
    3,
  )

  const housingAnswer = pick(
    [
      `Typical ownership costs center near ${formatCurrency(city.medianHomePrice)}, while median gross rent is about ${formatCurrency(city.medianRent)} a month. ` +
        `Against a median household income of ${formatCurrency(city.medianHouseholdIncome)}, rent alone is roughly ${((city.medianRent * 12) / Math.max(city.medianHouseholdIncome, 1) * 100).toFixed(0)}% of income on an annualized basis.`,
      `Budget first around ${formatCurrency(city.medianRent)}/month rent or ${formatCurrency(city.medianHomePrice)} purchase prices — both are MapsToIt ACS medians, not listing ask averages. ` +
        `National ACS medians are ${formatCurrency(national.medianRent)} rent and ${formatCurrency(national.medianHomeValue)} home value for context.`,
    ],
    city.slug,
    5,
  )

  const jobsAnswer = pick(
    [
      `County unemployment recently ran ${formatPercent(city.unemploymentRate)} versus a U.S. rate of ${formatPercent(national.unemploymentRate)}. ` +
        `Median household income in ${city.name} is about ${formatCurrency(city.medianHouseholdIncome)} (U.S. ${formatCurrency(national.medianHouseholdIncome)}).`,
      `Labor-market context for ${city.name}: unemployment ${formatPercent(city.unemploymentRate)} and median income ${formatCurrency(city.medianHouseholdIncome)}. ` +
        `Those are BLS LAUS (county) and ACS figures — industry mix still matters more than the headline rate alone.`,
    ],
    city.slug,
    7,
  )

  const commuteAnswer = pick(
    [
      `Average one-way commute time is about ${city.commute.avgMinutes} minutes` +
        `${city.commute.walkScore != null ? `, with Walk Score near ${city.commute.walkScore}/100` : ''}. ` +
        `The catalog-city average commute is ${national.commuteMinutes} minutes.`,
      `Plan on roughly ${city.commute.avgMinutes} minutes each way in ${city.name}. ` +
        `${city.commute.walkScore != null ? `Walk Score estimates around ${city.commute.walkScore} shape how car-dependent daily errands feel. ` : ''}` +
        `Compare that with the ${national.commuteMinutes}-minute catalog average before you lock a neighborhood.`,
    ],
    city.slug,
    11,
  )

  const safetyAnswer =
    city.crimeIndex.source === 'data unavailable'
      ? pick(
          [
            `MapsToIt could not publish a usable FBI agency crime rate for ${city.name} in the latest pull. Treat safety as a block-by-block research task and check local PD reports.`,
            `Citywide FBI rates are marked unavailable here — do not infer safety from a placeholder index. Neighborhood due diligence is required.`,
          ],
          city.slug,
          13,
        )
      : pick(
          [
            `Published violent-offense rates are about ${city.crimeIndex.violent} per 100k and property about ${city.crimeIndex.property} per 100k, ` +
              `versus catalog averages of ${national.crimeViolent} and ${national.crimeProperty}. Citywide rates hide large neighborhood differences.`,
            `${city.name}'s FBI-derived violent rate (~${city.crimeIndex.violent}/100k) sits ${city.crimeIndex.violent >= national.crimeViolent ? 'at or above' : 'below'} the average of mapped MapsToIt cities. ` +
              `Use the figure as a screening signal, then verify the blocks you would actually live on.`,
          ],
          city.slug,
          13,
        )

  const climateAnswer = pick(
    [
      `Normals show summer highs near ${city.climate.avgHighSummer}°F, winter lows near ${city.climate.avgLowWinter}°F, ` +
        `about ${city.climate.annualRainfall} inches of rain, and roughly ${city.climate.sunnyDays} sunny days a year.`,
      `${city.name}'s climate profile: ${city.climate.avgHighSummer}°F summer peaks, ${city.climate.avgLowWinter}°F winter mornings, ` +
        `${city.climate.annualRainfall}" annual rainfall, and ${city.climate.sunnyDays} sunny days — from the nearest NOAA normals station.`,
    ],
    city.slug,
    17,
  )

  const sections: AnswerSection[] = [
    {
      heading: `Is ${city.name} expensive compared to the U.S. average?`,
      answer: expensiveAnswer,
      bullets: [
        `Housing cost index ${city.costOfLivingIndex} (U.S. ${national.costOfLivingIndex})`,
        `Median home ${formatCurrency(city.medianHomePrice)} vs U.S. ${formatCurrency(national.medianHomeValue)}`,
        `Median rent ${formatCurrency(city.medianRent)} vs U.S. ${formatCurrency(national.medianRent)}`,
      ],
    },
    {
      heading: `How much does housing cost in ${city.name}?`,
      answer: housingAnswer,
      bullets: [
        `Median home value ${formatCurrency(city.medianHomePrice)}`,
        `Median rent ${formatCurrency(city.medianRent)}/month`,
        `Median household income ${formatCurrency(city.medianHouseholdIncome)}`,
      ],
    },
    {
      heading: `What is the job market like in ${city.name}?`,
      answer: jobsAnswer,
      bullets: [
        `Unemployment ${formatPercent(city.unemploymentRate)} (U.S. ${formatPercent(national.unemploymentRate)})`,
        `Median income ${formatCurrency(city.medianHouseholdIncome)}`,
      ],
    },
    {
      heading: `How long is the typical commute in ${city.name}?`,
      answer: commuteAnswer,
      bullets: [
        `${city.commute.avgMinutes} minutes average one-way`,
        ...(city.commute.walkScore != null ? [`Walk Score ${city.commute.walkScore}/100`] : []),
      ],
    },
    {
      heading: `Is ${city.name} safer than similar U.S. cities?`,
      answer: safetyAnswer,
      bullets:
        city.crimeIndex.source === 'data unavailable'
          ? ['FBI citywide rates: data unavailable']
          : [
              `Violent ${city.crimeIndex.violent} per 100k`,
              `Property ${city.crimeIndex.property} per 100k`,
            ],
    },
    {
      heading: `What is the climate like year-round in ${city.name}?`,
      answer: climateAnswer,
      bullets: [
        `Summer high ${city.climate.avgHighSummer}°F`,
        `Winter low ${city.climate.avgLowWinter}°F`,
        `${city.climate.annualRainfall} in rain · ${city.climate.sunnyDays} sunny days`,
      ],
    },
  ]

  if (city.neighborhoods?.length) {
    const hoods = city.neighborhoods.slice(0, 3)
    sections.push({
      heading: `Which neighborhoods do relocators research in ${city.name}?`,
      answer: pick(
        [
          `Newcomers often start with ${hoods.join(', ')} — tour at commute hour before signing. Neighborhood lists are curated research starting points, not rankings.`,
          `${hoods[0]} is the name relocators hear first` +
            `${hoods[1] ? `; compare it with ${hoods.slice(1).join(' and ')}` : ''} once you know your job location.`,
        ],
        city.slug,
        19,
      ),
      bullets: hoods,
    })
  }

  return sections
}
