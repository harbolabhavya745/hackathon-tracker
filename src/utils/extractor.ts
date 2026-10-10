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

// Attempt to parse string dates into YYYY-MM-DD
function parseDateString(str: string): string | null {
  if (!str) return null;
  const isoMatch = str.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const d = new Date(str);
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
        if (text && text.length > 50) return text;
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
  "dates": [{"label": "Round 1 Deadline", "date": "YYYY-MM-DD", "type": "deadline"}],
  "tasks": [{"title": "Submit video demo", "priority": "high"}]
}

Content to analyze:
${content.slice(0, 10000)}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
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
        return JSON.parse(rawJson);
      }
    }
  } catch (err) {
    console.warn('Gemini extraction error:', err);
  }
  return null;
}

export function extractFromText(rawText: string): ExtractedHackathon {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const text = rawText;

  // Name heuristic
  let name = lines[0] || 'New Hackathon';
  if (name.length > 70) {
    const nameMatch = text.match(/(?:hackathon|challenge|fest|con|jam|sprint|summit)\s*[:\-\—]?\s*([^\n\r\.\,]{3,50})/i);
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

  // Extract Dates
  const dates: ExtractedHackathon['dates'] = [];
  let start_date: string | null = null;
  let end_date: string | null = null;

  const dateRegex = /(?:(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})|(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4}))/gi;
  const foundDates = [...text.matchAll(dateRegex)].map(m => m[0]);

  if (foundDates.length > 0) {
    const parsed0 = parseDateString(foundDates[0]);
    if (parsed0) start_date = parsed0;
  }
  if (foundDates.length > 1) {
    const parsed1 = parseDateString(foundDates[1]);
    if (parsed1) end_date = parsed1;
  }

  // Specific milestone / deadline searches
  const submissionMatch = text.match(/(?:submission|submit|deadline|due|ends?|closes?)\s*(?:on|by|at|:)?\s*([^\n\r,;]{3,35})/i);
  if (submissionMatch) {
    const subDate = parseDateString(submissionMatch[1]);
    if (subDate) {
      dates.push({ label: 'Submission Deadline', date: subDate, type: 'deadline' });
      if (!end_date) end_date = subDate;
    }
  }

  const registrationMatch = text.match(/(?:registration|register|apply)\s*(?:deadline|closes?|ends?|by|on|:)?\s*([^\n\r,;]{3,35})/i);
  if (registrationMatch) {
    const regDate = parseDateString(registrationMatch[1]);
    if (regDate) {
      dates.push({ label: 'Registration Deadline', date: regDate, type: 'deadline' });
    }
  }

  if (start_date && !dates.some(d => d.date === start_date)) {
    dates.push({ label: 'Hackathon Starts', date: start_date, type: 'event' });
  }
  if (end_date && !dates.some(d => d.date === end_date)) {
    dates.push({ label: 'Hackathon Ends', date: end_date, type: 'event' });
  }

  // Timezone
  const tzMatch = text.match(/\b(UTC|GMT|IST|EST|EDT|PST|PDT|CST|CDT|CET|CEST|SGT|JST|AEST)(?:[+-]\d{1,2}(?::\d{2})?)?\b/i);
  const timezone = tzMatch ? tzMatch[0].toUpperCase() : 'UTC';

  // Team Size
  const teamMatch = text.match(/(?:team\s*size|members?|teams?)\s*(?:of|:)?\s*(?:up\s*to\s*)?(\d+)(?:\s*-\s*(\d+))?/i);
  let team_size_limit: number | null = null;
  if (teamMatch) {
    team_size_limit = teamMatch[2] ? parseInt(teamMatch[2], 10) : parseInt(teamMatch[1], 10);
    if (isNaN(team_size_limit) || team_size_limit <= 0) team_size_limit = null;
  }

  // Tags
  const tagKeywords = ['AI', 'ML', 'Web3', 'Blockchain', 'Fintech', 'HealthTech', 'Mobile', 'Open Source', 'Cloud', 'DevOps', 'Cybersecurity', 'IoT', 'GameDev', 'AR/VR', 'EdTech'];
  const tags = tagKeywords.filter(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(text));
  if (tags.length === 0) tags.push('General');

  // Prize Tracks
  const prize_tracks: string[] = [];
  const trackMatch = text.match(/(?:tracks?|themes?|categories?)\s*[:\-\—]\s*([^\n\r]+)/i);
  if (trackMatch) {
    const splitTracks = trackMatch[1].split(/[,|•/]/).map(t => t.trim()).filter(t => t.length > 2 && t.length < 30);
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
    prize_tracks,
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
