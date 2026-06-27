'use client'

import { useEffect, useRef } from 'react'
import { trackAssetView, type TrackEvent } from '@/lib/analytics/track'

export function useTrackView(
  ready: boolean,
  entity_type: string,
  entity_id: string | undefined,
  meta?: TrackEvent['meta'],
) {
  const sent = useRef(false)
  useEffect(() => {
    if (!ready || !entity_id || sent.current) return
    sent.current = true
    trackAssetView(entity_type, entity_id, meta as { category_slug?: string; tags?: string[]; kind?: string })
  }, [ready, entity_type, entity_id, meta])
}
