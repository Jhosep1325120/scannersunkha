// Comentario: Muestra la pantalla inicial animada antes de entrar a la app.
'use client'

import { useEffect, useState } from 'react'

export function AppIntroSplash() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const splashSeenKey = 'bf:splash:seen'

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(splashSeenKey) === '1') return

    const bootTimer = window.setTimeout(() => {
      setVisible(true)
    }, 0)

    return () => {
      window.clearTimeout(bootTimer)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !visible) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const holdTimeMs = reducedMotion ? 360 : 900
    const exitTimeMs = reducedMotion ? 160 : 260

    const holdTimer = window.setTimeout(() => {
      setExiting(true)
      window.sessionStorage.setItem(splashSeenKey, '1')

      window.setTimeout(() => {
        setVisible(false)
      }, exitTimeMs)
    }, holdTimeMs)

    return () => {
      window.clearTimeout(holdTimer)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className={`bf-splash ${exiting ? 'bf-splash--exit' : ''}`} aria-hidden="true">
      <div className="bf-splash-core">
        <div className="bf-splash-orbit" />
        <div className="bf-splash-orbit bf-splash-orbit--b" />

        <div className="bf-splash-logo-wrap">
          <div className="bf-splash-logo">S</div>
        </div>

        <p className="bf-splash-brand">SUNKHA BARBERIA</p>
      </div>
    </div>
  )
}
