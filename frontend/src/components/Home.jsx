import React, { useState, useEffect } from 'react'
import StarMap, { normalizeStar } from './StarMap.jsx'
import Sidebar from './Sidebar.jsx'
import { tmp_star_data, CONSTELLATION_LINES } from '../data/catalogMock.js'

const API_BASE = 'http://127.0.0.1:8521'
const STARS_API = `${API_BASE}/stars`
const STAR_NAMES_API = `${API_BASE}/star_names`
const CONSTELLATIONS_NAMES_API = `${API_BASE}/constellations_names`
const CONSTELLATION_LINES_API = `${API_BASE}/constellation`

const Home = () => {
    const [started, setStarted] = useState(false)
    const [stars, setStars] = useState([])
    const [selectedStars, setSelectedStars] = useState([])
    const [starNames, setStarNames] = useState([])       // { name, hip }[] for Sidebar
    const [constellationsNames, setConstellationsNames] = useState([]) // { constellation_id, name, first_hip }[] for Sidebar
    const [constellationLines, setConstellationLines] = useState([])   // { constellation_id, name, hip_ids }[] for StarMap

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

    useEffect(() => {
        async function fetchCatalog() {
            try {
                const [namesRes, conNamesRes, conLinesRes] = await Promise.all([
                    fetch(STAR_NAMES_API),
                    fetch(CONSTELLATIONS_NAMES_API),
                    fetch(CONSTELLATION_LINES_API),
                ])
                const names = await namesRes.json()
                const conNames = await conNamesRes.json()
                const conLines = await conLinesRes.json()
                setStarNames(Array.isArray(names) ? names : [])
                setConstellationsNames(Array.isArray(conNames) ? conNames : [])
                setConstellationLines(Array.isArray(conLines) ? conLines : CONSTELLATION_LINES)
            } catch (e) {
                console.error('Failed to fetch catalog:', e)
                setConstellationLines(CONSTELLATION_LINES)
            }
        }
        fetchCatalog()
    }, [])

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