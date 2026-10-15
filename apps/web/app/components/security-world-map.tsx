"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0b1b2b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8aa3bf" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1b2b" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#28425e" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#10263d" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#172f49" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#203c59" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#081522" }] },
];

const activityPoints = [
  { title: "North America", position: { lat: 39, lng: -98 } },
  { title: "Canada", position: { lat: 56, lng: -106 } },
  { title: "South America", position: { lat: -14, lng: -51 } },
  { title: "Europe", position: { lat: 51, lng: 10 } },
  { title: "India", position: { lat: 21, lng: 78 } },
  { title: "East Asia", position: { lat: 35, lng: 112 } },
  { title: "Australia", position: { lat: -25, lng: 133 } },
];

let mapsLoader: Loader | undefined;

function getMapsLoader(apiKey: string) {
  if (!mapsLoader) {
    mapsLoader = new Loader({ apiKey, version: "weekly" });
  }
  return mapsLoader;
}

function PreviewMap() {
  return (
    <svg viewBox="0 0 620 300" aria-hidden="true">
      <path d="m54 74 22-19 37-8 18 11 31-4 18 17-8 18-21 9-8 19-23 5-10 25-20-6-13-19-20-4-11-21-16-5zM155 169l22 4 18 20-5 27-13 25-18-8-4-24-14-16zM274 66l21-12 19 5 9 16-17 8-18-5zM305 93l31-20 35-5 23 15 40-5 29 12 43-5 31 19-10 19-28 2-15 22-30 6-12 27-24 7-19-14-28 6-24-10-20 12-17-14-26 4-11-18-31-3-11-18 12-19zM371 178l21 4 15 15-9 19-25-5-14-16zM497 209l30-6 26 12-11 19-33 2-20-12z" />
      <g className="map-points">
        <circle cx="105" cy="112" r="4" /><circle cx="174" cy="88" r="4" /><circle cx="204" cy="207" r="4" />
        <circle cx="314" cy="104" r="4" /><circle cx="369" cy="132" r="4" /><circle cx="426" cy="109" r="4" />
        <circle cx="486" cy="147" r="4" /><circle cx="527" cy="220" r="4" />
      </g>
    </svg>
  );
}

export function SecurityWorldMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const mapElement = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!apiKey || !mapElement.current) return;
    const configuredApiKey = apiKey;

    let cancelled = false;
    let map: google.maps.Map | undefined;

    async function initializeMap() {
      try {
        const { Map } = await getMapsLoader(configuredApiKey).importLibrary("maps");
        if (cancelled || !mapElement.current) return;

        map = new Map(mapElement.current, {
          center: { lat: 19, lng: 8 },
          zoom: 1.6,
          minZoom: 1,
          maxZoom: 8,
          mapTypeId: "roadmap",
          styles: darkMapStyles,
          backgroundColor: "#0b1b2b",
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: "cooperative",
          keyboardShortcuts: true,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        });

        for (const point of activityPoints) {
          new google.maps.Marker({
            map,
            position: point.position,
            title: point.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#3297ff",
              fillOpacity: 0.95,
              strokeColor: "#9bd0ff",
              strokeWeight: 2,
              scale: 4,
            },
          });
        }

        setMapReady(true);
      } catch {
        if (!cancelled) setMapError(true);
      }
    }

    void initializeMap();
    return () => {
      cancelled = true;
      if (map) google.maps.event.clearInstanceListeners(map);
    };
  }, [apiKey]);

  return (
    <div
      className={`world-map${mapReady ? " google-map-ready" : ""}`}
      role="img"
      aria-label="Global threat activity map"
    >
      {!mapReady && <div className="world-map-preview"><PreviewMap /></div>}
      {apiKey && <div className="google-map-canvas" ref={mapElement} aria-hidden="true" />}
      {!mapReady && (
        <span className="map-preview-notice" role={mapError ? "status" : undefined}>
          {mapError ? "Google Maps unavailable · preview shown" : apiKey ? "Loading secure map…" : "Map preview · Google Maps key not configured"}
        </span>
      )}
    </div>
  );
}
