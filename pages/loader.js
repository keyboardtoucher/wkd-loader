// pages/loader.js
import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function Loader() {
  const [progress, setProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState('Initializing...')
  
  const targetSite = 'https://webkraft.dev'

  useEffect(() => {
    const startTime = Date.now()
    const minDuration = 3000 // At least 3 seconds for UX
    
    let resourcesChecked = false
    let minTimeReached = false

    // Check the readiness of the main site
    async function checkSiteReadiness() {
      try {
        setLoadingPhase('Loading resources...')
        setProgress(20)

        // 1. Check the availability of the main site
        const response = await fetch(targetSite, { 
          method: 'HEAD',
          mode: 'no-cors' // Avoid CORS errors
        })
        setProgress(40)
        setLoadingPhase('Checking assets...')

        // 2. Preload main resources
        await preloadResources()
        setProgress(70)
        setLoadingPhase('Optimizing...')

        // 3. Additional readiness check
        await verifyResourcesLoaded()
        setProgress(90)
        setLoadingPhase('Almost ready...')

        resourcesChecked = true
        checkCompletion()

      } catch (error) {
        console.log('Site check completed (CORS expected)')
        // CORS error is expected, continue loading
        setProgress(60)
        await preloadResources()
        setProgress(90)
        resourcesChecked = true
        checkCompletion()
      }
    }

    // Preload critical resources
    function preloadResources() {
      return new Promise((resolve) => {
        const resources = [
          targetSite,
          // Add specific resources if you know the paths
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

    // Additional check via iframe (for more accurate verification)
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
          resolve() // Continue even on error
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

    // Minimum loading time for UX
    setTimeout(() => {
      minTimeReached = true
      checkCompletion()
    }, minDuration)

    // Completion check
    function checkCompletion() {
      if (resourcesChecked && minTimeReached) {
        setProgress(100)
        setLoadingPhase('Complete!')
        
        setTimeout(() => {
          window.location.replace('/app')
        }, 500)
      }
    }

    // Background progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 0.5
      })
    }, 100)

    // Start site check
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