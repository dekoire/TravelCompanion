import {
  DemoGenerator, createPictureBook, type CreateBookInput,
} from '@abg/picturebook';
import {
  READING_RULES, composeImagePrompt, planPages, readingLevelForAge,
  spreadSentences, spreadWordCount, validatePictureBook,
  type PbIssue, type ReadingLevel,
} from '@abg/domain';
import { renderSpreadPlaceholder, spreadDataUri } from '@abg/render';
import type { PictureBookPlan, Spread } from '@abg/schemas';

/** Vorschau-Oberflaeche. Die gesamte Fachlogik kommt aus den Paketen. */

const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

interface State {
  plan: PictureBookPlan | null;
  pageCount: 24 | 32 | 40 | 48;
  readingLevel: ReadingLevel;
  selected: number | null;
}

const state: State = { plan: null, pageCount: 32, readingLevel: 'pre_reader', selected: null };

const STORE_KEY = 'abg.picturebook.draft.v1';

function save(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      plan: state.plan, pageCount: state.pageCount, readingLevel: state.readingLevel,
      form: readForm(),
    }));
  } catch { /* privates Fenster, blockierter Speicher — kein Problem */ }
}

function restore(): boolean {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as { plan: PictureBookPlan; pageCount: State['pageCount'];
      readingLevel: ReadingLevel; form: Record<string, string> };
    if (!d?.plan?.spreads?.length) return false;
    state.plan = d.plan;
    state.pageCount = d.pageCount;
    state.readingLevel = d.readingLevel;
    for (const [k, v] of Object.entries(d.form ?? {})) {
      const el = document.getElementById(k) as HTMLInputElement | null;
      if (el) el.value = v;
    }
    return true;
  } catch { return false; }
}

const FORM_IDS = ['idea', 'heroName', 'heroKind', 'companionName', 'companionKind',
  'place', 'goal', 'targetAge', 'pageCount', 'medium', 'paletteHue'] as const;

function readForm(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of FORM_IDS) out[id] = ($(id) as HTMLInputElement).value;
  return out;
}

// ─── Erzeugen ────────────────────────────────────────────────────────────────

async function generate(): Promise<void> {
  const f = readForm();
  const btn = $<HTMLButtonElement>('generate');
  btn.disabled = true;
  btn.textContent = 'Wird gesetzt …';

  const overrides: NonNullable<CreateBookInput['overrides']> = {};
  if (f['heroName']) overrides.heroName = f['heroName'];
  if (f['heroKind']) overrides.heroKind = f['heroKind'];
  if (f['companionName']) overrides.companionName = f['companionName'];
  if (f['companionKind']) overrides.companionKind = f['companionKind'];
  if (f['place']) overrides.place = f['place'];
  if (f['goal']) overrides.goal = f['goal'];

  const input: CreateBookInput = {
    prompt: f['idea'] ?? '',
    pageCount: Number(f['pageCount']) as State['pageCount'],
    targetAge: (f['targetAge'] ?? '6+') as CreateBookInput['targetAge'],
    medium: (f['medium'] ?? 'watercolor') as CreateBookInput['medium'],
    paletteHue: Number(f['paletteHue'] ?? 120),
    overrides,
  };

  try {
    const result = await createPictureBook(input, new DemoGenerator());
    state.plan = result.plan;
    state.pageCount = result.pageCount;
    state.readingLevel = result.readingLevel;
    state.selected = null;
    renderAll();
    save();
    $('book').hidden = false;
    $('book').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    $('report').innerHTML = `<p class="issue issue-block">Konnte das Buch nicht setzen: `
      + `${escapeHtml(String((err as Error).message))}</p>`;
    $('book').hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Bilderbuch setzen';
  }
}

// ─── Darstellung ─────────────────────────────────────────────────────────────

