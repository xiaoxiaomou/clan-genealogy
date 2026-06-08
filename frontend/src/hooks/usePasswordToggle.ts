import { useState, useCallback } from 'react'

export function usePasswordToggle() {
  const [show, setShow] = useState(false)
  const toggle = useCallback(() => setShow((s) => !s), [])
  return { show, toggle }
}
