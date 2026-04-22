export function formatStoreTime(value, localeTag = 'en-TZ') {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return String(value || '');
  }

  const [, hours, minutes] = match;
  const date = new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes)));

  return new Intl.DateTimeFormat(localeTag, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
}

export function formatWorkingHoursLabel({
  pickupHours,
  localeTag = 'en-TZ',
  daysLabel = 'Mon - Sat',
} = {}) {
  const openTime = pickupHours?.open_time;
  const closeTime = pickupHours?.close_time;

  if (!openTime || !closeTime) {
    return null;
  }

  return `${daysLabel}, ${formatStoreTime(openTime, localeTag)} - ${formatStoreTime(closeTime, localeTag)}`;
}
