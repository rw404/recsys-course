export function getBrowserStorage() {
  return {
    getItem(name: string) {
      try {
        return typeof localStorage === 'undefined' ? null : localStorage.getItem(name)
      } catch {
        return null
      }
    },
    setItem(name: string, value: string) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(name, value)
      } catch {
        // Keep the active in-memory store usable when persistence is unavailable.
      }
    },
    removeItem(name: string) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(name)
      } catch {
        // Privacy modes may expose localStorage while denying access to it.
      }
    },
  }
}
