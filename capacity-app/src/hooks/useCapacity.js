import { useMemo } from 'react'
import { calcCapacity } from '../utils/capacityUtils'

export function useCapacity(tasks = []) {
  return useMemo(() => calcCapacity(tasks), [tasks])
}
