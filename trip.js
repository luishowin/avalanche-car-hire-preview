export const services = {self:'Self-drive', driver:'Chauffeured'};
export function instant(value) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return NaN;
  const t = Date.parse(value+'+03:00');
  return Number.isFinite(t) && new Date(t+10800000).toISOString().slice(0,16)===value ? t : NaN;
}
export function tripError(trip, now=Date.now()) {
  if (!Object.hasOwn(services,trip.service)) return 'Choose a rental service.';
  if (!trip.pickup?.trim() || !trip.dropoff?.trim()) return 'Enter a pickup and return location.';
  if ([trip.pickup,trip.dropoff].some(s=>s.length>160)) return 'Keep each location under 161 characters.';
  const start=instant(trip.start), end=instant(trip.end);
  if (!Number.isFinite(start) || start<=now) return 'Choose a future pickup date and time.';
  if (!Number.isFinite(end) || end<=start) return 'Return must be after pickup.';
  return '';
}
export function displayTime(value) {
  return new Intl.DateTimeFormat('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'}).format(instant(value));
}
export function message(name, trip) {
  return ['Hello Avalanche Car Hire, I’d like to enquire about '+name+'.', services[trip.service],
    'Pickup: '+trip.pickup+' · '+displayTime(trip.start)+' EAT',
    'Return: '+trip.dropoff+' · '+displayTime(trip.end)+' EAT',
    'Please confirm availability and the price.'].join('\n');
}
