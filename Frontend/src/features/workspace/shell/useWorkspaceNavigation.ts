import { useEffect, useState } from 'react'
import { currentWorkspacePath } from '../routing'

export const MOBILE_SIDEBAR_MEDIA = '(max-width: 760px), ((max-width: 932px) and (max-height: 480px))'

export function isMobileSidebarViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_SIDEBAR_MEDIA).matches
}

export function useWorkspaceNavigation() {
  const [collapsed, setCollapsed] = useState(() => isMobileSidebarViewport())
  const [pathname, setPathname] = useState(() => currentWorkspacePath())

  useEffect(() => {
    const handlePopState = () => setPathname(currentWorkspacePath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_SIDEBAR_MEDIA)
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => setCollapsed(event.matches)
    handleChange(mediaQuery)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (collapsed || !isMobileSidebarViewport()) return
    const scrollY = window.scrollY
    const body = document.body
    const original = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }
    document.documentElement.classList.add('mobile-sidebar-lock')
    body.classList.add('mobile-sidebar-lock')
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollY}px`, width: '100%' })
    return () => {
      document.documentElement.classList.remove('mobile-sidebar-lock')
      body.classList.remove('mobile-sidebar-lock')
      Object.assign(body.style, original)
      window.scrollTo(0, scrollY)
    }
  }, [collapsed])

  function navigate(path: string) {
    const targetPath = path === '/procesos' ? '/procesos/procesos-almacenado' : path
    setPathname(targetPath)
    window.history.pushState(null, '', targetPath)
    if (isMobileSidebarViewport()) setCollapsed(true)
  }

  return { collapsed, navigate, pathname, setCollapsed }
}
