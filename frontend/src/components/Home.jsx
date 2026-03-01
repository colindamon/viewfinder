import React, { useState, useEffect } from 'react'
import StarMap, { normalizeStar } from './StarMap.jsx'
import Sidebar from './Sidebar.jsx'
import { tmp_star_data, CONSTELLATION_LINES } from '../data/catalogMock.js'

const Home = () => {
    const [started, setStarted] = useState(false)
    const [stars, setStars] = useState([])
    const [selectedStars, setSelectedStars] = useState([])
    const [selectedConstellations, setSelectedConstellations] = useState([])

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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <StarMap
          selectedStarIds={selectedStars}
          stars={stars}
          constellations={CONSTELLATION_LINES}
          selectedConstellationIds={selectedConstellations}
        />
      </div>
      {started && (
        <Sidebar
          selectedStars={selectedStars}
          setSelectedStars={setSelectedStars}
          selectedConstellations={selectedConstellations}
          setSelectedConstellations={setSelectedConstellations}
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