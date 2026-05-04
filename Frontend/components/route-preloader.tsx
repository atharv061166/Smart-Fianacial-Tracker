"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface RoutePreloaderProps {
  routes?: string[]
}

export function RoutePreloader({ routes = ['/dashboard', '/expenses', '/income', '/portfolio', '/fingpt'] }: RoutePreloaderProps) {
  const router = useRouter()

  useEffect(() => {
    // Only preload in production and if the user is likely to navigate
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    // Preload critical routes after initial page load
    const preloadRoutes = () => {
      routes.forEach(route => {
        router.prefetch(route)
      })
    }

    // Use requestIdleCallback to preload during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadRoutes, { timeout: 2000 })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(preloadRoutes, 2000)
    }

    // Preload on user interaction hints
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href) {
        const url = new URL(link.href)
        if (url.origin === window.location.origin && routes.includes(url.pathname)) {
          router.prefetch(url.pathname)
        }
      }
    }

    // Add hover preloading
    document.addEventListener('mouseenter', handleMouseEnter, true)

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true)
    }
  }, [router, routes])

  return null
}

// Hook for intelligent route preloading based on user behavior
export function useIntelligentPreloading() {
  const router = useRouter()

  useEffect(() => {
    let mouseMovements = 0
    let scrollDepth = 0
    let timeOnPage = Date.now()

    const handleMouseMove = () => {
      mouseMovements++
    }

    const handleScroll = () => {
      const currentScrollDepth = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      scrollDepth = Math.max(scrollDepth, currentScrollDepth)
    }

    const preloadBasedOnBehavior = () => {
      const timeSpent = Date.now() - timeOnPage
      
      // If user is engaged (mouse movements, scrolling, time spent), preload more routes
      if (mouseMovements > 10 || scrollDepth > 50 || timeSpent > 30000) {
        const routesToPreload = ['/dashboard', '/expenses', '/income', '/portfolio', '/fingpt', '/budgeting', '/reports']
        routesToPreload.forEach(route => {
          router.prefetch(route)
        })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('scroll', handleScroll)

    // Check behavior after 10 seconds
    const behaviorTimer = setTimeout(preloadBasedOnBehavior, 10000)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('scroll', handleScroll)
      clearTimeout(behaviorTimer)
    }
  }, [router])
}

// Component for critical resource preloading
export function CriticalResourcePreloader() {
  useEffect(() => {
    // Preload critical images
    const criticalImages = [
      '/images/finance-logo.png',
      '/images/default-avatar.png'
    ]

    criticalImages.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = src
      document.head.appendChild(link)
    })

    // Preload critical fonts
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    ]

    criticalFonts.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      link.onload = () => {
        link.rel = 'stylesheet'
      }
      document.head.appendChild(link)
    })

    // Preload critical JavaScript modules
    if ('modulepreload' in HTMLLinkElement.prototype) {
      const criticalModules = [
        '/_next/static/chunks/framework.js',
        '/_next/static/chunks/main.js',
        '/_next/static/chunks/pages/_app.js'
      ]

      criticalModules.forEach(href => {
        const link = document.createElement('link')
        link.rel = 'modulepreload'
        link.href = href
        document.head.appendChild(link)
      })
    }
  }, [])

  return null
}