function renderAll(): void {
  const plan = state.plan;
  if (!plan) return;

  const v = validatePictureBook(plan, {
    readingLevel: state.readingLevel, pageCount: state.pageCount,
  });
  const pages = planPages(state.pageCount);
  const rules = READING_RULES[state.readingLevel];

  $('bookTitle').textContent = plan.title;
  $('bookPremise').textContent = plan.premise;

  const blockers = v.issues.filter((i) => i.severity === 'block').length;
  const warns = v.issues.filter((i) => i.severity === 'warn').length;
  const infos = v.issues.filter((i) => i.severity === 'info').length;

  $('stats').innerHTML = [
    stat('Seiten', String(state.pageCount), 'Druckbogen'),
    stat('Doppelseiten', String(v.stats.spreads), `S. ${pages.firstStoryPage}–${pages.spreadPages.at(-1)?.[1]}`),
    stat('Wörter gesamt', String(v.stats.totalWords), `Ø ${v.stats.avgWordsPerSpread} je Seite`),
    stat('Lesestufe', rules.ageLabel, `${rules.wordsPerSpread[0]}–${rules.wordsPerSpread[1]} Wörter`),
    stat('Layouts', String(v.stats.layoutsUsed), 'verschiedene'),
    stat('Figuren', String(plan.characters.length), 'mit Bildbeschreiber'),
  ].join('');

  $('verdict').innerHTML =
    `<span class="chip ${blockers ? 'chip-stop' : 'chip-ok'}">${blockers
      ? `${blockers} Blocker` : 'Druckfähig'}</span>`
    + (warns ? `<span class="chip chip-warn">${warns} Warnung${warns === 1 ? '' : 'en'}</span>` : '')
    + (infos ? `<span class="chip chip-note">${infos} Hinweis${infos === 1 ? '' : 'e'}</span>` : '');

  $('report').innerHTML = v.issues.length === 0
    ? '<p class="empty">Keine Befunde. Alle Prüfungen bestanden.</p>'
    : v.issues.map(issueHtml).join('');

  $('characters').innerHTML = plan.characters.map((c) => `
    <li class="char">
      <span class="swatch" style="background:hsl(${c.paletteSeed} 62% 58%)" aria-hidden="true"></span>
      <div>
        <strong>${escapeHtml(c.name)}</strong>
        <span class="char-role">${c.role === 'protagonist' ? 'Hauptfigur' : 'Begleitung'}</span>
        <p class="char-desc">${escapeHtml(c.visualDescriptor)}</p>
      </div>
    </li>`).join('');

  renderSheet(v.issues);
  if (state.selected !== null) renderEditor(state.selected);
}

function stat(label: string, value: string, sub: string): string {
  return `<div class="stat"><dt>${label}</dt><dd>${escapeHtml(value)}</dd>`
    + `<p>${escapeHtml(sub)}</p></div>`;
}

function issueHtml(i: PbIssue): string {
  const where = i.spreadIndex ? `Doppelseite ${i.spreadIndex}` : 'Ganzes Buch';
  return `<div class="issue issue-${i.severity}"${i.spreadIndex ? ` data-goto="${i.spreadIndex}"` : ''}>
    <div class="issue-head"><span class="issue-where">${where}</span>
      <code>${i.code}</code></div>
    <p>${escapeHtml(i.message)}</p>
    ${i.hint ? `<p class="issue-hint">${escapeHtml(i.hint)}</p>` : ''}
  </div>`;
}

function renderSheet(issues: PbIssue[]): void {
  const plan = state.plan!;
  const bySpread = new Map<number, PbIssue[]>();
  for (const i of issues) {
    if (i.spreadIndex === null) continue;
    const list = bySpread.get(i.spreadIndex) ?? [];
    list.push(i);
    bySpread.set(i.spreadIndex, list);
  }

  $('sheet').innerHTML = plan.spreads.map((s) => {
    const mine = bySpread.get(s.index) ?? [];
    const worst = mine.some((i) => i.severity === 'block') ? 'block'
      : mine.some((i) => i.severity === 'warn') ? 'warn'
      : mine.length ? 'info' : '';
    return `<figure class="proof${state.selected === s.index ? ' is-selected' : ''}" data-spread="${s.index}" tabindex="0">
      <img src="${spreadDataUri(renderSpreadPlaceholder(s, plan))}" alt="Doppelseite ${s.index}: ${escapeHtml(s.beat)}" loading="lazy">
      <figcaption>
        <span class="proof-no">S. ${s.pages[0]}–${s.pages[1]}</span>
        <span class="proof-beat">${escapeHtml(s.beat)}</span>
        ${worst ? `<span class="dot dot-${worst}" title="${mine.length} Befund(e)"></span>` : ''}
      </figcaption>
    </figure>`;
  }).join('');
}

// ─── Editor ──────────────────────────────────────────────────────────────────

