import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import StarMap, { normalizeStar } from './StarMap.jsx'
import Sidebar from './Sidebar.jsx'
import { tmp_star_data, CONSTELLATION_LINES } from '../data/catalogMock.js'
import { API_BASE } from '../config.js'

const STAR_NAMES_API = `${API_BASE}/star_names`
const CONSTELLATIONS_NAMES_API = `${API_BASE}/constellation_names`
const CONSTELLATION_LINES_API = `${API_BASE}/constellations`

const Home = () => {
    const [started, setStarted] = useState(false)
    const [stars, setStars] = useState([])
    const [selectedStars, setSelectedStars] = useState([])
    const [starNames, setStarNames] = useState([])
    const [constellationsNames, setConstellationsNames] = useState([])
    const [constellationLines, setConstellationLines] = useState([])
    const socketRef = useRef(null)

    // Socket.IO: receive live star + pointing data pushed from backend
    useEffect(() => {
        const socket = io(API_BASE, {
            transports: ['websocket', 'polling'],
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
        })
        socketRef.current = socket

        socket.on('frontend_stars', (data) => {
            const list = Array.isArray(data) ? data : []
            setStars(list.map((s) => normalizeStar(s)))
        })

        socket.on('connect', () => {
            console.log('Socket.IO connected')
        })

        return () => {
            socket.disconnect()
            socketRef.current = null
        }
    }, [])

    // Fetch static catalog data once on mount (these never change)
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
