import { useCallback, useEffect, useRef, useState } from 'react'
import { readJson, writeJson } from '../utils/storage'

const SRC = '/audio/ambient.mp3'
const KEY = 'arachne.audio'
const FADE_MS = 2500

interface AudioPrefs {
  volume: number
  muted: boolean
}

export interface AmbientMusic {
  volume: number
  muted: boolean
  /** false until the browser lets us play (autoplay needs a user gesture) */
  started: boolean
  setVolume: (v: number) => void
  toggleMute: () => void
}

export function useAmbientMusic(): AmbientMusic {
  const [prefs, setPrefs] = useState<AudioPrefs>(() => readJson(KEY, { volume: 0.35, muted: false }))
  const [started, setStarted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prefsRef = useRef(prefs)
  const fadeRef = useRef(0)

  const target = (p: AudioPrefs) => (p.muted ? 0 : p.volume)

  useEffect(() => {
    prefsRef.current = prefs
    writeJson(KEY, prefs)
    const audio = audioRef.current
    if (audio && !fadeRef.current) audio.volume = target(prefs)
  }, [prefs])

  useEffect(() => {
    const audio = new Audio(SRC)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    audioRef.current = audio

    const fadeIn = () => {
      const from = performance.now()
      const step = (now: number) => {
        const k = Math.min(1, (now - from) / FADE_MS)
        audio.volume = target(prefsRef.current) * k
        fadeRef.current = k < 1 ? requestAnimationFrame(step) : 0
      }
      fadeRef.current = requestAnimationFrame(step)
    }

    const tryPlay = () =>
      audio
        .play()
        .then(() => {
          setStarted(true)
          fadeIn()
          detach()
        })
        .catch(() => {
          // blocked until the first click / key press
        })

    const events = ['pointerdown', 'keydown', 'touchend'] as const
    const detach = () => events.forEach((e) => window.removeEventListener(e, tryPlay))
    events.forEach((e) => window.addEventListener(e, tryPlay))
    tryPlay()

    return () => {
      detach()
      cancelAnimationFrame(fadeRef.current)
      audio.pause()
      audio.src = ''
    }
  }, [])

  const setVolume = useCallback((v: number) => {
    const volume = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100
    setPrefs({ volume, muted: volume === 0 })
  }, [])

  const toggleMute = useCallback(() => {
    setPrefs((p) => ({ volume: p.volume === 0 ? 0.35 : p.volume, muted: !p.muted }))
  }, [])

  return { volume: prefs.volume, muted: prefs.muted, started, setVolume, toggleMute }
}
