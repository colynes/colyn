import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, MapPin, Navigation } from 'lucide-react';
import { loadGoogleMapsPlaces } from '@/lib/googleMaps';

function pickAddressPart(components = [], preferredTypes = []) {
  for (const type of preferredTypes) {
    const match = components.find((component) => component.types?.includes(type));

    if (match?.long_name) {
      return match.long_name;
    }
  }

  return '';
}

function extractLocationDetails(result) {
  const components = result?.address_components || [];
  const geometry = result?.geometry?.location;

  return {
    address: result?.formatted_address || result?.name || '',
    latitude: typeof geometry?.lat === 'function' ? geometry.lat() : null,
    longitude: typeof geometry?.lng === 'function' ? geometry.lng() : null,
    city: pickAddressPart(components, ['locality', 'administrative_area_level_2', 'administrative_area_level_1']),
    district: pickAddressPart(components, ['sublocality_level_1', 'administrative_area_level_3', 'administrative_area_level_2', 'neighborhood']),
  };
}

export default function DeliveryLocationSelector({ data, setData, errors = {}, visible = true }) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const searchTokenRef = useRef(0);
  const [placesReady, setPlacesReady] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [fetchingCurrentLocation, setFetchingCurrentLocation] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [locationMessage, setLocationMessage] = useState('');
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!visible) {
      setSuggestions([]);
      setLocationError('');
      setLocationMessage('');
      return;
    }

    let cancelled = false;

    setLoadingPlaces(true);
    loadGoogleMapsPlaces(googleMapsApiKey)
      .then((google) => {
        if (cancelled) {
          return;
        }

        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        placesServiceRef.current = new google.maps.places.PlacesService(document.createElement('div'));
        geocoderRef.current = new google.maps.Geocoder();
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        setPlacesReady(true);
        setLocationError('');
      })
      .catch((error) => {
        if (!cancelled) {
          setPlacesReady(false);
          setLocationError(error.message || 'Location suggestions are unavailable right now.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPlaces(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [googleMapsApiKey, visible]);

  useEffect(() => {
    if (!visible || !placesReady || !data.delivery_address?.trim()) {
      setSuggestions([]);
      return;
    }

    if (data.delivery_location_confirmed) {
      setSuggestions([]);
      return;
    }

    const query = data.delivery_address.trim();

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    const currentToken = ++searchTokenRef.current;
    const timer = window.setTimeout(() => {
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'tz' },
          sessionToken: sessionTokenRef.current,
        },
        (predictions, status) => {
          if (currentToken !== searchTokenRef.current) {
            return;
          }

          if (status !== window.google?.maps?.places?.PlacesServiceStatus?.OK || !predictions) {
            setSuggestions([]);
            return;
          }

          setSuggestions(predictions.slice(0, 5));
        },
      );
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data.delivery_address, data.delivery_location_confirmed, placesReady, visible]);

  const minuteCoordinates = useMemo(() => {
    if (data.delivery_latitude == null || data.delivery_longitude == null) {
      return null;
    }

    return `${Number(data.delivery_latitude).toFixed(5)}, ${Number(data.delivery_longitude).toFixed(5)}`;
  }, [data.delivery_latitude, data.delivery_longitude]);

  const markUnconfirmed = (value) => {
    setData('delivery_address', value);
    setData('delivery_location_confirmed', false);
    setData('delivery_latitude', '');
    setData('delivery_longitude', '');
    setLocationMessage('');
    setLocationError('');
  };

  const applyLocationResult = ({ address, latitude, longitude, city, district }) => {
    setData('delivery_address', address || '');
    setData('delivery_latitude', latitude != null ? String(latitude) : '');
    setData('delivery_longitude', longitude != null ? String(longitude) : '');
    setData('region_city', city || data.region_city || '');
    setData('district_area', district || data.district_area || '');
    setData('delivery_location_confirmed', true);
    setSuggestions([]);
    setLocationError('');
    setLocationMessage('Delivery location confirmed successfully.');
  };

  const handleSuggestionSelect = (suggestion) => {
    if (!placesServiceRef.current) {
      return;
    }

    setLocationMessage('');
    setLocationError('');

    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['formatted_address', 'geometry', 'address_components', 'name'],
        sessionToken: sessionTokenRef.current,
      },
      (result, status) => {
        if (status !== window.google?.maps?.places?.PlacesServiceStatus?.OK || !result) {
          setLocationError('We could not confirm that location. Please try another suggestion.');
          return;
        }

        applyLocationResult(extractLocationDetails(result));
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      },
    );
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location services. Please type your delivery address.');
      return;
    }

    if (!googleMapsApiKey || !geocoderRef.current) {
      setLocationError('Google Maps is not configured yet. Please type your delivery address.');
      return;
    }

    setFetchingCurrentLocation(true);
    setLocationMessage('');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        geocoderRef.current.geocode(
          {
            location: {
              lat: coords.latitude,
              lng: coords.longitude,
            },
          },
          (results, status) => {
            if (status !== 'OK' || !results?.length) {
              setLocationError('We could not turn your coordinates into a delivery address. Please try again or type it manually.');
              setFetchingCurrentLocation(false);
              return;
            }

            const details = extractLocationDetails(results[0]);

            applyLocationResult({
              ...details,
              latitude: coords.latitude,
              longitude: coords.longitude,
            });

            setFetchingCurrentLocation(false);
          },
        );
      },
      (error) => {
        setFetchingCurrentLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. You can still type your address manually.');
          return;
        }

        setLocationError('We could not fetch your current location. Please try again or type your address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="space-y-5 rounded-[1.6rem] border border-[#eadfce] bg-[#fbf7f1] p-5 sm:p-6">
      <div>
        <h3 className="text-xl font-black text-[#241816]">Delivery location</h3>
        <p className="mt-2 text-sm leading-6 text-[#6f5d57]">
          Search for your address with Google suggestions or use your current location to confirm an accurate drop-off point.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <label className="mb-1.5 block text-sm font-medium text-[#241816]">Delivery address</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e796b]" />
            <input
              type="text"
              value={data.delivery_address}
              onChange={(event) => markUnconfirmed(event.target.value)}
              placeholder="Search street, estate, area, or building"
              className="w-full rounded-xl border border-[#e8ddd2] bg-white px-11 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d]"
              autoComplete="off"
            />
            {loadingPlaces ? <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#8e796b]" /> : null}
          </div>

          {suggestions.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#e8ddd2] bg-white shadow-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="flex w-full items-start gap-3 border-b border-[#f1e7dc] px-4 py-3 text-left text-sm text-[#3b241d] transition last:border-b-0 hover:bg-[#faf4ec]"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8e796b]" />
                  <span>{suggestion.description}</span>
                </button>
              ))}
            </div>
          ) : null}

          {errors.delivery_address ? <div className="mt-1 text-xs text-red-500">{errors.delivery_address}</div> : null}
        </div>

        <div className="flex flex-col justify-end gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={fetchingCurrentLocation}
            className="inline-flex h-[50px] items-center justify-center gap-2 rounded-xl border border-[#d5c4b1] bg-white px-4 text-sm font-semibold text-[#3b241d] transition hover:bg-[#f5ede2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fetchingCurrentLocation ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            {fetchingCurrentLocation ? 'Detecting...' : 'Use my current location'}
          </button>
          <p className="text-xs leading-5 text-[#7d6a5f]">
            Works best when location permission is enabled on your phone.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#241816]">Delivery notes</label>
        <textarea
          rows={3}
          value={data.delivery_notes}
          onChange={(event) => setData('delivery_notes', event.target.value)}
          placeholder="House color, gate code, nearby landmark, or driver instructions"
          className="w-full rounded-xl border border-[#e8ddd2] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#cdad7d] resize-none"
        />
        {errors.delivery_notes ? <div className="mt-1 text-xs text-red-500">{errors.delivery_notes}</div> : null}
      </div>

      {data.delivery_location_confirmed ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>{locationMessage || 'Location confirmed.'}</span>
          {minuteCoordinates ? <span className="font-medium">({minuteCoordinates})</span> : null}
        </div>
      ) : null}

      {locationError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {locationError}
        </div>
      ) : null}

      <input type="hidden" value={data.delivery_latitude || ''} readOnly />
      <input type="hidden" value={data.delivery_longitude || ''} readOnly />

      {errors.delivery_latitude ? <div className="text-xs text-red-500">{errors.delivery_latitude}</div> : null}
      {errors.delivery_longitude ? <div className="text-xs text-red-500">{errors.delivery_longitude}</div> : null}
    </div>
  );
}
