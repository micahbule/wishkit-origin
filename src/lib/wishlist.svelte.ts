// The wishlist as shared reactive state. The page renders from it, and the
// dev-only editor (src/lib/editor/) mutates it directly for live previews.
// In production nothing writes to it, so the page renders data/wishlist.json as-is.
import data from '../../data/wishlist.json'
import type { Wishlist } from './types'

export const wishlist: Wishlist = $state(data)
