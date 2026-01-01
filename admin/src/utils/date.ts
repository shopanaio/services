import dayjs from 'dayjs';

export function formatDate(date: Date | string): string {
  if (!date) {
    return '';
  }

  const now = dayjs();
  const input = dayjs(date);

  // Difference in seconds
  const diffSeconds = now.diff(input, 'second');
  if (diffSeconds < 10) {
    return 'just now';
  }

  if (diffSeconds < 60) {
    return 'a few seconds ago';
  }

  // Difference in minutes
  const diffMinutes = now.diff(input, 'minute');
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  // Difference in hours
  const diffHours = now.diff(input, 'hour');
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }

  // Difference in days (using floor difference)
  const diffDays = now.diff(input, 'day');
  // If the date is within 2 days (including exactly 2 days ago)
  if (diffDays <= 2) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Otherwise, return the exact date and time (formatted as needed)
  return input.format('YYYY-MM-DD HH:mm');
}