const LAYOUTS: Array<[string, string]> = [
  ['full_bleed', 'randlos'], ['text_left', 'Text links'], ['text_right', 'Text rechts'],
  ['text_bottom', 'Text unten'], ['vignette', 'Vignette'], ['spot', 'Spot'],
];
const ANCHORS: Array<[string, string]> = [
  ['below_image', 'unter dem Bild'], ['bottom_left', 'unten links'],
  ['bottom_right', 'unten rechts'], ['top_left', 'oben links'],
  ['top_right', 'oben rechts'], ['center', 'Mitte'],
];
const CAMERAS: Array<[string, string]> = [
  ['extreme_wide', 'sehr weite Totale'], ['wide', 'Totale'], ['medium', 'Halbtotale'],
  ['close', 'Nah'], ['extreme_close', 'Detail'],
];
const TIMES: Array<[string, string]> = [
  ['morning', 'Morgen'], ['midday', 'Mittag'], ['afternoon', 'Nachmittag'],
  ['evening', 'Abend'], ['night', 'Nacht'],
];

function opts(list: Array<[string, string]>, current: string): string {
  return list.map(([v, l]) =>
    `<option value="${v}"${v === current ? ' selected' : ''}>${l}</option>`).join('');
}

function renderEditor(index: number): void {
  const plan = state.plan!;
  const s = plan.spreads.find((x) => x.index === index);
  if (!s) return;

  const rules = READING_RULES[state.readingLevel];
  const words = spreadWordCount(s.text);
  const sentences = spreadSentences(s.text).length;
  const tooLong = words > rules.wordsPerSpread[1];
  const tooShort = words < rules.wordsPerSpread[0];

  $('editor').hidden = false;
  $('editorTitle').textContent = `Doppelseite ${s.index} · Seite ${s.pages[0]}–${s.pages[1]}`;
  $('editorPreview').setAttribute('src', spreadDataUri(renderSpreadPlaceholder(s, plan)));
  $('editorPreview').setAttribute('alt', `Vorschau Doppelseite ${s.index}`);

  $('editorMeter').innerHTML =
    `<span class="meter ${tooLong ? 'meter-stop' : tooShort ? 'meter-warn' : 'meter-ok'}">`
    + `${words} Wörter</span>`
    + `<span class="meter ${sentences > rules.maxSentencesPerSpread ? 'meter-warn' : 'meter-ok'}">`
    + `${sentences} ${sentences === 1 ? 'Satz' : 'Sätze'}</span>`
    + `<span class="meter meter-quiet">Ziel ${rules.wordsPerSpread[0]}–${rules.wordsPerSpread[1]}, `
    + `max. ${rules.maxSentencesPerSpread} Sätze</span>`;

  ($('f_beat') as HTMLInputElement).value = s.beat;
  ($('f_text') as HTMLTextAreaElement).value = s.text;
  ($('f_subject') as HTMLInputElement).value = s.imageBrief.subject;
  ($('f_action') as HTMLInputElement).value = s.imageBrief.action;
  ($('f_setting') as HTMLInputElement).value = s.imageBrief.setting;
  ($('f_mood') as HTMLInputElement).value = s.imageBrief.mood;
  $('f_layout').innerHTML = opts(LAYOUTS, s.layout);
  $('f_anchor').innerHTML = opts(ANCHORS, s.textAnchor);
  $('f_camera').innerHTML = opts(CAMERAS, s.imageBrief.cameraDistance);
  $('f_time').innerHTML = opts(TIMES, s.imageBrief.timeOfDay);

  $('f_chars').innerHTML = plan.characters.map((c) => `
    <label class="check">
      <input type="checkbox" data-char="${c.slug}"${s.charactersPresent.includes(c.slug) ? ' checked' : ''}>
      <span class="swatch swatch-sm" style="background:hsl(${c.paletteSeed} 62% 58%)"></span>
      ${escapeHtml(c.name)}
    </label>`).join('');

  $('promptOut').textContent = composeImagePrompt(s, plan);

  const v = validatePictureBook(plan, {
    readingLevel: state.readingLevel, pageCount: state.pageCount,
  });
  const mine = v.issues.filter((i) => i.spreadIndex === s.index);
  $('editorIssues').innerHTML = mine.length
    ? mine.map(issueHtml).join('')
    : '<p class="empty">Diese Doppelseite ist sauber.</p>';
}

