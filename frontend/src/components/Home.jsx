import React, { useState } from 'react'
import StarMap from './StarMap.jsx'
import Sidebar from './Sidebar.jsx'

const Home = () => {
  const [started, setStarted] = useState(false)
  const [selectedStars, setSelectedStars] = useState([])
  const [selectedConstellations, setSelectedConstellations] = useState([])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <StarMap selectedStarNames={selectedStars} />
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