import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import StarMap, { normalizeStar } from './StarMap.jsx'
import Sidebar from './Sidebar.jsx'
import StarLoader from './StarLoader.jsx'
import { tmp_star_data, CONSTELLATION_LINES } from '../data/catalogMock.js'
import { API_BASE } from '../config.js'

const STARS_API = `${API_BASE}/stars`
const STAR_NAMES_API = `${API_BASE}/star_names`
const CONSTELLATIONS_NAMES_API = `${API_BASE}/constellation_names`
const CONSTELLATION_LINES_API = `${API_BASE}/constellations`

const Home = () => {
    const [started, setStarted] = useState(false)
    const [starsLoaded, setStarsLoaded] = useState(false)
    const [catalogLoaded, setCatalogLoaded] = useState(false)
    const [stars, setStars] = useState(tmp_star_data)
    const [selectedStars, setSelectedStars] = useState([])
    const [starNames, setStarNames] = useState([])
    const [constellationsNames, setConstellationsNames] = useState([])
    const [constellationLines, setConstellationLines] = useState(CONSTELLATION_LINES)
    const socketRef = useRef(null)
    const socketAliveRef = useRef(false)

    const allLoaded = starsLoaded && catalogLoaded

    // Socket.IO: receive live star data pushed from backend (low latency path)
    useEffect(() => {
        const socket = io(API_BASE, {
            transports: ['websocket', 'polling'],
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
        })
        socketRef.current = socket

        socket.on('frontend_stars', (data) => {
            socketAliveRef.current = true
            const list = Array.isArray(data) ? data : []
            if (list.length > 0) {
                setStars(list.map((s) => normalizeStar(s)))
                setStarsLoaded(true)
            }
        })

        socket.on('connect', () => {
            console.log('Socket.IO connected')
        })

        return () => {
            socket.disconnect()
            socketRef.current = null
        }
    }, [])

    // Fallback: poll stars via HTTP until Socket.IO takes over
    useEffect(() => {
        let active = true

        async function poll() {
            while (active && !socketAliveRef.current) {
                try {
                    const res = await fetch(STARS_API)
                    const data = await res.json()
                    const list = Array.isArray(data) ? data : []
                    if (active && !socketAliveRef.current && list.length > 0) {
                        setStars(list.map((s) => normalizeStar(s)))
                        setStarsLoaded(true)
                    }
                } catch {
                    // backend not ready yet, keep retrying
                }
                await new Promise((r) => setTimeout(r, 200))
            }
        }

        poll()
        return () => { active = false }
    }, [])

    // Fetch static catalog data with retry (constellation lines, star names)
    useEffect(() => {
        let active = true

        async function fetchCatalog() {
            for (let attempt = 0; attempt < 30 && active; attempt++) {
                try {
                    const [namesRes, conNamesRes, conLinesRes] = await Promise.all([
                        fetch(STAR_NAMES_API),
                        fetch(CONSTELLATIONS_NAMES_API),
                        fetch(CONSTELLATION_LINES_API),
                    ])
                    const names = await namesRes.json()
                    const conNames = await conNamesRes.json()
                    const conLines = await conLinesRes.json()
                    if (active) {
                        setStarNames(Array.isArray(names) ? names : [])
                        setConstellationsNames(Array.isArray(conNames) ? conNames : [])
                        if (Array.isArray(conLines) && conLines.length > 0) {
                            setConstellationLines(conLines)
                        }
                        setCatalogLoaded(true)
                    }
                    return
                } catch {
                    await new Promise((r) => setTimeout(r, 1000))
                }
            }
        }

        fetchCatalog()
        return () => { active = false }
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
          onClick={() => allLoaded && setStarted(true)}
          role="button"
          aria-label="Start"
        >
          {!allLoaded ? (
            <StarLoader message="Loading stars" />
          ) : (
            <>
              <h1 className="text-[11rem] tracking-widest font-tangerine font-bold">Viewfinder</h1>
              <h2 className="text-5xl tracking-widest font-tangerine">Click anywhere to start</h2>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Home
