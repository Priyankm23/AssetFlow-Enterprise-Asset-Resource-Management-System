function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const bookings = [
  {
    "startTime": "2026-07-13T03:30:00.000Z",
    "endTime": "2026-07-13T04:30:00.000Z",
    "status": "active",
    "assetId": "6b165e66-ef8f-49b2-b403-433f6f4b5108"
  }
];

const selectedAssetId = "6b165e66-ef8f-49b2-b403-433f6f4b5108";
const currentDate = new Date('2026-07-13'); // Monday, July 13
const dateStr = formatDate(currentDate);

console.log('dateStr:', dateStr);

const dayBookings = bookings.filter((b) => {
  if (b.assetId !== selectedAssetId || b.status !== 'active') {
    console.log('Filtered out due to assetId or status:', b);
    return false;
  }
  const bDate = formatDate(new Date(b.startTime));
  console.log('bDate:', bDate);
  return bDate === dateStr;
});

console.log('dayBookings match count:', dayBookings.length);
