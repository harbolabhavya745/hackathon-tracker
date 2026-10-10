import { Hackathon, DateItem } from '../types';

// Format date to iCalendar UTC timestamp format (YYYYMMDDTHHmmssZ) or date format (YYYYMMDD)
function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr.replace(/[-:]/g, '');
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function generateIcsContent(hackathon: Hackathon, dates: DateItem[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hackathon Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${hackathon.name} - Deadlines & Schedule`
  ];

  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Add overall hackathon event
  if (hackathon.start_date) {
    const dtStart = formatIcsDate(hackathon.start_date);
    const dtEnd = hackathon.end_date ? formatIcsDate(hackathon.end_date) : dtStart;

    lines.push(
      'BEGIN:VEVENT',
      `UID:hack-${hackathon.id}@hackathontracker`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:🏆 ${hackathon.name}`,
      `DESCRIPTION:${(hackathon.description || '').replace(/\n/g, '\\n')} ${hackathon.website_link ? '\\nLink: ' + hackathon.website_link : ''}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${hackathon.name} starts soon!`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  // Add individual milestone and deadline dates
  dates.forEach(d => {
    const dt = formatIcsDate(d.date);
    const isDeadline = d.type === 'deadline';
    const icon = isDeadline ? '⏰ [DEADLINE]' : '📅 [EVENT]';

    lines.push(
      'BEGIN:VEVENT',
      `UID:date-${d.id}@hackathontracker`,
      `DTSTAMP:${nowStr}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dt}`,
      `SUMMARY:${icon} ${d.label} - ${hackathon.name}`,
      `DESCRIPTION:${hackathon.name} - ${d.label} (${d.type})\\nWebsite: ${hackathon.website_link || 'N/A'}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      isDeadline ? 'TRIGGER:-PT6H' : 'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${d.label} (${hackathon.name})`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcsFile(hackathon: Hackathon, dates: DateItem[]) {
  const content = generateIcsContent(hackathon, dates);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = hackathon.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `${safeName}-schedule.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(title: string, dateStr: string, description: string = '', detailsUrl: string = ''): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const cleanDate = dateStr.replace(/[-:]/g, '');
  const datesParam = `${cleanDate}/${cleanDate}`;
  const textParam = encodeURIComponent(title);
  const descParam = encodeURIComponent(`${description}${detailsUrl ? '\n' + detailsUrl : ''}`);

  return `${base}&text=${textParam}&dates=${datesParam}&details=${descParam}`;
}
