// loader.js
import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Loader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Предзагрузка основного сайта
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = 'https://webkraft.dev'
    document.head.appendChild(link)

    // Анимация прогресса
    const startTime = Date.now()
    const duration = 4000 // 4 секунды

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const baseProgress = (elapsed / duration) * 100
      
      // Добавляем реалистичность
      const randomFactor = Math.random() * 5 - 2.5
      const newProgress = Math.min(baseProgress + randomFactor, 100)
      
      setProgress(newProgress)
      
      if (newProgress >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          window.location.replace('/app') // Используем наш route
        }, 500)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Head>
        <title>Loading WebKraft...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="loader">
        <div 
          className="progress-bar"
          style={{ width: `${progress}%` }}
        />
        <div className="progress-text">
          {Math.floor(progress)}%
        </div>
      </div>
    </>
  )
}