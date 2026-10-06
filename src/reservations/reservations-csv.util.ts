import { Reservation } from './models/Reservation';

// Semicolon + UTF-8 BOM: this is what Excel needs to open the file correctly
// (č, ć, š, ž, đ intact, columns split) with Serbian regional settings.
const DELIMITER = ';';
const LINE_BREAK = '\r\n';
const BOM = '﻿';
const TIMEZONE = 'Europe/Belgrade';

type ExportRow = Reservation & { isDuplicateTrip: boolean };

const HEADERS = [
  'Prezime i ime',
  'Email',
  'Telefon',
  'Polazak',
  'Datum putovanja',
  'Vreme polaska',
  'Broj mesta',
  'Napomena',
  'Poslato',
  'Ponovljena rezervacija',
];

// A leading = + - @ (or tab / CR) makes Excel and Sheets run the cell as a
// formula. Names, emails and notes come from the public booking form, so a
// crafted value could otherwise execute in the admin's spreadsheet.
const FORMULA_START = /^[=+\-@\t\r]/;

const quoteIfNeeded = (text: string) =>
  /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;

// Free text from users: neutralise formula starts, then quote.
const textCell = (value: string | null | undefined) => {
  const text = value ?? '';

  return quoteIfNeeded(FORMULA_START.test(text) ? `'${text}` : text);
};

const PHONE_PATTERN = /^\+?[\d\s/().-]+$/;

// Excel drops the leading zero of a bare 0631234567. Writing it as the text
// formula ="0631234567" keeps it (Excel, Sheets and LibreOffice all show the
// plain number). Only done for phone-looking values, so nothing else can ride
// along inside the formula.
const phoneCell = (phone: string) =>
  PHONE_PATTERN.test(phone.trim())
    ? quoteIfNeeded(`="${phone.trim()}"`)
    : textCell(phone);

// "2026-10-12" -> "12.10.2026"
const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');

  return `${day}.${month}.${year}`;
};

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// -> "06.10.2026 12:40" in Belgrade time
const formatSubmittedAt = (date: Date) => {
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
};

export const buildReservationsCsv = (reservations: ExportRow[]) => {
  const lines = reservations.map((reservation) =>
    [
      textCell(reservation.fullName),
      textCell(reservation.email),
      phoneCell(reservation.phone),
      textCell(reservation.startingLocation),
      formatDate(reservation.travelDate),
      reservation.travelTime,
      String(reservation.numberOfTickets),
      textCell(reservation.note),
      formatSubmittedAt(new Date(reservation.createdAt)),
      reservation.isDuplicateTrip ? 'Da' : 'Ne',
    ].join(DELIMITER),
  );

  return (
    BOM + [HEADERS.join(DELIMITER), ...lines].join(LINE_BREAK) + LINE_BREAK
  );
};
