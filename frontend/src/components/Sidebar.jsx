import React, { useState, useRef, useEffect } from 'react'
import { MOCK_STARS, MOCK_CONSTELLATIONS } from '../data/catalogMock.js'
import { API_BASE } from '../config.js'
import bluestar1 from '../assets/bluestar1.png'
import bluestar2 from '../assets/bluestar2.png'

const FIND_STAR_API = `${API_BASE}/find_star`
const CANCEL_FIND_STAR_API = `${API_BASE}/cancel_find_star`

export default function Sidebar({
  selectedStars = [],
  setSelectedStars,
  starNames = [],
  constellationsNames = [],
}) {
  const stars = starNames.length > 0 ? starNames : MOCK_STARS
  const constellations = constellationsNames.length > 0 ? constellationsNames : MOCK_CONSTELLATIONS
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'stars' | 'constellations'
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const prevActiveStarIdRef = useRef(null)
  const [activeStarId, setActiveStarId] = useState(null)

  const toggleStar = (hip) => {
    setSelectedStars?.((prev) =>
      prev.includes(hip) ? prev.filter((id) => id !== hip) : [...prev, hip]
    )
  }

  /** Set the single "point to" target (star or constellation's first star). Only one can be active at a time. */
  const setActiveStar = (hip) => {
    setActiveStarId((prev) => (prev === hip ? null : hip))
  }

  const StarIcon = ({ active }) => (
    <img
      src={active ? bluestar2 : bluestar1}
      alt={active ? 'Star selected' : 'Star'}
      className="h-6 w-6 shrink-0 object-contain pointer-events-none"
    draggable={false}
    />
  )

  const filteredStars = stars.filter((star) =>
    star.name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredConstellations = constellations.filter((con) =>
    con.name.toLowerCase().includes(search.toLowerCase())
  )

  const showStars = filter === 'all' || filter === 'stars'
  const showConstellations = filter === 'all' || filter === 'constellations'

  const filterLabels = { all: 'All', stars: 'Stars', constellations: 'Constellations' }

  useEffect(() => {
    if (!filterOpen) return
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

  useEffect(() => {
    if (activeStarId != null) {
      fetch(FIND_STAR_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hip: activeStarId }),
      }).catch((e) => console.error('Failed to POST find_star:', e))
    } else if (prevActiveStarIdRef.current != null) {
      fetch(CANCEL_FIND_STAR_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch((e) => console.error('Failed to POST cancel_find_star:', e))
    }
    prevActiveStarIdRef.current = activeStarId
  }, [activeStarId])

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-[#0f2744] text-blue-200 shadow-sm transition-colors hover:bg-[#1a365d] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0f2744]"
        aria-label="Open sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <path d="M9 3v18" />
        </svg>
      </button>

      {/* Backdrop when open (mobile-friendly) */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[2px] transition-opacity sm:bg-transparent sm:backdrop-blur-none"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`viewfinder-sidebar fixed right-0 top-0 z-30 flex h-full w-[min(380px,90vw)] flex-col rounded-l-2xl font-sour-gummy bg-[#001E39] shadow-xl transition-transform duration-200 ease-out sm:shadow-2xl ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Exit, search, and filter in one row */}
        <div className="flex items-center gap-2 border-b border-blue-900/50 p-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-blue-200/80 transition-colors hover:bg-[#1a365d] hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-blue-900/50 bg-[#1a365d] pl-9 pr-3 text-sm text-blue-50 placeholder:text-blue-300/50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="relative shrink-0" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex h-9 w-24 items-center justify-between gap-1 rounded-md border border-blue-900/50 bg-[#1a365d] px-2 text-sm text-blue-100 outline-none transition-colors hover:bg-[#1e4073] focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-expanded={filterOpen}
              aria-haspopup="listbox"
            >
              <span>{filterLabels[filter]}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-transform duration-200 ease-in-out ${filterOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              className={`absolute right-0 top-full z-10 mt-1 min-w-(--button-width) origin-top-right rounded-md border border-blue-900/50 bg-[#1a365d] py-1 shadow-lg transition-[transform,opacity] duration-200 ease-out ${
                filterOpen
                  ? 'scale-100 opacity-100'
                  : 'pointer-events-none scale-95 opacity-0'
              }`}
              style={{ '--button-width': '6rem' }}
              role="listbox"
            >
              {(['all', 'stars', 'constellations']).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={filter === value}
                  onClick={() => {
                    setFilter(value)
                    setFilterOpen(false)
                  }}
                  className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                    filter === value
                      ? 'bg-blue-900/50 text-blue-50'
                      : 'text-blue-100 hover:bg-[#1e4073]'
                  }`}
                >
                  {filterLabels[value]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="scrollbar-hide flex-1 overflow-y-auto p-3">
          {showStars && (
            <>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold tracking-wider text-blue-300/70">
                  Stars
                </p>
                <span className="font-semibold shrink-0 text-right text-xs leading-tight text-blue-400/90">
                  Point to star
                </span>
              </div>
              <ul className="mb-6 flex flex-col gap-2">
                {filteredStars.map((star) => (
                  <li key={star.hip} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStar(star.hip)}
                      className={`min-w-0 flex-1 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedStars.includes(star.hip)
                          ? 'border-blue-500 bg-[#1a365d] font-medium text-blue-50'
                          : 'border-blue-900/50 text-blue-100/90 hover:border-blue-700 hover:bg-[#1a365d]/70'
                      }`}
                    >
                      <span className="block truncate">{star.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStar(star.hip)}
                      className={`flex h-9 w-9 mx-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        activeStarId === star.hip
                          ? 'border-blue-500 bg-[#1a365d] text-blue-50'
                          : ' border-blue-900/50 text-blue-300/50 hover:border-blue-600/60 hover:text-blue-400'
                      }`}
                      aria-label={activeStarId === star.hip ? 'Deselect (only one star or constellation can be active)' : 'Point to star'}
                    >
                      <StarIcon active={activeStarId === star.hip} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showConstellations && (
            <>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold tracking-wider text-blue-300/70">
                  Constellations
                </p>
                <span className="font-semibold shrink-0 text-right text-xs leading-tight text-blue-400/90">
                  Point to constellation
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {filteredConstellations.map((con) => {
                  const firstHip = con.first_hip ?? null
                  const isActive = firstHip != null && activeStarId === firstHip
                  return (
                    <li key={con.constellation_id} className="flex items-center gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-md border border-blue-900/50 px-3 py-2.5 text-left text-sm text-blue-100/90 transition-colors hover:border-blue-700 hover:bg-[#1a365d]/70"
                      >
                        <span className="flex items-center gap-3">
                          {/* <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-blue-900/50 bg-[#1a365d] text-blue-300/50 text-xs">
                            Image
                          </span> */}
                          <span className="block truncate">{con.name}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (firstHip != null) setActiveStar(firstHip)
                        }}
                        disabled={firstHip == null}
                        className={`flex h-9 w-9 mx-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isActive
                            ? 'border-blue-500 bg-[#1a365d] text-blue-50'
                            : 'border-blue-900/50 text-blue-300/50 hover:border-blue-600/60 hover:text-blue-400 disabled:opacity-50 disabled:pointer-events-none'
                        }`}
                        aria-label={isActive ? 'Deselect (only one star or constellation can be active)' : 'Point to constellation (sets active star to first star in constellation)'}
                      >
                        <StarIcon active={isActive} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {showStars && filteredStars.length === 0 && (
            <p className="text-sm text-blue-300/60">No stars match your search.</p>
          )}
          {showConstellations && filteredConstellations.length === 0 && (
            <p className="text-sm text-blue-300/60">
              No constellations match your search.
            </p>
          )}
        </div>

        {/* Selected at bottom: Stars only */}
        {selectedStars?.length > 0 && (
          <div className="border-t border-blue-900/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300/70">
              Selected
            </p>
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-blue-400/80">
                Stars
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedStars.map((hip) => {
                  const star = stars.find((s) => s.hip === hip)
                  return star ? (
                    <button
                      key={`star-${hip}`}
                      type="button"
                      onClick={() => toggleStar(hip)}
                      className="rounded-md border border-blue-500 bg-[#1a365d] px-2.5 py-1 text-xs text-blue-50 transition-colors hover:bg-[#1e4073]"
                    >
                      {star.name} ×
                    </button>
                  ) : null
                })}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
