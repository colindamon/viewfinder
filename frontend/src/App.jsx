import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import Home from './components/Home'
import StarLoader from './components/StarLoader'
import { API_BASE } from './config.js'

const STARS_API = `${API_BASE}/stars`

function App() {
  const [count, setCount] = useState(0)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const path = window.location.pathname

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setIsInitialLoad(false)
    }, 8000)

    async function waitForFetch() {
      try {
        const res = await fetch(STARS_API)
        await res.json()
      } catch {
        // Fallback handled in Home; just proceed
      }
      if (!cancelled) {
        clearTimeout(timeout)
        setIsInitialLoad(false)
      }
    }
    waitForFetch()
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])

  if (isInitialLoad) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <StarLoader message="Loading" />
      </div>
    )
  }

  if (path === '/home' || path === '/' || path === '') {
    return <Home />
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code>
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
