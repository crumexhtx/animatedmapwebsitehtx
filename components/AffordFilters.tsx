'use client'

import type { AffordCatalogBounds, AffordFilters, AffordSort, BudgetMode, CrimeTolerance } from '@/lib/afford'
import { AFFORD_SORT_LABELS } from '@/lib/afford'
import { formatCurrency } from '@/lib/format'

type Props = {
  filters: AffordFilters
  bounds: AffordCatalogBounds
  onChange: <K extends keyof AffordFilters>(key: K, value: AffordFilters[K]) => void
}

export function AffordFiltersPanel({ filters, bounds, onChange }: Props) {
  const budgetPlaceholder =
    filters.mode === 'rent'
      ? `e.g. ${formatCurrency(Math.round(bounds.rentMax * 0.6))}`
      : `e.g. ${formatCurrency(Math.round(bounds.homeMax * 0.5))}`

  return (
    <div className="afford-filters">
      <fieldset className="match-fieldset">
        <legend>Housing budget</legend>
        <div className="afford-mode-toggle">
          {(['rent', 'buy'] as BudgetMode[]).map((mode) => (
            <label key={mode} className={filters.mode === mode ? 'is-active' : undefined}>
              <input
                type="radio"
                name="budget-mode"
                value={mode}
                checked={filters.mode === mode}
                onChange={() => onChange('mode', mode)}
              />
              {mode === 'rent' ? 'Max monthly rent' : 'Max home price'}
            </label>
          ))}
        </div>
        <label className="afford-budget-input">
          <span>{filters.mode === 'rent' ? 'Monthly budget' : 'Purchase budget'}</span>
          <input
            type="number"
            min={1}
            step={filters.mode === 'rent' ? 50 : 5000}
            placeholder={budgetPlaceholder}
            value={filters.budget ?? ''}
            onChange={(event) => {
              const raw = event.target.value
              onChange('budget', raw === '' ? null : Number(raw))
            }}
          />
        </label>
        <p className="match-hint">
          Compared against city-level median {filters.mode === 'rent' ? 'rent' : 'home value'} (ACS), not your personal
          quote.
        </p>
      </fieldset>

      <fieldset className="match-fieldset">
        <legend>Crime tolerance</legend>
        <div className="match-climate">
          {(['any', 'medium', 'low'] as CrimeTolerance[]).map((option) => (
            <label key={option} className={filters.crimeTolerance === option ? 'is-active' : undefined}>
              <input
                type="radio"
                name="crime"
                value={option}
                checked={filters.crimeTolerance === option}
                onChange={() => onChange('crimeTolerance', option)}
              />
              {option === 'any' ? 'Any' : option === 'low' ? 'Low only' : 'Low–medium'}
            </label>
          ))}
        </div>
        <p className="match-hint">Uses violent crime per 100k; excludes cities without FBI-verified rates when filtered.</p>
      </fieldset>

      <fieldset className="match-fieldset">
        <legend>Walk score (min)</legend>
        <label className="match-weight">
          <span>
            Minimum walk score
            <strong>{filters.minWalkScore || 'Off'}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={bounds.walkMax}
            step={1}
            value={filters.minWalkScore}
            onChange={(event) => onChange('minWalkScore', Number(event.target.value))}
          />
        </label>
      </fieldset>

      <fieldset className="match-fieldset">
        <legend>Max commute</legend>
        <label className="match-weight">
          <span>
            Max one-way commute
            <strong>{filters.maxCommute == null ? 'Any' : `${filters.maxCommute} min`}</strong>
          </span>
          <input
            type="range"
            min={bounds.commuteMin}
            max={bounds.commuteMax}
            step={1}
            value={filters.maxCommute ?? bounds.commuteMax}
            onChange={(event) => {
              const value = Number(event.target.value)
              onChange('maxCommute', value >= bounds.commuteMax ? null : value)
            }}
          />
        </label>
      </fieldset>

      <fieldset className="match-fieldset">
        <legend>Climate</legend>
        <div className="afford-range-pair">
          <label>
            Summer high min (°F)
            <input
              type="number"
              placeholder={`${bounds.summerMin}`}
              value={filters.minSummerHigh ?? ''}
              onChange={(event) =>
                onChange('minSummerHigh', event.target.value === '' ? null : Number(event.target.value))
              }
            />
          </label>
          <label>
            Summer high max (°F)
            <input
              type="number"
              placeholder={`${bounds.summerMax}`}
              value={filters.maxSummerHigh ?? ''}
              onChange={(event) =>
                onChange('maxSummerHigh', event.target.value === '' ? null : Number(event.target.value))
              }
            />
          </label>
          <label>
            Winter low min (°F)
            <input
              type="number"
              placeholder={`${bounds.winterMin}`}
              value={filters.minWinterLow ?? ''}
              onChange={(event) =>
                onChange('minWinterLow', event.target.value === '' ? null : Number(event.target.value))
              }
            />
          </label>
          <label>
            Winter low max (°F)
            <input
              type="number"
              placeholder={`${bounds.winterMax}`}
              value={filters.maxWinterLow ?? ''}
              onChange={(event) =>
                onChange('maxWinterLow', event.target.value === '' ? null : Number(event.target.value))
              }
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="match-fieldset">
        <legend>Local job market</legend>
        <label className="afford-budget-input">
          <span>Min median household income</span>
          <input
            type="number"
            min={0}
            step={1000}
            placeholder={`Optional · catalog ${formatCurrency(bounds.incomeMin)}–${formatCurrency(bounds.incomeMax)}`}
            value={filters.minMedianIncome ?? ''}
            onChange={(event) =>
              onChange('minMedianIncome', event.target.value === '' ? null : Number(event.target.value))
            }
          />
        </label>
      </fieldset>

      <fieldset className="match-fieldset">
        <legend>Sort results</legend>
        <label className="afford-sort-select">
          <span>Order by</span>
          <select
            value={filters.sort}
            onChange={(event) => onChange('sort', event.target.value as AffordSort)}
          >
            {(Object.keys(AFFORD_SORT_LABELS) as AffordSort[]).map((key) => (
              <option key={key} value={key}>
                {AFFORD_SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
    </div>
  )
}
