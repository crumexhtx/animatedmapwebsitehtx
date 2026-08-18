import indexData from '@/data/catalog/index.json'
import type { CatalogIndex } from '@/lib/types'

/** Tiny catalog index — safe to import from layout/header without cities.json. */
export const catalogIndex = indexData as CatalogIndex
