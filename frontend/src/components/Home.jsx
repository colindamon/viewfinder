import React, { useState, useEffect, useMemo } from 'react'
import StarMap, { normalizeStar } from './StarMap.jsx'
import Sidebar from './Sidebar.jsx'
import { tmp_star_data, CONSTELLATION_LINES } from '../data/catalogMock.js'
import { API_BASE } from '../config.js'

const STARS_API = `${API_BASE}/stars`
const STAR_NAMES_API = `${API_BASE}/star_names`
const CONSTELLATIONS_NAMES_API = `${API_BASE}/constellation_names`
const CONSTELLATION_LINES_API = `${API_BASE}/constellations`

/** Filter constellation edges to only those where both endpoints are in visible stars (by hip). */
function filterConstellationEdgesByVisible(allConstellations, stars) {
  const visibleHips = new Set(stars.map((s) => s.hip).filter(Boolean))
  return allConstellations
    .map((c) => {
      const hipIds = c.hip_ids || []
      const filtered = []
      for (let i = 0; i + 1 < hipIds.length; i += 2) {
        if (visibleHips.has(hipIds[i]) && visibleHips.has(hipIds[i + 1])) {
          filtered.push(hipIds[i], hipIds[i + 1])
        }
      }
      return filtered.length ? { ...c, hip_ids: filtered } : null
    })
    .filter(Boolean)
}

const Home = () => {
    const [started, setStarted] = useState(false)
    const [stars, setStars] = useState([])
    const [selectedStars, setSelectedStars] = useState([])
    const [starNames, setStarNames] = useState([])       // { name, hip }[] for Sidebar
    const [constellationsNames, setConstellationsNames] = useState([]) // { constellation_id, name }[] for Sidebar
    const [allConstellations, setAllConstellations] = useState([])   // full edges, fetched once

    // Poll visible stars from backend (gyro loop only serves this now)
    useEffect(() => {
        async function fetchStars() {
            try {
                const res = await fetch(STARS_API)
                const data = await res.json()
                const list = Array.isArray(data) ? data : tmp_star_data
                setStars(list.map((s) => normalizeStar(s)))
            } catch (e) {
                setStars(tmp_star_data)
                console.error('Failed to fetch stars:', e)
            }
        }
        fetchStars()
        const interval = setInterval(fetchStars, 100)
        return () => clearInterval(interval)
    }, [])

    // Fetch full constellation data once on load; frontend filters edges by visible stars
    useEffect(() => {
        async function fetchConstellations() {
            try {
                const res = await fetch(CONSTELLATION_LINES_API)
                const data = await res.json()
                setAllConstellations(Array.isArray(data) ? data : CONSTELLATION_LINES)
            } catch (e) {
                console.error('Failed to fetch constellations:', e)
                setAllConstellations(CONSTELLATION_LINES)
            }
        }
        fetchConstellations()
    }, [])

    // Star names and constellation names for Sidebar (polled less often)
    useEffect(() => {
        async function fetchCatalog() {
            try {
                const [namesRes, conNamesRes] = await Promise.all([
                    fetch(STAR_NAMES_API),
                    fetch(CONSTELLATIONS_NAMES_API),
                ])
                const names = await namesRes.json()
                const conNames = await conNamesRes.json()
                setStarNames(Array.isArray(names) ? names : [])
                setConstellationsNames(Array.isArray(conNames) ? conNames : [])
            } catch (e) {
                console.error('Failed to fetch catalog:', e)
            }
        }
        fetchCatalog()
        const interval = setInterval(fetchCatalog, 500)
        return () => clearInterval(interval)
    }, [])

    // Filter constellation edges to only those visible in current star list (fast, in JS)
    const constellationLines = useMemo(
        () => filterConstellationEdgesByVisible(allConstellations, stars),
        [allConstellations, stars]
    )

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <StarMap
          selectedStarIds={selectedStars}
          stars={stars}
          constellations={constellationLines}
        />
      </div> 
      {started && (
        <Sidebar
          selectedStars={selectedStars}
          setSelectedStars={setSelectedStars}
          starNames={starNames}
          constellationsNames={constellationsNames}
        />
      )}
      {!started && (
        <div
          className="absolute inset-0 z-1 flex cursor-pointer flex-col items-center justify-center text-center text-white"
          onClick={() => setStarted(true)}
          role="button"
          aria-label="Start"
        >
          <h1 className="text-[11rem] tracking-widest font-tangerine font-bold">Viewfinder</h1>
          <h2 className="text-5xl tracking-widest font-tangerine">Click anywhere to start</h2>
        </div>
      )}
    </div>
  )
}

export default Home