function applyEdit(): void {
  const plan = state.plan;
  if (!plan || state.selected === null) return;
  const i = plan.spreads.findIndex((x) => x.index === state.selected);
  if (i < 0) return;
  const s = plan.spreads[i]!;

  const chars = [...$('f_chars').querySelectorAll<HTMLInputElement>('input[data-char]')]
    .filter((el) => el.checked)
    .map((el) => el.dataset['char']!);

  const next: Spread = {
    ...s,
    beat: ($('f_beat') as HTMLInputElement).value,
    text: ($('f_text') as HTMLTextAreaElement).value,
    layout: ($('f_layout') as HTMLSelectElement).value as Spread['layout'],
    textAnchor: ($('f_anchor') as HTMLSelectElement).value as Spread['textAnchor'],
    charactersPresent: chars,
    imageBrief: {
      ...s.imageBrief,
      subject: ($('f_subject') as HTMLInputElement).value,
      action: ($('f_action') as HTMLInputElement).value,
      setting: ($('f_setting') as HTMLInputElement).value,
      mood: ($('f_mood') as HTMLInputElement).value,
      cameraDistance: ($('f_camera') as HTMLSelectElement).value as Spread['imageBrief']['cameraDistance'],
      timeOfDay: ($('f_time') as HTMLSelectElement).value as Spread['imageBrief']['timeOfDay'],
    },
    textEdited: true,
    imageEdited: true,
  };

  plan.spreads[i] = next;
  renderAll();
  save();
}

function select(index: number): void {
  state.selected = index;
  renderSheet(validatePictureBook(state.plan!, {
    readingLevel: state.readingLevel, pageCount: state.pageCount,
  }).issues);
  renderEditor(index);
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Verdrahtung ─────────────────────────────────────────────────────────────

function boot(): void {
  $('generate').addEventListener('click', () => void generate());

  $('sheet').addEventListener('click', (e) => {
    const fig = (e.target as HTMLElement).closest<HTMLElement>('[data-spread]');
    if (fig) select(Number(fig.dataset['spread']));
  });
  $('sheet').addEventListener('keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== 'Enter' && ke.key !== ' ') return;
    const fig = (ke.target as HTMLElement).closest<HTMLElement>('[data-spread]');
    if (fig) { ke.preventDefault(); select(Number(fig.dataset['spread'])); }
  });

  $('report').addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
    if (el) select(Number(el.dataset['goto']));
  });

  for (const id of ['f_beat', 'f_text', 'f_subject', 'f_action', 'f_setting', 'f_mood']) {
    $(id).addEventListener('input', applyEdit);
  }
  for (const id of ['f_layout', 'f_anchor', 'f_camera', 'f_time']) {
    $(id).addEventListener('change', applyEdit);
  }
  $('f_chars').addEventListener('change', applyEdit);

  $('copyPrompt').addEventListener('click', () => {
    const text = $('promptOut').textContent ?? '';
    const btn = $('copyPrompt');
    navigator.clipboard?.writeText(text).then(
      () => { btn.textContent = 'Kopiert'; setTimeout(() => { btn.textContent = 'Prompt kopieren'; }, 1600); },
      () => {
        const r = document.createRange();
        r.selectNodeContents($('promptOut'));
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
        btn.textContent = 'Markiert — mit Strg/Cmd+C kopieren';
        setTimeout(() => { btn.textContent = 'Prompt kopieren'; }, 2600); });
  });

  $('reset').addEventListener('click', () => {
    try { localStorage.removeItem(STORE_KEY); } catch { /* egal */ }
    state.plan = null;
    state.selected = null;
    $('book').hidden = true;
    $('editor').hidden = true;
  });

  const hue = $<HTMLInputElement>('paletteHue');
  const hueOut = $('hueOut');
  const paintHue = (): void => {
    hueOut.style.background = `hsl(${hue.value} 45% 72%)`;
    hueOut.textContent = `${hue.value}°`;
  };
  hue.addEventListener('input', paintHue);
  paintHue();

  if (restore()) {
    renderAll();
    $('book').hidden = false;
  } else {
    // Die Seite zeigt sofort ein gesetztes Buch — ein leeres Formular zeigt nichts.
    void generate();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
