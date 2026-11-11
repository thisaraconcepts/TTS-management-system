import { useEffect, useState } from 'react'

// Chrome fires `beforeinstallprompt` once per page load, often before the
// component that shows the button has mounted, so the event is kept here.
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn(!!deferred))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

/** Returns [canInstall, promptInstall]. canInstall is false once installed or when the browser offers no prompt. */
export const useInstallPrompt = () => {
  const [canInstall, setCanInstall] = useState(!!deferred && !isStandalone())

  useEffect(() => {
    const fn = (available) => setCanInstall(available && !isStandalone())
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  const promptInstall = async () => {
    if (!deferred) return
    const evt = deferred
    deferred = null
    notify()
    try {
      evt.prompt()
      await evt.userChoice
    } catch {
      /* the user dismissed the dialog */
    }
  }

  return [canInstall, promptInstall]
}
