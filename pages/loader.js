// pages/loader.js
import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Loader() {
  const [progress, setProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState('Initializing...')
  
  const targetSite = 'https://webkraft.dev'

  useEffect(() => {
    const startTime = Date.now()
    const minDuration = 3000 // Минимум 3 секунды для UX
    
    let resourcesChecked = false
    let minTimeReached = false

    // Проверка готовности основного сайта
    async function checkSiteReadiness() {
      try {
        setLoadingPhase('Loading resources...')
        setProgress(20)

        // 1. Проверяем доступность основного сайта
        const response = await fetch(targetSite, { 
          method: 'HEAD',
          mode: 'no-cors' // Избегаем CORS ошибки
        })
        setProgress(40)
        setLoadingPhase('Checking assets...')

        // 2. Предзагружаем основные ресурсы
        await preloadResources()
        setProgress(70)
        setLoadingPhase('Optimizing...')

        // 3. Дополнительная проверка готовности
        await verifyResourcesLoaded()
        setProgress(90)
        setLoadingPhase('Almost ready...')

        resourcesChecked = true
        checkCompletion()

      } catch (error) {
        console.log('Site check completed (CORS expected)')
        // CORS ошибка ожидаема, продолжаем загрузку
        setProgress(60)
        await preloadResources()
        setProgress(90)
        resourcesChecked = true
        checkCompletion()
      }
    }

    // Предзагрузка критических ресурсов
    function preloadResources() {
      return new Promise((resolve) => {
        const resources = [
          targetSite,
          // Добавить конкретные ресурсы если знаете пути
          // targetSite + '/css/main.css',
          // targetSite + '/js/main.js'
        ]

        let loadedCount = 0
        const totalResources = resources.length

        resources.forEach(url => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = url
          link.onload = link.onerror = () => {
            loadedCount++
            const resourceProgress = 40 + (loadedCount / totalResources) * 20
            setProgress(resourceProgress)
            
            if (loadedCount === totalResources) {
              resolve()
            }
          }
          document.head.appendChild(link)
        })

        // Fallback timeout
        setTimeout(resolve, 2000)
      })
    }

    // Дополнительная проверка через iframe (для более точной проверки)
    function verifyResourcesLoaded() {
      return new Promise((resolve) => {
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = targetSite
        
        iframe.onload = () => {
          setLoadingPhase('Site ready!')
          document.body.removeChild(iframe)
          resolve()
        }
        
        iframe.onerror = () => {
          document.body.removeChild(iframe)
          resolve() // Продолжаем даже при ошибке
        }
        
        document.body.appendChild(iframe)
        
        // Timeout fallback
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
          resolve()
        }, 3000)
      })
    }

    // Минимальное время загрузки для UX
    setTimeout(() => {
      minTimeReached = true
      checkCompletion()
    }, minDuration)

    // Проверка завершения
    function checkCompletion() {
      if (resourcesChecked && minTimeReached) {
        setProgress(100)
        setLoadingPhase('Complete!')
        
        setTimeout(() => {
          window.location.replace('/app')
        }, 500)
      }
    }

    // Фоновая анимация прогресса
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 0.5
      })
    }, 100)

    // Запуск проверки сайта
    checkSiteReadiness()

    return () => {
      clearInterval(progressInterval)
    }
  }, [targetSite])

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
        <div className="loading-phase">
          {loadingPhase}
        </div>
      </div>
    </>
  )
}