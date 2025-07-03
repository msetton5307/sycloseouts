import { useLocation } from "wouter"

export function useSearch() {
  const [location] = useLocation()
  const queryIndex = location.indexOf("?")
  return queryIndex >= 0 ? location.substring(queryIndex) : ""
}
