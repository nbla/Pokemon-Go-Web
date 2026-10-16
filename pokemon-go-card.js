// Pokemon GO Command Center v0.4 - Home Assistant custom Lovelace card
// Source: community-maintained ScrapedDuck events feed (not an official API).
class PokemonGoCardV4 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.events = [];
    this.raids = [];
    this.raidError = "";
    this.raidFetch = null;
    this.error = '';
    this.loading = true;
    this.lastFetch = null;
    this.timer = null;
    this.fetching = false;
    this.showLong = false;
    this.category = 'all';
  }

  setConfig(config) {
    this.config = { view: 'today', ...config };
    if (!['today', 'active', 'upcoming', 'raids'].includes(this.config.view)) {
      throw new Error('view must be today, active, upcoming or raids');
    }
    this.render();
    this.load();
  }
  set hass(hass) { this._hass = hass; }
  connectedCallback() {
    if (!this.timer) this.timer = setInterval(() => this.load(), 30 * 60 * 1000);
  }
  disconnectedCallback() { clearInterval(this.timer); this.timer = null; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  async load() {
    if (this.config?.view === "raids") return this.loadRaids();
    if (this.fetching) return;
    this.fetching = true;
    try {
      const response = await fetch('https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Unexpected JSON structure');
      this.events = data.map(x => this.normalize(x));
      this.error = '';
      this.lastFetch = new Date();
    } catch (error) {
      this.error = String(error.message || error);
    } finally {
      this.fetching = false;
      this.loading = false;
      this.render();
    }
  }

  async loadRaids() {
    if (this.fetching) return;
    this.fetching = true;
    try {
      const response = await fetch('https://raw.githubusercontent.com/zhenga8533/leak-duck/data/raid_bosses.json', {cache:'no-cache'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Unexpected raid JSON structure');
      const all = [];
      for (const [tier, list] of Object.entries(data)) {
        if (!Array.isArray(list)) continue;
        for (const item of list) {
          if (!item || typeof item !== 'object') continue;
          all.push({
            tier: String(tier),
            name: String(item.name || 'Unknown boss'),
            shiny: item.shiny_available === true,
            types: Array.isArray(item.types) ? item.types.map(String) : [],
            normal: item.cp_range || null,
            boosted: item.boosted_cp_range || null,
            image: typeof item.asset_url === 'string' && /^https:\/\//i.test(item.asset_url) ? item.asset_url : ''
          });
        }
      }
      if (!all.length) throw new Error('No raid bosses in the feed');
      this.raids = all;
      this.raidError = '';
      this.raidFetch = new Date();
    } catch (error) {
      this.raidError = String(error.message || error);
    } finally {
      this.fetching = false;
      this.loading = false;
      this.render();
    }
  }

  renderRaids() {
    const esc = v => this.escape(v);
  const order = t => {
  const x = String(t).toLowerCase();

  if (/tier\s*1/.test(x)) return 0;
  if (/tier\s*3/.test(x)) return 1;
  if (/tier\s*5|legendary/.test(x)) return 2;
  if (/shadow/.test(x)) return 3;
  if (/mega|primal/.test(x)) return 99;

  return 4;
};
    const groups = Object.groupBy ? Object.groupBy(this.raids, x => x.tier) : this.raids.reduce((acc,x) => ((acc[x.tier] ||= []).push(x),acc),{});
    const cp = x => x && Number.isFinite(Number(x.min)) && Number.isFinite(Number(x.max)) ? `${Math.round(Number(x.min))}–${Math.round(Number(x.max))}` : '—';
    const content = Object.keys(groups).sort((a,b) => order(a)-order(b) || a.localeCompare(b)).map(tier => `
      <section class="group"><div class="group-head"><h3>${esc(tier)} <span class="count">${groups[tier].length}</span></h3></div>
      <div class="raid-grid">${groups[tier].map(b => `<article class="raid">
        ${b.image ? `<img class="raid-img" src="${esc(b.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="raid-img placeholder">?</div>`}
        <div class="raid-body"><div class="raid-name">${esc(b.name)}</div>
        <div class="raid-types">${b.types.map(x => `<span class="type-chip">${esc(x)}</span>`).join('')}</div>
        <div class="shiny">${b.shiny ? '✨ Shiny possible' : 'Shiny not listed'}</div>
        <div class="cp-line"><span>CP</span><strong>${esc(cp(b.normal))}</strong></div>
        <div class="cp-line"><span>Boosted CP</span><strong>${esc(cp(b.boosted))}</strong></div></div>
      </article>`).join('')}</div></section>`).join('');
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;min-width:0}ha-card{padding:18px;font-family:var(--primary-font-family,Arial,sans-serif)}
      .top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}h2{font-size:22px;margin:0 0 4px}
      .muted{font-size:12px;color:var(--secondary-text-color,#777)}button{border:1px solid var(--divider-color,#ddd);background:var(--secondary-background-color,#eee);color:var(--primary-text-color,#222);padding:8px 12px;border-radius:9px;cursor:pointer}
      .group{margin-top:22px}.group-head{border-bottom:1px solid var(--divider-color,#ddd);margin-bottom:10px;padding-bottom:8px}h3{margin:0;font-size:17px}.count{font-size:12px;font-weight:normal;color:var(--secondary-text-color,#777)}
      .raid-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.raid{display:flex;gap:12px;min-width:0;border:1px solid var(--divider-color,#ddd);border-radius:12px;padding:12px}
      .raid-img{width:84px;height:84px;object-fit:contain;flex-shrink:0;background:var(--secondary-background-color,#eee);border-radius:10px}.placeholder{display:grid;place-items:center}
      .raid-body{flex:1;min-width:0}.raid-name{font-size:15px;font-weight:700;overflow-wrap:anywhere}.raid-types{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0}.type-chip{border-radius:5px;background:var(--secondary-background-color,#eee);padding:3px 6px;font-size:11px}.shiny{font-size:12px;margin:8px 0;color:var(--secondary-text-color,#777)}
      .cp-line{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--divider-color,#ddd);padding:5px 0;font-size:12px}.cp-line span{color:var(--secondary-text-color,#777)}.cp-line strong{white-space:nowrap}
      .notice{background:var(--secondary-background-color,#eee);padding:14px;border-radius:9px;margin-top:16px;font-size:13px}.foot{margin-top:20px;border-top:1px solid var(--divider-color,#ddd);padding-top:10px}
      @media(max-width:750px){.raid-grid{grid-template-columns:1fr}ha-card{padding:14px}.raid-img{width:72px;height:72px}}
    </style><ha-card><div class="top"><div><h2>Pokémon GO · Raids</h2><div class="muted">Current boss snapshot · community Leek Duck data</div></div><button id="refresh">↻ Refresh</button></div>
      ${this.raidError ? `<div class="notice">Raid feed error: ${esc(this.raidError)}${this.raids.length ? ' · showing previous results' : ''}</div>` : ''}
      ${this.loading ? '<div class="notice">Loading raids…</div>' : content || '<div class="notice">No raid bosses available.</div>'}
      <div class="foot muted">Updated ${this.raidFetch ? this.dateLabel(this.raidFetch) : 'not yet'} · Feed is a snapshot, not a verified raid rotation schedule.</div></ha-card>`;
    this.shadowRoot.getElementById('refresh').onclick = () => this.loadRaids();
  }

  escape(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  parseDate(v) {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  day(d) {
    return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Stockholm', year:'numeric', month:'2-digit', day:'2-digit'}).format(d);
  }
  dateLabel(d) {
    return d ? new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Stockholm', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}).format(d) : 'Time not published';
  }
  normalize(item) {
    const type = String(item.eventType || 'event').toLowerCase();
    const start = this.parseDate(item.start), end = this.parseDate(item.end);
    return {
      name: String(item.name || item.title || 'Unnamed event'),
      type, start, end,
      image: typeof item.image === 'string' && /^https:\/\//i.test(item.image) ? item.image : '',
      link: typeof item.link === 'string' && /^https:\/\//i.test(item.link) ? item.link : ''
    };
  }
  isLong(e) {
    const duration = e.start && e.end ? e.end - e.start : 0;
    return duration > 7 * 86400000 || /season|go-pass|research|battle-league|gbl/i.test(e.type);
  }
  isActive(e, now) { return !!(e.start && e.end && e.start <= now && e.end > now); }
  isToday(e, day) { return (e.start && this.day(e.start) === day) || (e.end && this.day(e.end) === day); }
  isPriority(e) {
    return /community|spotlight|raid-hour|raid hour|max-monday|max monday|hatch|research-day|research day|event/i.test(e.type);
  }
  categoryOptions() {
    return [
      ['all','All types'],['event','Events'],['raid','Raids'],
      ['spotlight','Spotlight'],['community','Community Day'],
      ['research','Research'],['other','Other']
    ];
  }
  matchesCategory(e) {
    if (this.category === 'all') return true;
    const hay = `${e.type} ${e.name}`.toLowerCase();
    if (this.category === 'other') return !['event','raid','spotlight','community','research'].some(x=>hay.includes(x));
    return hay.includes(this.category);
  }
  card(e, now, day) {
    const startToday = e.start && this.day(e.start) === day;
    const endToday = e.end && this.day(e.end) === day;
    const status = startToday ? 'Starts today' : endToday ? 'Ends today' : this.isActive(e, now) ? 'Ongoing' : 'Upcoming';
    const statusClass = startToday ? 'starts' : endToday ? 'ends' : '';
    const date = e.start && e.end ? `${this.dateLabel(e.start)} – ${this.dateLabel(e.end)}` : e.start ? `From ${this.dateLabel(e.start)}` : 'Date not published';
    return `<article class="event">
      ${e.image ? `<img class="poster" src="${this.escape(e.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="poster placeholder">★</div>'}
      <div class="details"><div class="chips"><span class="chip ${statusClass}">${status}</span><span class="type">${this.escape(e.type.replaceAll('-', ' '))}</span></div>
      <div class="name">${this.escape(e.name)}</div><div class="date">${this.escape(date)}</div>
      ${e.link ? `<a href="${this.escape(e.link)}" target="_blank" rel="noopener noreferrer">Event details ↗</a>` : ''}</div>
    </article>`;
  }
  section(title, subtitle, events, now, day, extra = '') {
    if (!events.length) return '';
    return `<section class="group"><div class="group-head"><h3>${this.escape(title)} <span class="count">${events.length}</span></h3>${subtitle ? `<p>${this.escape(subtitle)}</p>` : ''}</div>
      <div class="events">${events.slice(0, 120).map(e => this.card(e, now, day)).join('')}</div>${extra}</section>`;
  }
  upcomingCalendar(events, now, today) {
    const selected = events.filter(e => this.matchesCategory(e));
    if (!selected.length) return '<div class="notice">No upcoming events match this filter.</div>';
    const daysUntil = date => {
      const [y,m,d] = this.day(date).split('-').map(Number);
      const [ty,tm,td] = today.split('-').map(Number);
      return Math.round((Date.UTC(y,m-1,d) - Date.UTC(ty,tm-1,td)) / 86400000);
    };
    const buckets = [
      {name:'Today', test:n=>n===0},
      {name:'Next 7 days', test:n=>n>=1 && n<=7},
      {name:'Next 30 days', test:n=>n>=8 && n<=30},
      {name:'Later', test:n=>n>30}
    ];
    const dayTitle = d => new Intl.DateTimeFormat('en-GB', {
      timeZone:'Europe/Stockholm', weekday:'long', day:'numeric', month:'long'
    }).format(d);
    const time = d => new Intl.DateTimeFormat('sv-SE', {
      timeZone:'Europe/Stockholm', hour:'2-digit', minute:'2-digit'
    }).format(d);
    return buckets.map(bucket => {
      const list = selected.filter(e => bucket.test(daysUntil(e.start)));
      if (!list.length) return '';
      const byDate = new Map();
      for (const event of list) {
        const key = this.day(event.start);
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key).push(event);
      }
      const days = [...byDate.entries()].map(([key, items]) => `
        <div class="calendar-day">
          <h4>${this.escape(dayTitle(items[0].start))}<span class="count">${items.length} event${items.length===1?'':'s'}</span></h4>
          <div class="events">${items.map(e => this.card(e, now, today)).join('')}</div>
        </div>`).join('');
      return `<section class="group calendar-group"><div class="group-head"><h3>${bucket.name} <span class="count">${list.length}</span></h3></div>${days}</section>`;
    }).join('');
  }
  render() {
    if (!this.config) return;
    if (this.config.view === "raids") return this.renderRaids();
    const now = new Date(), today = this.day(now), view = this.config.view;
    const active = this.events.filter(e => this.isActive(e, now));
    const starts = this.events.filter(e => e.start && this.day(e.start) === today);
    const ends = this.events.filter(e => e.end && this.day(e.end) === today && !starts.includes(e));
    const upcoming = this.events.filter(e => e.start && e.start > now).sort((a,b) => a.start - b.start);
    const ongoing = active.filter(e => !starts.includes(e) && !ends.includes(e));
    const shortOngoing = ongoing.filter(e => !this.isLong(e)).sort((a,b) => (a.end || Infinity) - (b.end || Infinity));
    const longOngoing = ongoing.filter(e => this.isLong(e)).sort((a,b) => (a.end || Infinity) - (b.end || Infinity));
    const todayUpcoming = upcoming.filter(e => this.day(e.start) === today);
    const filter = xs => xs.filter(e => this.matchesCategory(e));
    let content = '';
    if (view === 'today') {
      content += this.section('Starting today', 'New activities and events', filter(starts.sort((a,b) => a.start - b.start)), now, today);
      content += this.section('Ending today', 'Last chance', filter(ends.sort((a,b) => a.end - b.end)), now, today);
      content += this.section('Happening now', 'Shorter active events', filter(shortOngoing), now, today);
      if (filter(longOngoing).length) {
        content += `<section class="group"><button class="toggle" id="long-toggle">${this.showLong ? '▾ Hide' : '▸ Show'} long-running events (${filter(longOngoing).length})</button>
          ${this.showLong ? `<div class="events">${filter(longOngoing).map(e => this.card(e,now,today)).join('')}</div>` : ''}</section>`;
      }
      if (!starts.length && !ends.length && !shortOngoing.length) content = `<div class="notice">No short events starting, ending or running today. Check the long-running section or Upcoming.</div>` + content;
    } else if (view === 'active') {
      content += this.section('Active now', 'Shorter events first', filter(active.filter(e => !this.isLong(e)).sort((a,b) => a.end - b.end)), now, today);
      content += this.section('Long-running', 'Seasons, passes and research', filter(active.filter(e => this.isLong(e)).sort((a,b) => a.end - b.end)), now, today);
    } else {
      content += this.upcomingCalendar(upcoming, now, today);
    }
    const title = {today:'Today',active:'Active',upcoming:'Upcoming',raids:'Raids'}[view];
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;min-width:0}ha-card{padding:20px;font-family:var(--primary-font-family,Arial,sans-serif)}
      .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      h2{font-size:22px;margin:0 0 4px}.muted,.date,.type,.group-head p{color:var(--secondary-text-color,#777);font-size:12px}
      .toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0 18px}
      select,button{background:var(--secondary-background-color,#eee);color:var(--primary-text-color,#222);border:1px solid var(--divider-color,#ddd);border-radius:9px;padding:8px 12px;cursor:pointer}
      .stats{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.stat{background:var(--secondary-background-color,#eee);border-radius:9px;padding:9px 12px;font-size:12px}.stat strong{font-size:16px;margin-right:5px}
      .group{margin-top:24px}.group-head{border-bottom:1px solid var(--divider-color,#ddd);padding-bottom:9px;margin-bottom:6px}
      h3{font-size:17px;margin:0}.group-head p{margin:5px 0 0}.count{font-size:12px;font-weight:normal;color:var(--secondary-text-color,#777)}
      .calendar-day{margin:18px 0 26px}.calendar-day h4{display:flex;align-items:center;gap:10px;font-size:14px;margin:0 0 6px;text-transform:capitalize;border-left:3px solid var(--primary-color,#03a9f4);padding:6px 10px;background:var(--secondary-background-color,#eee);border-radius:0 7px 7px 0}
      .calendar-group{margin-top:22px}.calendar-group .group-head{margin-bottom:14px}
      .events{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}
      .event{display:flex;align-items:flex-start;gap:12px;padding:12px 4px;border-bottom:1px solid var(--divider-color,#ddd);min-width:0}
      .poster{width:76px;height:76px;flex-shrink:0;object-fit:contain;border-radius:9px;background:var(--secondary-background-color,#eee)}
      .placeholder{display:grid;place-items:center;font-size:28px}.details{min-width:0}.name{font-weight:650;line-height:1.35;margin:5px 0;font-size:14px;overflow-wrap:anywhere}
      .chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.chip{background:var(--secondary-background-color,#eee);padding:3px 6px;border-radius:5px;font-size:11px}.starts{background:#d9f4e4;color:#17623a}.ends{background:#ffead5;color:#88420a}
      .type{text-transform:capitalize}.date{line-height:1.45}.details a{display:inline-block;margin-top:7px;font-size:12px;color:var(--primary-color,#03a9f4);text-decoration:none}
      .toggle{width:100%;text-align:left}.notice{padding:14px;border-radius:9px;background:var(--secondary-background-color,#eee);font-size:13px}
      .foot{margin-top:22px;border-top:1px solid var(--divider-color,#ddd);padding-top:12px}
      @media(max-width:760px){.events{grid-template-columns:1fr}ha-card{padding:14px}.poster{width:70px;height:70px}}
    </style><ha-card>
      <div class="top"><div><h2>Pokémon GO · ${title}</h2><div class="muted">${this.escape(today)} · ScrapedDuck community data</div></div><button id="refresh">↻ Refresh</button></div>
      <div class="stats"><div class="stat"><strong>${starts.length}</strong> starts today</div><div class="stat"><strong>${ends.length}</strong> ends today</div><div class="stat"><strong>${active.length}</strong> active</div><div class="stat"><strong>${upcoming.length}</strong> upcoming</div></div>
      <div class="toolbar"><label class="muted" for="category">Filter</label><select id="category">${this.categoryOptions().map(([v,t]) => `<option value="${v}" ${this.category===v?'selected':''}>${t}</option>`).join('')}</select></div>
      ${this.error ? `<div class="notice">Fetch failed: ${this.escape(this.error)}${this.events.length ? ' · showing last fetched data' : ''}</div>` : ''}
      ${this.loading ? '<div class="notice">Loading events…</div>' : content || '<div class="notice">No matching events with known dates.</div>'}
      <div class="foot muted">Updated ${this.lastFetch ? this.dateLabel(this.lastFetch) : 'not yet'} · Times: Europe/Stockholm · Missing dates are not guessed</div>
    </ha-card>`;
    this.shadowRoot.getElementById('refresh').onclick = () => this.load();
    this.shadowRoot.getElementById('category').onchange = e => { this.category = e.target.value; this.render(); };
    const toggle = this.shadowRoot.getElementById('long-toggle');
    if (toggle) toggle.onclick = () => { this.showLong = !this.showLong; this.render(); };
  }
}
if (!customElements.get('pokemon-go-card')) customElements.define('pokemon-go-card', PokemonGoCardV4);
window.customCards = window.customCards || [];
if (!window.customCards.some(x => x.type === 'pokemon-go-card')) window.customCards.push({type:'pokemon-go-card',name:'Pokémon GO Command Center',description:'ScrapedDuck event dashboard'});
