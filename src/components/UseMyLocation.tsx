"use client";

export function UseMyLocation() {
  function locate() {
    if (!navigator.geolocation) {
      window.alert("This browser cannot share a location. Type a city instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams(window.location.search);
        const form = document.getElementById("map-search");
        if (form instanceof HTMLFormElement) {
          const data = new FormData(form);
          for (const [key, value] of data.entries()) {
            if (typeof value === "string" && value) params.set(key, value);
          }
        }
        params.set("lat", position.coords.latitude.toFixed(5));
        params.set("lon", position.coords.longitude.toFixed(5));
        params.set("where", "Near me");
        if (!params.get("km")) params.set("km", "5");
        window.location.search = params.toString();
      },
      () => {
        window.alert("Allow location for this site, or type a city such as Melbourne.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <button type="button" onClick={locate} className="rounded-full border border-ink/15 px-4 py-2 text-sm">
      Use my location
    </button>
  );
}
