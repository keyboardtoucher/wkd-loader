// pages/index.js
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/loader')
  }, [router])

  return (
    <div style={{ 
      background: '#000', 
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#AF0B55',
      fontSize: '2rem',
      fontFamily: 'system-ui'
    }}>
      Loading...
    </div>
  )
}