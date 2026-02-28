import React, { useState, useRef, useEffect } from 'react'

const MOCK_STARS = [
  'Sirius',
  'Canopus',
  'Arcturus',
  'Vega',
  'Capella',
  'Rigel',
  'Procyon',
  'Betelgeuse',
  'Altair',
  'Aldebaran',
]

const MOCK_CONSTELLATIONS = [
  'Orion',
  'Ursa Major',
  'Cassiopeia',
  'Cygnus',
  'Lyra',
  'Scorpius',
  'Leo',
  'Aquila',
  'Pegasus',
  'Draco',
]

export default function Sidebar({
  selectedStars = [],
  setSelectedStars,
  selectedConstellations = [],
  setSelectedConstellations,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'stars' | 'constellations'
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  const toggleStar = (name) => {
    setSelectedStars?.((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    )
  }
  const toggleConstellation = (name) => {
    setSelectedConstellations?.((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    )
  }

  const filteredStars = MOCK_STARS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  )
  const filteredConstellations = MOCK_CONSTELLATIONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
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
        className={`fixed right-0 top-0 z-30 flex h-full w-[min(380px,90vw)] flex-col rounded-l-2xl font-sour-gummy bg-[#001E39] shadow-xl transition-transform duration-200 ease-out sm:shadow-2xl ${
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300/70">
                Stars
              </p>
              <ul className="mb-6 grid grid-cols-2 gap-2">
                {filteredStars.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => toggleStar(name)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedStars.includes(name)
                          ? 'border-blue-500 bg-[#1a365d] font-medium text-blue-50'
                          : 'border-blue-900/50 text-blue-100/90 hover:border-blue-700 hover:bg-[#1a365d]/70'
                      }`}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showConstellations && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-300/70">
                Constellations
              </p>
              <ul className="flex flex-col gap-2">
                {filteredConstellations.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => toggleConstellation(name)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedConstellations.includes(name)
                          ? 'border-blue-500 bg-[#1a365d] font-medium text-blue-50'
                          : 'border-blue-900/50 text-blue-100/90 hover:border-blue-700 hover:bg-[#1a365d]/70'
                      }`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-blue-900/50 bg-[#1a365d] text-blue-300/50 text-xs">
                        Image
                      </span>
                      <span className="min-w-0 flex-1">{name}</span>
                    </button>
                  </li>
                ))}
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
      </aside>
    </>
  )
}
