import { useState, useCallback } from 'react'

export function useRememberMe() {
  const [remembered, setRemembered] = useState(() =>
    localStorage.getItem('remember_me') === 'true'
  )
  const [savedUsername] = useState(() =>
    localStorage.getItem('remember_username') || ''
  )

  const save = useCallback(
    (username: string) => {
      if (remembered) {
        localStorage.setItem('remember_username', username)
        localStorage.setItem('remember_me', 'true')
      } else {
        localStorage.removeItem('remember_username')
        localStorage.removeItem('remember_me')
      }
    },
    [remembered]
  )

  const toggle = useCallback(() => setRemembered((s) => !s), [])

  return { remembered, setRemembered, toggle, save, savedUsername }
}
