/**
 * Viewport and Mobile Safe Area Engine
 * - Sets dynamic --vh custom property to handle mobile browser toolbars (iOS Safari dynamic viewport)
 * - Detects device tiers (phone portrait, phone landscape, tablet, desktop)
 * - Safe area helpers and feature-detected haptics
 */

export function initViewportEngine() {
  const updateVh = () => {
    // 1% of innerHeight in px
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Viewport width in px
    const vw = window.innerWidth * 0.01;
    document.documentElement.style.setProperty('--vw', `${vw}px`);

    const isLandscape = window.innerWidth > window.innerHeight;
    const isPhoneLandscape = isLandscape && window.innerHeight <= 520;
    const isPhonePortrait = !isLandscape && window.innerWidth <= 640;
    const isTablet = (window.innerWidth > 640 && window.innerWidth <= 1024) || (isLandscape && window.innerWidth <= 1180 && window.innerHeight > 520);

    document.documentElement.classList.toggle('is-phone-portrait', isPhonePortrait);
    document.documentElement.classList.toggle('is-phone-landscape', isPhoneLandscape);
    document.documentElement.classList.toggle('is-tablet', isTablet);
    document.documentElement.classList.toggle('is-touch-device', 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  };

  updateVh();

  window.addEventListener('resize', updateVh, { passive: true });
  window.addEventListener('orientationchange', () => {
    // Delay slightly to let mobile browser finish layout reflow
    setTimeout(updateVh, 80);
    setTimeout(updateVh, 250);
  }, { passive: true });

  // Update on visualViewport changes (covers keyboard opening and Safari URL bar expanding/collapsing)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateVh, { passive: true });
  }

  return updateVh;
}

/**
 * Check if the current device is mobile/touch
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth <= 844
  );
}

/**
 * Check if running on iOS (iPhone / iPad / iPod)
 */
export function isIOS() {
  if (typeof window === 'undefined' || !navigator) return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Feature-detected haptic feedback helper
 * Persisted user toggle respected via 'abnf_haptics_enabled'
 */
export function triggerHaptic(type = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;

  // Check user settings
  try {
    const raw = localStorage.getItem('abnf_haptics_enabled');
    if (raw === 'false') return false;
  } catch {
    // ignore
  }

  try {
    switch (type) {
      case 'tick':
      case 'light':
        navigator.vibrate(12);
        break;
      case 'tab':
      case 'swipe':
        navigator.vibrate(18);
        break;
      case 'correct':
      case 'success':
        navigator.vibrate([25, 40, 35]);
        break;
      case 'wrong':
      case 'error':
        navigator.vibrate([40, 60, 40]);
        break;
      case 'complete':
        navigator.vibrate([35, 50, 45, 60, 80]);
        break;
      default:
        navigator.vibrate(15);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fullscreen toggle with iOS fallback
 */
export async function toggleFullscreen(targetElement = document.documentElement) {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    return false;
  }

  if (targetElement.requestFullscreen) {
    await targetElement.requestFullscreen().catch(() => {});
    // Try orientation lock if supported
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(() => {});
    }
    return true;
  } else if (targetElement.webkitRequestFullscreen) {
    targetElement.webkitRequestFullscreen();
    return true;
  }
  return false;
}
