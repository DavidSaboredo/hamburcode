export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(la1) * Math.cos(la2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

export function calculateShippingARS(params: {
  customer?: LatLng;
  store: LatLng;
}) {
  if (!params.customer) return 1500;

  const km = haversineKm(params.store, params.customer);

  if (km <= 2) return 0;
  if (km <= 5) return 800;
  if (km <= 10) return 1500;
  return 3000;
}
