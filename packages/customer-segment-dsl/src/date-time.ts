export interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = utcDate(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return { year, month, day };
}

export function formatCalendarDate(value: CalendarDate): string {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function addCalendarDate(
  value: CalendarDate,
  amount: number,
  unit: "day" | "week" | "month" | "year",
): CalendarDate {
  if (unit === "day" || unit === "week") {
    const date = utcDate(
      value.year,
      value.month - 1,
      value.day + amount * (unit === "week" ? 7 : 1),
    );
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }
  const monthIndex = value.month - 1 + (unit === "month" ? amount : amount * 12);
  const year = value.year + Math.floor(monthIndex / 12);
  const month = (((monthIndex % 12) + 12) % 12) + 1;
  const lastDay = utcDate(year, month, 0).getUTCDate();
  return { year, month, day: Math.min(value.day, lastDay) };
}

export function calendarDayDistance(lower: CalendarDate, upper: CalendarDate): number {
  return Math.round(
    (utcTimestamp(upper.year, upper.month - 1, upper.day) -
      utcTimestamp(lower.year, lower.month - 1, lower.day)) /
      86_400_000,
  );
}

export function validateDateTime(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})?$/u.exec(value);
  if (!match || !parseCalendarDate(match[1]!)) return false;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  if (hour > 23 || minute > 59 || second > 59) return false;
  const offset = match[5];
  if (offset && offset !== "Z") {
    const offsetHour = Number(offset.slice(1, 3));
    const offsetMinute = Number(offset.slice(4, 6));
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0))
      return false;
  }
  return true;
}

export function calendarDateAt(instant: string | Date, timeZone: string): CalendarDate {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function startOfCalendarDayUtc(value: CalendarDate, timeZone: string): string {
  // Iteratively solve local midnight -> UTC. This handles non-hour offsets and
  // DST without adding a fixed 24-hour duration.
  let epoch = utcTimestamp(value.year, value.month - 1, value.day);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = localDateTimeParts(new Date(epoch), timeZone);
    const target = utcTimestamp(value.year, value.month - 1, value.day);
    const actual = utcTimestamp(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const delta = target - actual;
    epoch += delta;
    if (delta === 0) break;
  }
  return new Date(epoch).toISOString();
}

export function nextCalendarDayStartUtc(effectiveAt: string, timeZone: string): string {
  return startOfCalendarDayUtc(
    addCalendarDate(calendarDateAt(effectiveAt, timeZone), 1, "day"),
    timeZone,
  );
}

export function localDateTimeToUtc(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/u.exec(value);
  if (!match || !validateDateTime(value)) return null;
  const target = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
  };
  let epoch = utcTimestamp(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second,
  );
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const local = localDateTimeParts(new Date(epoch), timeZone);
    const actual = utcTimestamp(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const expected = utcTimestamp(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute,
      target.second,
    );
    const delta = expected - actual;
    epoch += delta;
    if (delta === 0) break;
  }
  const resolved = localDateTimeParts(new Date(epoch), timeZone);
  if (
    resolved.year !== target.year ||
    resolved.month !== target.month ||
    resolved.day !== target.day ||
    resolved.hour !== target.hour ||
    resolved.minute !== target.minute ||
    resolved.second !== target.second
  )
    return null;
  return new Date(epoch).toISOString();
}

export function resolveDateValue(
  value:
    | { readonly kind: "date"; readonly value: string }
    | { readonly kind: "namedDate"; readonly value: "today" | "yesterday" }
    | {
        readonly kind: "relativeDate";
        readonly amount: number;
        readonly unit: "day" | "week" | "month" | "year";
      },
  effectiveAt: string,
  timeZone: string,
): CalendarDate {
  if (value.kind === "date") return parseCalendarDate(value.value)!;
  const today = calendarDateAt(effectiveAt, timeZone);
  if (value.kind === "namedDate")
    return addCalendarDate(today, value.value === "today" ? 0 : -1, "day");
  return addCalendarDate(today, value.amount, value.unit);
}

function localDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function assertTimeZone(timeZone: string): void {
  new Intl.DateTimeFormat("en", { timeZone }).format(new Date(0));
}

function utcDate(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const value = new Date(0);
  value.setUTCHours(hour, minute, second, 0);
  value.setUTCFullYear(year, monthIndex, day);
  return value;
}

function utcTimestamp(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  return utcDate(year, monthIndex, day, hour, minute, second).valueOf();
}
