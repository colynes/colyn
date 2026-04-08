const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-script';

let googleMapsLoaderPromise = null;

export function loadGoogleMapsPlaces(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser.'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing.'));
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    const handleReady = () => {
      if (window.google?.maps?.places) {
        resolve(window.google);
        return;
      }

      googleMapsLoaderPromise = null;
      reject(new Error('Google Maps loaded without Places support.'));
    };

    const handleError = () => {
      googleMapsLoaderPromise = null;
      reject(new Error('Failed to load Google Maps.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleReady, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}
