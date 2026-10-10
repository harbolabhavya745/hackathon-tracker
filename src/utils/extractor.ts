export interface ExtractedHackathon {
  name: string;
  description: string;
  tags: string[];
  website_link: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  team_size_limit: number | null;
  prize_tracks: string[];
  dates: Array<{
    label: string;
    date: string;
    type: 'event' | 'deadline' | 'milestone' | 'info';
  }>;
  tasks: Array<{
    title: string;
    priority: 'high' | 'med' | 'low';
    assigned_to?: string;
  }>;
}

// Standard date format helper (YYYY-MM-DD)
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Robust date parser supporting international formats, Indian DD/MM/YYYY, named months, and times
export function parseDateString(str: any): string | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || s === 'null' || s === 'undefined') return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 2. Day-Month-Year: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3. Named month with Day and optional Year (e.g. '15 Oct 2026', '15th October, 2026', 'Oct 15, 2026', '15 Oct 26')
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
  };
  const namedMatch = s.match(/(?:(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]{3,9})(?:,?\s+(\d{2,4}))?)|(?:([a-zA-Z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{2,4}))?)/i);
  if (namedMatch) {
    const day = namedMatch[1] || namedMatch[5];
    const monStr = (namedMatch[2] || namedMatch[4]).toLowerCase().slice(0, 3);
    let year = namedMatch[3] || namedMatch[6] || new Date().getFullYear();
    if (String(year).length === 2) year = '20' + year;
    const monNum = months[monStr];
    if (day && monNum) {
      return `${year}-${String(monNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 4. Native JS Date fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return toIsoDate(d);
  }
  return null;
}

// Fetch web page with multiple CORS proxies
async function fetchWithProxies(url: string): Promise<string> {
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  for (const proxy of proxies) {
    try {
      const resp = await fetch(proxy, { headers: { 'Accept': 'text/html,application/json' } });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50 && !text.includes('Cloudflare') && !text.includes('Just a moment...')) {
          return text;
        }
      }
    } catch {
      // try next proxy
    }
  }
  return '';
}

// Gemini AI Extractor (if API key provided in localStorage or env)
export async function extractWithGemini(content: string, apiKey?: string): Promise<ExtractedHackathon | null> {
  const key = apiKey || localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `You are a hackathon data extraction engine. Analyze the following webpage text, announcement, or URL content and return a strict JSON object with:
{
  "name": "Hackathon Name",
  "description": "Brief summary",
  "tags": ["AI", "Web3", etc],
  "website_link": "https://...",
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "timezone": "IST / UTC / EST etc",
  "team_size_limit": number or null,
  "prize_tracks": ["Track 1", "Track 2"],
  "dates": [{"label": "Round 1 / Submission Deadline", "date": "YYYY-MM-DD", "type": "deadline"}],
  "tasks": [{"title": "Submit video demo", "priority": "high"}]
}

Important formatting rules:
- Dates MUST be formatted strictly as YYYY-MM-DD (e.g. 2026-10-15).
- Extract all rounds, milestones, registration deadlines, and tracks mentioned in the text.
- If no year is specified in the text, assume year 2026.

Content to analyze:
${content.slice(0, 12000)}`;

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          
          // Sanitize dates into strict YYYY-MM-DD
          const sDate = parseDateString(parsed.start_date);
          const eDate = parseDateString(parsed.end_date);
          const sanitizedDates = Array.isArray(parsed.dates) 
            ? parsed.dates.map((d: any) => ({
                label: d.label || 'Milestone',
                date: parseDateString(d.date) || d.date,
                type: (d.type || 'deadline') as 'event' | 'deadline' | 'milestone' | 'info'
              })).filter((d: any) => parseDateString(d.date) !== null)
            : [];

          if (sDate && !sanitizedDates.some((d: any) => d.date === sDate)) {
            sanitizedDates.push({ label: 'Hackathon Starts', date: sDate, type: 'event' });
          }
          if (eDate && !sanitizedDates.some((d: any) => d.date === eDate)) {
            sanitizedDates.push({ label: 'Submission Deadline', date: eDate, type: 'deadline' });
          }

          return {
            name: parsed.name || 'Extracted Hackathon',
            description: parsed.description || '',
            tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : ['Hackathon'],
            website_link: parsed.website_link || '',
            start_date: sDate,
            end_date: eDate,
            timezone: parsed.timezone || 'IST',
            team_size_limit: typeof parsed.team_size_limit === 'number' ? parsed.team_size_limit : null,
            prize_tracks: Array.isArray(parsed.prize_tracks) ? parsed.prize_tracks : [],
            dates: sanitizedDates,
            tasks: Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : [
              { title: 'Form team & finalize idea', priority: 'high' as const },
              { title: 'Build core prototype / MVP', priority: 'high' as const },
              { title: 'Submit final project', priority: 'high' as const }
            ]
          };
        }
      }
    } catch (err) {
      console.warn(`Gemini extraction error on ${model}:`, err);
    }
  }
  return null;
}

export function extractFromText(rawText: string): ExtractedHackathon {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const text = rawText;

  // Name heuristic
  let name = lines[0] || 'New Hackathon';
  if (name.length > 70) {
    const nameMatch = text.match(/(?:hackathon|ideathon|challenge|fest|con|jam|sprint|summit)\s*[:\-\—]?\s*([^\n\r\.\,]{3,50})/i);
    if (nameMatch) name = nameMatch[0].trim();
    else name = name.slice(0, 50) + '...';
  }

  // Description
  let description = '';
  if (lines.length > 1) {
    description = lines.slice(1, 4).join(' ').slice(0, 300);
  }

  // Extract Website Link
  const urlMatch = text.match(/https?:\/\/[^\s\)\"\'>]+/i);
  const website_link = urlMatch ? urlMatch[0] : '';

  // Extract Dates using multiple regex patterns
  const dates: ExtractedHackathon['dates'] = [];
  const foundDates: string[] = [];

  const datePatterns = [
    /(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-zA-Z]*(?:,?\s+\d{2,4})?)/gi,
    /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-zA-Z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{2,4})?)/gi,
    /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g,
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g
  ];

  for (const pattern of datePatterns) {
    const matches = [...text.matchAll(pattern)].map(m => m[0]);
    for (const m of matches) {
      const parsed = parseDateString(m);
      if (parsed && !foundDates.includes(parsed)) {
        foundDates.push(parsed);
      }
    }
  }

  let start_date: string | null = foundDates[0] || null;
  let end_date: string | null = foundDates.length > 1 ? foundDates[foundDates.length - 1] : null;

  // Search for specific milestone / round deadlines
  const roundMatches = [...text.matchAll(/(?:round\s*\d+|phase\s*\d+|milestone\s*\d+|registration|submission|finals?|demo\s*day)\s*[:\-\—]?\s*([^\n\r,;]{3,40})/gi)];
  for (const rMatch of roundMatches) {
    const fullMatched = rMatch[0];
    const subDate = parseDateString(fullMatched) || parseDateString(rMatch[1]);
    if (subDate) {
      const label = fullMatched.split(/[:\-\—]/)[0].trim().replace(/\b\w/g, l => l.toUpperCase());
      if (!dates.some(d => d.date === subDate)) {
        dates.push({ label, date: subDate, type: 'deadline' });
      }
    }
  }

  if (start_date && !dates.some(d => d.date === start_date)) {
    dates.push({ label: 'Hackathon Starts', date: start_date, type: 'event' });
  }
  if (end_date && !dates.some(d => d.date === end_date)) {
    dates.push({ label: 'Final Submission Deadline', date: end_date, type: 'deadline' });
  }

  // Timezone
  const tzMatch = text.match(/\b(UTC|GMT|IST|EST|EDT|PST|PDT|CST|CDT|CET|CEST|SGT|JST|AEST)(?:[+-]\d{1,2}(?::\d{2})?)?\b/i);
  const timezone = tzMatch ? tzMatch[0].toUpperCase() : 'IST';

  // Team Size
  const teamMatch = text.match(/(?:team\s*size|members?|teams?)\s*(?:of|:)?\s*(?:up\s*to\s*)?(\d+)(?:\s*-\s*(\d+))?/i);
  let team_size_limit: number | null = null;
  if (teamMatch) {
    team_size_limit = teamMatch[2] ? parseInt(teamMatch[2], 10) : parseInt(teamMatch[1], 10);
    if (isNaN(team_size_limit) || team_size_limit <= 0) team_size_limit = null;
  }

  // Tags
  const tagKeywords = ['AI', 'ML', 'Web3', 'Blockchain', 'Fintech', 'HealthTech', 'Mobile', 'Open Source', 'Cloud', 'DevOps', 'Cybersecurity', 'IoT', 'GameDev', 'AR/VR', 'EdTech', 'SpaceTech'];
  const tags = tagKeywords.filter(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(text));
  if (tags.length === 0) tags.push('Hackathon');

  // Prize Tracks
  const prize_tracks: string[] = [];
  const trackMatch = text.match(/(?:tracks?|themes?|categories?|domains?)\s*[:\-\—]\s*([^\n\r]+)/i);
  if (trackMatch) {
    const splitTracks = trackMatch[1].split(/[,|•/]/).map(t => t.trim()).filter(t => t.length > 2 && t.length < 35);
    prize_tracks.push(...splitTracks.slice(0, 5));
  }

  // Default tasks
  const tasks = [
    { title: 'Form team and finalize idea', priority: 'high' as const },
    { title: 'Set up GitHub repository and dev environment', priority: 'med' as const },
    { title: 'Build core minimum viable product (MVP)', priority: 'high' as const },
    { title: 'Record 2-3 min project demo video', priority: 'high' as const },
    { title: 'Prepare project documentation and pitch slides', priority: 'med' as const },
    { title: 'Submit project before final deadline', priority: 'high' as const },
  ];

  return {
    name,
    description,
    tags,
    website_link,
    start_date,
    end_date,
    timezone,
    team_size_limit,
    prize_tracks: prize_tracks.length ? prize_tracks : ['Main Track'],
    dates,
    tasks
  };
}


export async function extractFromUrl(url: string, apiKey?: string): Promise<ExtractedHackathon> {
  const cleanUrl = url.trim();

  // 1. Check if Devfolio Direct API is applicable
  const devfolioMatch = cleanUrl.match(/(?:([a-zA-Z0-9_-]+)\.devfolio\.co|devfolio\.co\/hackathons\/([a-zA-Z0-9_-]+))/i);
  if (devfolioMatch) {
    const slug = devfolioMatch[1] || devfolioMatch[2];
    if (slug && slug !== 'www' && slug !== 'discover') {
      try {
        const apiUrl = `https://api.devfolio.co/api/hackathons/${slug}`;
        const jsonText = await fetchWithProxies(apiUrl);
        if (jsonText) {
          const data = JSON.parse(jsonText);
          const h = data.hackathon || data;
          if (h && h.name) {
            const startsAt = h.starts_at ? toIsoDate(new Date(h.starts_at)) : null;
            const endsAt = h.ends_at ? toIsoDate(new Date(h.ends_at)) : null;
            const regEndsAt = h.applications_close_at ? toIsoDate(new Date(h.applications_close_at)) : null;

            const dates: ExtractedHackathon['dates'] = [];
            if (regEndsAt) dates.push({ label: 'Registration Closes', date: regEndsAt, type: 'deadline' });
            if (startsAt) dates.push({ label: 'Hacking Starts', date: startsAt, type: 'event' });
            if (endsAt) dates.push({ label: 'Submissions Close', date: endsAt, type: 'deadline' });

            const prize_tracks = (h.tracks || []).map((t: any) => t.name || t.title).filter(Boolean);

            return {
              name: h.name,
              description: h.tagline || h.description || `Hackathon hosted on Devfolio (${h.name})`,
              tags: ['Devfolio', ...(h.themes || []).map((th: any) => th.name || th).slice(0, 3)],
              website_link: cleanUrl,
              start_date: startsAt,
              end_date: endsAt,
              timezone: 'IST',
              team_size_limit: h.max_team_size || 4,
              prize_tracks: prize_tracks.length ? prize_tracks : ['Main Track'],
              dates,
              tasks: [
                { title: 'Join Hackathon Discord / Telegram channel', priority: 'high' },
                { title: 'Create repository & deploy skeleton', priority: 'med' },
                { title: 'Develop core functional MVP', priority: 'high' },
                { title: 'Record 2-min demo video & prepare pitch', priority: 'high' },
                { title: 'Submit project on Devfolio', priority: 'high' }
              ]
            };
          }
        }
      } catch (e) {
        console.warn('Devfolio API parse failed, continuing with full page extractor', e);
      }
    }
  }

  // 2. Fetch full HTML via multi-proxy
  const html = await fetchWithProxies(cleanUrl);

  // 3. Try Gemini AI if available
  if (html) {
    const aiResult = await extractWithGemini(html, apiKey);
    if (aiResult && aiResult.name) {
      aiResult.website_link = cleanUrl;
      return aiResult;
    }
  }

  // 4. Parse DOM & Next.js / JSON-LD structured data
  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Check JSON-LD
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(jsonLdScripts)) {
      try {
        const data = JSON.parse(script.textContent || '');
        const event = Array.isArray(data) ? data.find(d => d['@type'] === 'Event' || d['@type'] === 'Hackathon') : data;
        if (event && (event.name || event.title)) {
          const startDate = event.startDate ? toIsoDate(new Date(event.startDate)) : null;
          const endDate = event.endDate ? toIsoDate(new Date(event.endDate)) : null;
          return {
            name: event.name || event.title,
            description: event.description || '',
            tags: ['Hackathon'],
            website_link: cleanUrl,
            start_date: startDate,
            end_date: endDate,
            timezone: 'UTC',
            team_size_limit: 4,
            prize_tracks: [],
            dates: [
              ...(startDate ? [{ label: 'Starts', date: startDate, type: 'event' as const }] : []),
              ...(endDate ? [{ label: 'Ends / Deadline', date: endDate, type: 'deadline' as const }] : [])
            ],
            tasks: [
              { title: 'Review hackathon guidelines', priority: 'high' },
              { title: 'Build MVP', priority: 'high' },
              { title: 'Submit final project', priority: 'high' }
            ]
          };
        }
      } catch {}
    }

    // Check Next.js __NEXT_DATA__
    const nextDataEl = doc.getElementById('__NEXT_DATA__');
    if (nextDataEl) {
      try {
        const nextData = JSON.parse(nextDataEl.textContent || '');
        const pageProps = nextData?.props?.pageProps;
        const hackathonData = pageProps?.hackathon || pageProps?.data || pageProps;
        if (hackathonData && (hackathonData.name || hackathonData.title)) {
          const name = hackathonData.name || hackathonData.title;
          const desc = hackathonData.tagline || hackathonData.description || '';
          const sDate = hackathonData.starts_at || hackathonData.start_date;
          const eDate = hackathonData.ends_at || hackathonData.end_date;
          const start_date = sDate ? toIsoDate(new Date(sDate)) : null;
          const end_date = eDate ? toIsoDate(new Date(eDate)) : null;

          return {
            name,
            description: typeof desc === 'string' ? desc.slice(0, 300) : '',
            tags: ['Hackathon'],
            website_link: cleanUrl,
            start_date,
            end_date,
            timezone: 'UTC',
            team_size_limit: hackathonData.max_team_size || 4,
            prize_tracks: [],
            dates: [
              ...(start_date ? [{ label: 'Starts', date: start_date, type: 'event' as const }] : []),
              ...(end_date ? [{ label: 'Submission Deadline', date: end_date, type: 'deadline' as const }] : [])
            ],
            tasks: [
              { title: 'Form team & finalize project scope', priority: 'high' },
              { title: 'Build core MVP', priority: 'high' },
              { title: 'Submit final entry', priority: 'high' }
            ]
          };
        }
      } catch {}
    }

    // OpenGraph & Meta Tags
    const getMeta = (prop: string) => {
      const el = doc.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
      return el ? el.getAttribute('content') || '' : '';
    };

    const ogTitle = getMeta('og:title') || doc.title || '';
    const ogDesc = getMeta('og:description') || getMeta('description') || '';
    const eventStartTime = getMeta('event:start_time') || getMeta('start_time');
    const eventEndTime = getMeta('event:end_time') || getMeta('end_time');
    const fullBodyText = doc.body ? doc.body.innerText || doc.body.textContent || '' : '';

    const extracted = extractFromText(`${ogTitle}\n${ogDesc}\n${cleanUrl}\n${fullBodyText.slice(0, 5000)}`);
    extracted.website_link = cleanUrl;
    if (ogTitle) {
      extracted.name = ogTitle.split(/[-|–—|]/)[0].trim() || ogTitle;
    }
    if (ogDesc) {
      extracted.description = ogDesc;
    }
    if (eventStartTime) {
      const s = parseDateString(eventStartTime);
      if (s) {
        extracted.start_date = s;
        if (!extracted.dates.some(d => d.date === s)) {
          extracted.dates.push({ label: 'Hackathon Starts', date: s, type: 'event' });
        }
      }
    }
    if (eventEndTime) {
      const e = parseDateString(eventEndTime);
      if (e) {
        extracted.end_date = e;
        if (!extracted.dates.some(d => d.date === e)) {
          extracted.dates.push({ label: 'Submission Deadline', date: e, type: 'deadline' });
        }
      }
    }
    return extracted;
  }

  // 5. Fallback from clean URL slug
  try {
    const urlObj = new URL(cleanUrl);
    const pathname = urlObj.pathname.replace(/\/+$/, '');
    const rawSlug = pathname.split('/').pop() || urlObj.hostname;
    const cleanSlug = rawSlug.split('?')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return {
      name: cleanSlug || 'Extracted Hackathon',
      description: `Imported from ${urlObj.hostname}`,
      tags: ['Hackathon'],
      website_link: cleanUrl,
      start_date: null,
      end_date: null,
      timezone: 'UTC',
      team_size_limit: 4,
      prize_tracks: ['Main Track'],
      dates: [],
      tasks: [
        { title: 'Form team & finalize project concept', priority: 'high' },
        { title: 'Set up GitHub repository & starter code', priority: 'med' },
        { title: 'Build functional prototype', priority: 'high' },
        { title: 'Record 2-min demo video', priority: 'high' },
        { title: 'Submit project before deadline', priority: 'high' }
      ]
    };
  } catch {
    return extractFromText(cleanUrl);
  }
}
