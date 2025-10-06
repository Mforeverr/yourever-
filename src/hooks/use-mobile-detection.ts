import { useState, useEffect } from 'react'

interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isLowEnd: boolean
  isVeryLowEnd: boolean
  hasWebGL2: boolean
  deviceMemory: number
  hardwareConcurrency: number
}

export const useMobileDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isLowEnd: false,
    isVeryLowEnd: false,
    hasWebGL2: false,
    deviceMemory: 4,
    hardwareConcurrency: 4
  })

  useEffect(() => {
    const checkDevice = () => {
      // Check if mobile/tablet
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent)

      // Check WebGL2 support
      let hasWebGL2 = false
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2')
        hasWebGL2 = !!gl
      } catch (e) {
        hasWebGL2 = false
      }

      // Determine if low-end device
      const deviceMemory = (navigator as any).deviceMemory || 4
      const hardwareConcurrency = navigator.hardwareConcurrency || 4
      const isLowEnd = (
        deviceMemory <= 4 ||
        hardwareConcurrency <= 4 ||
        !hasWebGL2 ||
        isMobile
      )

      setDeviceInfo({
        isMobile,
        isTablet,
        isLowEnd,
        isVeryLowEnd: isLowEnd && (deviceMemory <= 2 || hardwareConcurrency <= 2),
        hasWebGL2,
        deviceMemory,
        hardwareConcurrency
      })
    }

    checkDevice()

    // Listen for device memory/performance changes if available
    if ('deviceMemory' in navigator) {
      const interval = setInterval(checkDevice, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [])

  return deviceInfo
}