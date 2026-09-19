import { useEffect } from 'react'

// While the visitor is on another tab, the tab title flips between these
// every second (a blinking title stands out in the tab strip far more than a
// static one); the real title comes back the moment they return.
const AWAY_TITLES = ["🔥 Don't forget this...", '🔥 Come back!']
const AWAY_TITLE_INTERVAL_MS = 1000

export default function TabAttentionGrabber() {
  useEffect(() => {
    let realTitle = document.title
    let timer = null

    const stopBlinking = () => {
      if (timer === null) return
      clearInterval(timer)
      timer = null
      document.title = realTitle
    }

    const startBlinking = () => {
      if (timer !== null) return
      realTitle = document.title
      let i = 0
      document.title = AWAY_TITLES[i]
      timer = setInterval(() => {
        i = (i + 1) % AWAY_TITLES.length
        document.title = AWAY_TITLES[i]
      }, AWAY_TITLE_INTERVAL_MS)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) startBlinking()
      else stopBlinking()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopBlinking()
    }
  }, [])

  return null
}
