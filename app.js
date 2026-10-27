/* Brain Food Evidence Atlas — single-page app over the NEUROFUEL LAB research corpus (no build step, works from file://) */
(function () {
  'use strict';
  const D = window.BF_DATA || {};
  const META = D.meta || { counts: {}, grade_distribution: {}, categories: {} };
  const MONOS = (D.monographs || []).slice();
  // syntheses, bibliography and study details may arrive after first paint (see "background data"); these objects fill in place
  const SYN = Object.assign({}, D.syntheses || {});
  const BIB = (D.bibliography || []).slice();
  const GR = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const GRADE_LABEL = { A: 'Strong human evidence', B: 'Moderate human evidence', C: 'Limited human evidence', D: 'Preliminary (mechanistic/animal/exploratory)', E: 'Not supported or concerning' };
  const DOMAIN_LABEL = { alertness: 'Alertness', sustained_attention: 'Sustained attention', reaction_time: 'Reaction time', working_memory: 'Working memory', executive_function: 'Executive function', processing_speed: 'Processing speed', vigilance: 'Vigilance', cognitive_fatigue: 'Cognitive fatigue', learning: 'Learning', resistance_to_decline: 'Resistance to performance decline', episodic_memory: 'Episodic memory', learning_retention: 'Learning retention', global_cognition: 'Global cognition', cognitive_aging: 'Cognitive aging', vascular_health: 'Brain vascular health', cognitive_decline: 'Cognitive decline', dementia_risk: 'Dementia risk', neuroplasticity_biomarkers: 'Neuroplasticity biomarkers', sleep_related_cognition: 'Sleep-related cognition', mood_stress: 'Mood / stress', cerebral_blood_flow: 'Cerebral blood flow', other: 'Other' };
  const POP_LABEL = { healthy_young_adults: 'Healthy young adults', students: 'Students', knowledge_workers: 'Knowledge workers', high_cognitive_workload: 'High cognitive workload', sleep_deprived: 'Sleep-deprived adults', older_adults_healthy: 'Older adults (healthy)', older_adults_mci: 'Older adults with MCI', deficient_or_low_baseline: 'Deficient / low baseline', replete_or_high_baseline: 'Replete / high baseline', vegetarian_vegan: 'Vegetarians / vegans', children_adolescents: 'Children / adolescents', clinical_population: 'Clinical population', mixed_adults: 'Mixed adults', other: 'Other' };
  const DIR_LABEL = { benefit: 'Benefit', possible_benefit: 'Possible benefit', inconsistent: 'Inconsistent', no_benefit: 'No convincing benefit', harm: 'Negative effect', insufficient: 'Insufficient evidence' };
  const TF_LABEL = { acute: 'Acute (single dose / day)', short_term_days: 'Short term (2–13 days)', chronic: 'Chronic (≥ 2 weeks)' };
  const TF_SHORT = { acute: 'Today', short_term_days: 'Days', chronic: 'Long-term' };
  const EV_LABEL = { established_human: 'Established in humans', limited_human: 'Limited human data', animal: 'Mainly animal research', plausible: 'Mechanistically plausible', speculative: 'Speculative' };
  const byId = {};
  MONOS.forEach(m => { byId[m.id] = m; });

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lab = (map, k) => map[k] || (k ? String(k).replace(/_/g, ' ') : '—');
  const grade = g => g ? `<span class="badge grade-${esc(g)}" title="${esc(GRADE_LABEL[g] || '')}">${esc(g)}</span>` : '<span class="badge neutral">n/a</span>';
  const GATE_TXT = { pass: 'Pass', conditional: 'Conditional', fail: 'Fail', unknown: 'Unknown' };
  const GATE_TIP = { pass: 'Pass: no safety or legal barrier found', conditional: 'Conditional: usable only within the limits stated on the ingredient page', fail: 'Fail: excluded by a hard safety or legal requirement' };
  const gate = g => `<span class="badge gate ${esc(g || 'unknown')}" title="${esc(GATE_TIP[g] || '')}">${esc(GATE_TXT[g] || g || 'unknown')}</span>`;
  const dir = d => `<span class="dir-${esc(d)}">${esc(lab(DIR_LABEL, d))}</span>`;
  const tf = t => t ? `<span class="badge tf-${esc(t)}" title="${esc(TF_LABEL[t] || t)}">${esc(TF_SHORT[t] || t)}</span>` : '<span class="badge neutral">n/a</span>';
  const bar = (v, max = 10) => { const n = Number(v); if (isNaN(n)) return '<span class="muted">—</span>'; return `<span class="bar"><span class="track"><span class="fill" style="width:${Math.max(0, Math.min(100, n / max * 100))}%"></span></span><span class="v">${n.toFixed(1)}</span></span>`; };
  const fmtList = a => Array.isArray(a) && a.length ? '<ul class="compact">' + a.map(x => `<li>${typeof x === 'string' ? inline(x) : structured(x)}</li>`).join('') + '</ul>' : '<span class="muted">—</span>';
  const pmLink = s => s && s.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${esc(s.pmid)}/" target="_blank" rel="noopener">PMID ${esc(s.pmid)}</a>` : '';
  const doiLink = s => s && s.doi ? `<a href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener">DOI</a>` : '';
  const pmcLink = s => s && s.pmcid ? `<a href="https://pmc.ncbi.nlm.nih.gov/articles/${esc(s.pmcid)}/" target="_blank" rel="noopener">${esc(s.pmcid)}</a>` : '';
  const verifBadge = s => { const v = (s.verification && s.verification.status) || (s.verified_by_agent ? 'agent_verified' : 'unverified'); const cls = v === 'verified' ? 'pass' : v === 'agent_verified' ? 'conditional' : 'fail'; const t = v === 'verified' ? 'Record confirmed against PubMed/Crossref' : v === 'agent_verified' ? 'Verified by the research agent; independent batch check pending' : v === 'title_mismatch' ? 'Identifier found but title does not match: treat as unverified' : 'Not verified: excluded from quantitative synthesis'; return `<span class="badge ${cls}" title="${esc(t)}">${esc(v.replace('_', ' '))}</span>`; };
  const sortGrade = g => GR[g] || 0;
  const monoLink = id => byId[id] ? `<a href="#ingredient.${esc(id)}">${esc(byId[id].name)}</a>` : `<span class="muted">${esc(id)}</span>`;
  const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const GRADE_WORD = { A: 'Strong', B: 'Moderate', C: 'Limited', D: 'Preliminary', E: 'Not supported' };
  const GRADE_HELP = { A: 'consistent results from good human trials or meta-analyses.', B: 'good human trials, with some gaps or inconsistency.', C: 'few, small or mixed human studies.', D: 'mostly early, animal or mechanistic data.', E: 'the evidence points to no benefit, or to a concern.' };
  const GATE_WORD = { pass: 'No barrier found', conditional: 'Only within the stated limits', fail: 'Excluded' };

  // ---------- icons: one 24px stroke set shared by navigation and pages ----------
  const ICONS = {
    home: '<path d="m3 10.5 9-7 9 7V20a1 1 0 0 1-1 1h-5v-6.5h-6V21H4a1 1 0 0 1-1-1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7Z"/>',
    monitor: '<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    hourglass: '<path d="M6 2h12M6 22h12M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-3.8-5.9"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    xcircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    scale: '<path d="M12 3v18M7 21h10M4 7h16M4 7l-2.5 6a3 3 0 0 0 5 0L4 7ZM20 7l-2.5 6a3 3 0 0 0 5 0L20 7Z"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    flask: '<path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3"/><path d="M7.5 15h9"/>',
    bookopen: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2ZM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    package: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    coins: '<circle cx="9" cy="9" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.4 18.1"/><path d="M8 7h1.5v4"/>',
    route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/>',
    ruler: '<path d="M3 17 17 3l4 4L7 21Z"/><path d="m7.5 12.5 2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
    sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 3v4M17 5h4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    infinity: '<path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    brake: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z"/><path d="M8 12h8"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    // ingredient categories
    bowl: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7.5c0-1.2.8-1.8.8-3M12 7.5c0-1.2.8-1.8.8-3M16 7.5c0-1.2.8-1.8.8-3"/>',
    citrus: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M2 9h20M12 21 8 9l2-6M12 21l4-12-2-6"/>',
    drop: '<path d="M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3Z"/><path d="M9.3 15.3a2.8 2.8 0 0 0 2.7 2.7"/>',
    molecule: '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17.5" r="2.5"/><path d="M8.5 7h7M7.3 9.2l3.5 6.1M16.7 9.2l-3.5 6.1"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M7 2v3M11 2v3M15 2v3"/>',
    berries: '<circle cx="7.5" cy="15.5" r="4"/><circle cx="16.5" cy="15.5" r="4"/><path d="M7.5 11.5C8 7 10 4.5 13 3M16.5 11.5C16 8 14.5 5 13 3"/>',
    sprout: '<path d="M12 21v-9M8 21h8"/><path d="M12 12C12 7.6 9.2 5 4.5 5c0 4.6 2.8 7 7.5 7Z"/><path d="M12 14c0-3.8 2.4-6 6.5-6 0 3.9-2.4 6-6.5 6Z"/>',
    microbe: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h.01M12 10.5h.01M15.5 13h.01M21 12h1.5M1.5 12H3M8 7V5M16 17v2"/>',
    apple: '<path d="M12 7c-1.4-1-2.8-1.4-4.2-1.4C4.6 5.6 3 8.2 3 11.4 3 15.8 6.2 21 8.8 21c1.2 0 1.9-.6 3.2-.6s2 .6 3.2.6c2.6 0 5.8-5.2 5.8-9.6 0-3.2-1.6-5.8-4.8-5.8-1.4 0-2.8.4-4.2 1.4Z"/><path d="M12 7c0-2.2.9-3.6 2.8-4.2"/>',
    plate: '<circle cx="12.5" cy="12" r="6.5"/><circle cx="12.5" cy="12" r="3"/><path d="M2.5 4v6a1.5 1.5 0 0 0 3 0V4M4 11.5V20M21.5 4c-1.2 0-1.8 2-1.8 5s.6 3.5 1.8 3.5V20"/>',
    // answers and directions
    checkc: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.3 2.6 2.6 5-5.2"/>',
    halfc: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
    tildec: '<circle cx="12" cy="12" r="9"/><path d="M7.5 13c1.3-2 2.8-2 4.5 0s3.2 2 4.5 0"/>',
    minusc: '<circle cx="12" cy="12" r="9" stroke-dasharray="2.4 2.6"/><path d="M8.5 12h7"/>',
    up: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
    down: '<path d="M12 5v14M5.5 12.5 12 19l6.5-6.5"/>',
    flat: '<path d="M5 12h14"/>',
    wave: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  const icon = (k, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
  // every ingredient wears its category's icon, so lists can be scanned by shape
  const CAT_IC = { A: 'bowl', B: 'citrus', C: 'gem', D: 'drop', E: 'molecule', F: 'coffee', G: 'berries', H: 'sprout', I: 'microbe', J: 'apple', K: 'plate' };
  const catAv = (m, cls) => `<span class="cat-av${cls ? ' ' + cls : ''}" title="${esc(m.category_name)}">${icon(CAT_IC[m.category] || 'leaf')}</span>`;
  // plain answers ("does it help?") always travel with an icon, never colour alone
  const VERDICT = { 'Yes': ['checkc', 'v-yes'], 'In some groups': ['users', 'v-some'], 'Maybe': ['halfc', 'v-maybe'], 'Unclear': ['tildec', 'v-unclear'], 'No': ['xcircle', 'v-no'], 'No, may harm': ['alert', 'v-harm'], 'Not studied': ['minusc', 'v-none'] };
  const vIcon = a => { const v = VERDICT[a] || VERDICT.Unclear; return `<span class="vi ${v[1]}">${icon(v[0])}</span>`; };
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
  const TRAY = store.get('bf-compare', []).filter(id => byId[id]).slice(0, 4);
  const RECENT = store.get('bf-recent', []).filter(id => byId[id]).slice(0, 8);
  function noteRecent(id) { const i = RECENT.indexOf(id); if (i === 0) return; if (i > 0) RECENT.splice(i, 1); RECENT.unshift(id); RECENT.length = Math.min(RECENT.length, 8); store.set('bf-recent', RECENT); }
  const cmpTog = (m, full) => { const on = TRAY.includes(m.id); return `<button type="button" class="cmp-tog${full ? ' btn' : ''}" data-cmptog="${esc(m.id)}" aria-pressed="${on}" title="${on ? 'Remove from' : 'Add to'} compare">${icon(on ? 'check' : 'plus')}${full ? `<span>${on ? 'In compare' : 'Add to compare'}</span>` : `<span class="sr">Compare ${esc(m.name)}</span>`}</button>`; };
  const shareBtn = () => `<button type="button" class="btn ghost" data-share>${icon('share')}Share</button>`;
  const BRAND_SVG = '<svg class="brand-mark" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="104" fill="#124e66"/><rect x="106" y="135" width="300" height="62" rx="31" fill="#9fe0c8"/><rect x="106" y="231" width="226" height="62" rx="31" fill="#fff"/><rect x="106" y="327" width="152" height="62" rx="31" fill="#fff"/></svg>';

  // ---------- site map: five everyday destinations + a four-shelf research library ----------
  // [route, label, short label (phone tab bar), icon, one-line description]
  const PRIMARY = [
    ['home', 'Home', 'Home', 'home', 'Start page: the main answers and where to find everything.'],
    ['profile', 'Your profile type', 'My type', 'user', 'Six questions, then your best habits and pills for today and the long run.'],
    ['goals', 'Best by goal', 'Goals', 'target', 'What works for focus, memory and overall sharpness.'],
    ['database', 'Ingredients', 'Ingredients', 'leaf', `All ${MONOS.length} foods, nutrients, supplements and diets, with grades and safety.`],
    ['protocol', 'The Limitless Protocol', 'Limitless', 'infinity', 'Remove what limits your brain, then boost it: by food, pill and habit, for today and for years.'],
    ['pill', 'The Limitless Pill', 'Pill', 'pill', 'The best-proven stack, and three recipes: today, this week, for life.'],
  ];
  // the phone tab bar keeps five tabs: the pill lives under the protocol's tab
  const TAB_OF = { pill: 'protocol' };
  const LIB = [
    { key: 'evidence', t: 'Explore the evidence', ic: 'grid', d: 'The graded findings, cut nine ways.', items: [
      ['matrix', 'Evidence matrix', 'Every ingredient against every brain outcome, on one screen.', 'table'],
      ['compare', 'Compare ingredients', 'Up to four side by side: grades, safety, limits and allowed claims.', 'columns'],
      ['acute', 'Same-day effects', 'What helps within minutes to hours: alertness, attention, reaction time.', 'zap'],
      ['longterm', 'Long-term effects', 'What changes over weeks to years: memory, ageing and decline.', 'hourglass'],
      ['populations', 'Who it works for', 'Students, workers, older adults, the sleep-deprived and the deficient.', 'users'],
      ['combinations', 'Combinations', 'Which pairings beat their single ingredients, and which do not.', 'layers'],
      ['rankings', 'Rankings', 'Nine rankings for nine questions, from best-supported to weakest claims.', 'trophy'],
      ['myths', 'Myths vs evidence', 'Popular brain-food claims checked against controlled human studies.', 'xcircle'],
      ['foundations', 'Brain nutrition basics', 'How food reaches the brain, in plain language, with a glossary.', 'book'],
    ] },
    { key: 'safety', t: 'Safety & rules', ic: 'shield', d: 'What is safe, and what may legally be said.', items: [
      ['safety', 'Safety review', 'Side effects, upper limits, drug interactions and who should avoid what.', 'shield'],
      ['regulatory', 'Regulatory & claims', 'The rules in the EU, the US and Morocco, and what may be claimed.', 'scale'],
      ['claims', 'Claims library', 'Every authorised health claim found, next to the refused ones.', 'message'],
    ] },
    { key: 'reports', t: 'Research reports', ic: 'file', d: 'The written conclusions, and how they were reached.', items: [
      ['summary', 'Executive summary', 'The main conclusions, the big uncertainties and the safety findings.', 'file'],
      ['decisions', 'Decision framework', 'Ten questions to answer before building the company.', 'compass'],
      ['methodology', 'Methodology', 'How the evidence was searched, graded and verified.', 'flask'],
      ['bibliography', 'Bibliography', `All ${(META.counts || {}).unique_references || ''} references, with their verification status.`, 'bookopen'],
    ] },
    { key: 'business', t: 'Brain Food business', ic: 'briefcase', d: 'Products, market, costs and testing for the company.', items: [
      ['products', 'Product concepts', 'Five product families built only from eligible ingredients.', 'package'],
      ['competitors', 'Competitors', '34 supplement brands and 30 food brands, and what they claim.', 'briefcase'],
      ['costs', 'Ingredient costs', 'Public prices and availability for each ingredient.', 'coins'],
      ['validation', 'Clinical roadmap', 'How a Brain Food product would be tested in people.', 'route'],
      ['instruments', 'Test instruments', 'Which cognitive tests can detect a nutrition effect.', 'ruler'],
      ['brand', 'Brand positioning', 'Communication principles and wording for an evidence-led brand.', 'sparkles'],
    ] },
  ];
  const LIB_OF = {};
  LIB.forEach(g => g.items.forEach((it, i) => { LIB_OF[it[0]] = { g, i }; }));
  const LIB_COUNT = LIB.reduce((n, g) => n + g.items.length, 0);

  // mini markdown (headings, bold/italic, code, links, lists, tables, paragraphs) + [s3]-style study refs
  function inline(t) {
    let s = esc(t);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\[monograph:([a-z0-9-]+)\]/g, (m, id) => byId[id] ? `<a href="#ingredient.${id}">${esc(byId[id].name)}</a>` : `<span class="muted">${id}</span>`)
      .replace(/\[((?:s|r)\d{1,3}(?:\s*,\s*(?:s|r)\d{1,3})*)\]/g, (m, ids) => '[' + ids.split(/\s*,\s*/).map(id => `<a href="#" class="ref" data-ref="${id}">${id}</a>`).join(', ') + ']')
      .replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    return s;
  }
  function md(text) {
    if (text == null) return '';
    if (typeof text !== 'string') return structured(text);
    const lines = text.replace(/\r/g, '').split('\n');
    let out = '', i = 0;
    const para = [];
    const flush = () => { if (para.length) { out += '<p>' + inline(para.join(' ')) + '</p>'; para.length = 0; } };
    while (i < lines.length) {
      const L = lines[i];
      const hm = /^(#{1,5})\s+(.*)$/.exec(L);
      if (hm) { flush(); const lvl = Math.min(4, hm[1].length + 1); out += `<h${lvl}>${inline(hm[2])}</h${lvl}>`; i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(L) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        flush(); const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
        let t = '<div class="tbl-wrap"><table class="md"><thead><tr>' + cells(L).map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'; i += 2;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { t += '<tr>' + cells(lines[i]).map(c => `<td>${c}</td>`).join('') + '</tr>'; i++; }
        out += t + '</tbody></table></div>'; continue;
      }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(L)) {
        flush(); const ordered = /^\s*\d+[.)]/.test(L); out += ordered ? '<ol>' : '<ul>';
        while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) { out += '<li>' + inline(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, '')) + '</li>'; i++; }
        out += ordered ? '</ol>' : '</ul>'; continue;
      }
      if (/^\s*$/.test(L)) { flush(); i++; continue; }
      para.push(L.trim()); i++;
    }
    flush();
    return out;
  }
  // generic renderer for arbitrary JSON (fallback for synthesis sections with unknown structure)
  function structured(v, depth = 0) {
    if (v == null) return '<span class="muted">—</span>';
    if (typeof v === 'string') return depth === 0 ? md(v) : inline(v);
    if (typeof v === 'number' || typeof v === 'boolean') return esc(String(v));
    if (Array.isArray(v)) {
      if (!v.length) return '<span class="muted">none</span>';
      if (v.every(x => typeof x !== 'object')) return '<ul class="compact">' + v.map(x => `<li>${inline(String(x))}</li>`).join('') + '</ul>';
      if (v.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
        const cols = []; v.forEach(o => Object.keys(o).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
        if (cols.length <= 9) return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th>${esc(c.replace(/_/g, ' '))}</th>`).join('')}</tr></thead><tbody>${v.map(o => '<tr>' + cols.map(c => `<td class="wrap">${structured(o[c], depth + 1)}</td>`).join('') + '</tr>').join('')}</tbody></table></div>`;
      }
      return v.map(x => `<div class="card" style="margin:.5rem 0">${structured(x, depth + 1)}</div>`).join('');
    }
    return '<dl class="kv">' + Object.keys(v).filter(k => !k.startsWith('_')).map(k => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${structured(v[k], depth + 1)}</dd>`).join('') + '</dl>';
  }
  function pending(what, file) {
    return `<div class="pending"><strong>${esc(what)}</strong> is not written yet. It belongs to the synthesis phase, which runs after the ingredient research is complete, and will appear in a later update of this atlas. <span class="small">(Source file: ${esc(file)})</span></div>`;
  }
  function sourcesList(src) {
    if (!Array.isArray(src) || !src.length) return '';
    return `<div class="section"><h2>Sources</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>id</th><th>Source</th><th>Type</th><th>Links</th><th>Verified</th><th>Note</th></tr></thead><tbody>${src.map(s => `<tr><td class="mono">${esc(s.id)}</td><td class="wrap"><strong>${esc(s.title)}</strong>${s.year ? ' (' + esc(s.year) + ')' : ''}${s.authors ? '<br><small>' + esc(s.authors) + '</small>' : ''}</td><td>${esc(s.type || '')}</td><td class="tight">${[pmLink(s), doiLink(s), s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">link</a>` : ''].filter(Boolean).join(' · ')}</td><td>${s.id_check ? verifBadge({ verification: { status: s.id_check.status } }) : s.verified === false ? '<span class="badge fail">not verified</span>' : s.verified ? '<span class="badge conditional" title="Checked by the research agent (web page or search record); no PubMed/Crossref identifier to batch-check">agent checked</span>' : '<span class="badge unknown">?</span>'}</td><td class="wrap small">${inline(s.note || '')}${s.accessed ? ' <span class="muted">(accessed ' + esc(s.accessed) + ')</span>' : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function synthesisStatus(sy) {
    if (!sy) return '';
    if (sy._status === 'unreviewed_draft') return '<div class="callout">Draft. Written and self-audited by a research agent; the independent fact-check has not run yet. Legal and regulatory statements must be confirmed by a qualified specialist before any decision.</div>';
    return '';
  }
  // generic synthesis page: summary + sections + tables + any extra structured arrays + sources
  function synthesisPage(id, fallbackTitle, extraRenderer) {
    const sy = SYN[id];
    if (!sy) return `<div class="page-head"><div><h1>${esc(fallbackTitle)}</h1></div></div>${pending(fallbackTitle, 'research/syntheses/' + id + '.json')}`;
    const known = new Set(['id', 'title', 'summary', 'sections', 'tables', 'sources', 'search_log', 'coverage_notes', '_status', '_critique']);
    let html = `<div class="page-head"><div><h1>${esc(sy.title || fallbackTitle)}</h1></div></div>${synthesisStatus(sy)}`;
    if (sy.summary) html += `<div class="card prose" style="margin-bottom:1rem"><h3>Summary</h3>${md(sy.summary)}</div>`;
    if (extraRenderer) { const r = extraRenderer(sy); if (r) { html += r; } }
    (sy.sections || []).forEach(sec => { html += `<div class="section prose"><h2>${esc(sec.heading || sec.title || '')}</h2>${md(sec.body || sec.content || '')}</div>`; });
    (sy.tables || []).forEach(t => { html += `<div class="section"><h2>${esc(t.name || t.title || 'Table')}</h2><div class="tbl-wrap"><table class="tbl"><thead><tr>${(t.columns || []).map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(t.rows || []).map(r => '<tr>' + (Array.isArray(r) ? r : Object.values(r)).map(c => `<td class="wrap">${typeof c === 'string' ? inline(c) : structured(c, 1)}</td>`).join('') + '</tr>').join('')}</tbody></table></div></div>`; });
    if (!extraRenderer) {
      Object.keys(sy).filter(k => !known.has(k)).forEach(k => { html += `<div class="section"><h2>${esc(k.replace(/_/g, ' '))}</h2>${structured(sy[k])}</div>`; });
    }
    if (sy.coverage_notes) html += `<div class="section prose"><h2>Coverage notes</h2>${md(sy.coverage_notes)}</div>`;
    html += sourcesList(sy.sources);
    if (sy.search_log && sy.search_log.length) html += `<div class="section"><h2>Search log</h2>${structured(sy.search_log)}</div>`;
    if (sy._critique) html += critiqueBlock(sy._critique);
    return html;
  }
  function critiqueBlock(c) {
    const issues = c.issues || [];
    return `<div class="section"><h2>Independent review</h2><p class="small">${inline(c.reviewer_summary || '')}</p>${issues.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Severity</th><th>Field</th><th>Problem</th><th>Fix applied</th></tr></thead><tbody>${issues.map(i => `<tr><td><span class="badge ${i.severity === 'critical' ? 'fail' : i.severity === 'major' ? 'conditional' : 'neutral'}">${esc(i.severity)}</span></td><td class="mono">${esc(i.field)}</td><td class="wrap">${inline(i.problem)}</td><td class="wrap">${inline(i.fix_applied)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No issues recorded.</p>'}${c.unresolved && c.unresolved.length ? `<h3>Unresolved</h3>${fmtList(c.unresolved)}` : ''}${c.grade_changes && c.grade_changes.length ? `<h3>Grade changes</h3>${structured(c.grade_changes)}` : ''}</div>`;
  }

  // ---------- table engine (sort + filter) ----------
  function dataTable(spec) {
    // spec: {id, columns:[{key,label,sort:(row)=>val,render:(row)=>html,cls}], rows, filters:[{key,label,options:[[val,label]],match:(row,val)=>bool}], search:(row,q)=>bool, pageSize}
    const st = (window.__tbl = window.__tbl || {})[spec.id] = (window.__tbl || {})[spec.id] || { sort: spec.defaultSort || null, dir: spec.defaultDir || 'desc', f: {}, q: '', limit: Math.min(spec.pageSize || 200, 40) };  // long tables open at 40 rows; "Show all" reveals the rest
    const col = st.sort ? spec.columns.find(c => c.key === st.sort) : null;
    let rows = spec.rows.slice();
    Object.keys(st.f).forEach(k => { const v = st.f[k]; if (v === '' || v == null) return; const f = spec.filters.find(x => x.key === k); if (f) rows = rows.filter(r => f.match(r, v)); });
    if (st.q && spec.search) { const q = st.q.toLowerCase(); rows = rows.filter(r => spec.search(r, q)); }
    if (col) { const s = col.sort || (r => r[col.key]); rows.sort((a, b) => { const x = s(a), y = s(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return st.dir === 'asc' ? c : -c; }); }
    const shown = rows.slice(0, st.limit);
    let html = `<div class="filters" data-tbl="${spec.id}">`;
    if (spec.search) html += `<label>Search<input type="search" id="${spec.id}-q" value="${esc(st.q)}" placeholder="type to filter…"></label>`;
    (spec.filters || []).forEach(f => { html += `<label>${esc(f.label)}<select id="${spec.id}-f-${f.key}" data-f="${f.key}"><option value="">All</option>${f.options.map(o => `<option value="${esc(o[0])}" ${String(st.f[f.key]) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`; });
    (window.__tblSpec = window.__tblSpec || {})[spec.id] = spec;
    st._rows = rows;
    const clamp = spec.columns.some(c => c.cls === 'wrap');
    if (clamp) html += `<label class="tbl-full"><input type="checkbox" data-full="${spec.id}"${st.full ? ' checked' : ''}>Full text</label>`;
    html += `<span class="spacer"></span><span class="small">${rows.length} rows${rows.length > shown.length ? ' (showing ' + shown.length + ')' : ''}</span><button type="button" class="btn" data-export="${spec.id}" title="Download the filtered rows as a spreadsheet file">Download CSV</button></div>`;
    html += `<div class="tbl-wrap"><table class="tbl${clamp ? ' clampable' : ''}${clamp && st.full ? ' full' : ''}" id="${spec.id}"><thead><tr>${spec.columns.map(c => `<th class="${c.sort !== false ? 'sortable' : ''}" data-sort="${c.key}">${esc(c.label)}${st.sort === c.key ? `<span class="arrow">${st.dir === 'asc' ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr></thead><tbody>`;
    html += shown.map(r => '<tr>' + spec.columns.map(c => { const v = c.render ? c.render(r) : esc(r[c.key]); return `<td class="${c.cls || ''}">${c.cls === 'wrap' ? `<div class="cell-clamp">${v}</div>` : v}</td>`; }).join('') + '</tr>').join('');
    html += `</tbody></table></div>`;
    if (rows.length > shown.length) html += `<p><button class="btn" data-more="${spec.id}">Show all ${rows.length}</button></p>`;
    return html;
  }
  function wireTables(root) {
    root.querySelectorAll('.filters[data-tbl]').forEach(fb => {
      const id = fb.dataset.tbl, st = window.__tbl[id];
      fb.querySelectorAll('select[data-f]').forEach(sel => sel.addEventListener('change', () => { st.f[sel.dataset.f] = sel.value; render(); }));
      const q = fb.querySelector('input[type="search"]');
      if (q) q.addEventListener('input', () => { st.q = q.value; clearTimeout(st._t); st._t = setTimeout(render, 180); });
    });
    root.querySelectorAll('table.tbl th.sortable').forEach(th => th.addEventListener('click', () => { const id = th.closest('table').id, st = window.__tbl[id]; if (!st) return; if (st.sort === th.dataset.sort) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = th.dataset.sort; st.dir = 'desc'; } render(); }));
    root.querySelectorAll('input[data-full]').forEach(cb => cb.addEventListener('change', () => { window.__tbl[cb.dataset.full].full = cb.checked; render(); }));
    root.querySelectorAll('table.tbl.clampable tbody tr').forEach(tr => tr.addEventListener('click', e => { if (e.target.closest('a, button, input, select, summary')) return; tr.classList.toggle('open'); }));
    root.querySelectorAll('button[data-more]').forEach(b => b.addEventListener('click', () => { window.__tbl[b.dataset.more].limit = 100000; render(); }));
    root.querySelectorAll('button[data-export]').forEach(b => b.addEventListener('click', () => exportCsv(b.dataset.export)));
  }
  // CSV export of the currently filtered rows: plain text of each rendered cell
  function exportCsv(id) {
    const spec = window.__tblSpec[id], st = window.__tbl[id];
    if (!spec || !st) return;
    const txt = h => { const d = document.createElement('div'); d.innerHTML = h == null ? '' : String(h); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [spec.columns.map(c => q(c.label)).join(',')].concat((st._rows || []).map(r => spec.columns.map(c => q(txt(c.render ? c.render(r) : r[c.key]))).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `brain-food-${id}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- views ----------
  const ROWS = []; // flattened evidence rows
  MONOS.forEach(m => (m.evidence_by_outcome || []).forEach((r, i) => ROWS.push(Object.assign({ _m: m, _i: i }, r))));
  const CAT_OPTS = Object.keys(META.categories || {}).filter(k => MONOS.some(m => m.category === k)).map(k => [k, k + ' · ' + META.categories[k]]);
  const monoCols = [
    { key: 'name', label: 'Ingredient', sort: r => r.name.toLowerCase(), render: r => `<a href="#ingredient.${esc(r.id)}"><strong>${esc(r.name)}</strong></a>`, cls: 'wrap' },
    { key: 'category', label: 'Cat.', sort: r => r.category, render: r => `<span class="pill" title="${esc(r.category_name)}">${esc(r.category)}</span>` },
    { key: 'acute', label: 'Acute', sort: r => sortGrade(r._derived.best_grade_acute), render: r => grade(r._derived.best_grade_acute) },
    { key: 'chronic', label: 'Long-term', sort: r => sortGrade(r._derived.best_grade_chronic), render: r => grade(r._derived.best_grade_chronic) },
    { key: 'young', label: 'Young adults (rested)', sort: r => sortGrade(r._derived.best_grade_young_adults), render: r => grade(r._derived.best_grade_young_adults) },
    { key: 'sleep', label: 'Sleep loss', sort: r => sortGrade(r._derived.best_grade_sleep_stress), render: r => grade(r._derived.best_grade_sleep_stress) },
    { key: 'safety', label: 'Safety gate', sort: r => r._derived.safety_gate, render: r => gate(r._derived.safety_gate) },
    { key: 'reg', label: 'Regulatory', sort: r => r._derived.regulatory_gate, render: r => gate(r._derived.regulatory_gate) },
    { key: 'ev', label: 'Evidence', sort: r => +r.scores.evidence_quality, render: r => bar(r.scores.evidence_quality), cls: 'tight' },
    { key: 'mag', label: 'Effect', sort: r => +r.scores.effect_magnitude, render: r => bar(r.scores.effect_magnitude), cls: 'tight' },
    { key: 'saf', label: 'Safety', sort: r => +r.scores.safety, render: r => bar(r.scores.safety), cls: 'tight' },
    { key: 'food', label: 'Food fit', sort: r => +r.scores.food_suitability, render: r => bar(r.scores.food_suitability), cls: 'tight' },
    { key: 'cost', label: 'Cost', sort: r => +r.scores.cost_access, render: r => bar(r.scores.cost_access), cls: 'tight' },
    { key: 'comp', label: 'Composite', sort: r => r._derived.composite_score, render: r => `<strong class="mono">${r._derived.composite_score.toFixed(1)}</strong>`, cls: 'num' },
    { key: 'n', label: 'Studies', sort: r => r._derived.n_studies, render: r => `<span class="mono">${r._derived.n_verified}/${r._derived.n_studies}</span>`, cls: 'num' },
  ];
  const monoFilters = [
    { key: 'cat', label: 'Category', options: CAT_OPTS, match: (r, v) => r.category === v },
    { key: 'elig', label: 'Eligibility', options: [['eligible', 'Eligible (both gates pass)'], ['conditional', 'Conditional'], ['ineligible', 'Ineligible']], match: (r, v) => r._derived.eligibility === v },
    { key: 'acute', label: 'Acute grade ≥', options: [['A', 'A'], ['B', 'B'], ['C', 'C']], match: (r, v) => sortGrade(r._derived.best_grade_acute) >= GR[v] },
    { key: 'chronic', label: 'Long-term grade ≥', options: [['A', 'A'], ['B', 'B'], ['C', 'C']], match: (r, v) => sortGrade(r._derived.best_grade_chronic) >= GR[v] },
  ];
  const monoSearch = (r, q) => (r.name + ' ' + (r.aliases || []).join(' ') + ' ' + (r.one_line_verdict || '')).toLowerCase().includes(q);

  // outcomes that are not cognition (biomarkers, blood flow, mood) never count as a cognitive benefit
  const NONCOG = new Set(['neuroplasticity_biomarkers', 'cerebral_blood_flow', 'vascular_health', 'mood_stress', 'other']);
  const GENERAL = new Set(['healthy_young_adults', 'students', 'knowledge_workers', 'high_cognitive_workload', 'mixed_adults']);
  const isBenefit = r => ['benefit', 'possible_benefit'].includes(r.direction) && r.grade && r.grade !== 'E';
  // best graded row per ingredient for a predicate; on equal grades, healthy-adult evidence wins
  function bestPerIngredient(pred) {
    const b = {};
    ROWS.forEach(r => { if (NONCOG.has(r.domain) || !GR[r.grade] || !pred(r)) return; const cur = b[r._m.id]; if (!cur || GR[r.grade] > GR[cur.grade] || (GR[r.grade] === GR[cur.grade] && GENERAL.has(r.population) && !GENERAL.has(cur.population))) b[r._m.id] = r; });
    return Object.values(b).sort((x, y) => GR[y.grade] - GR[x.grade] || GENERAL.has(y.population) - GENERAL.has(x.population) || y._m._derived.composite_score - x._m._derived.composite_score);
  }
  const popWord = p => lab(POP_LABEL, p).replace(/^./, c => c.toLowerCase());
  function lastProfile() {
    try { const s = localStorage.getItem('bf-profile-last'); const a = s && pDecode(s); return a ? { s, T: profileResult(a).T } : null; } catch (e) { return null; }
  }

  function viewHome() {
    const c = META.counts || {};
    const gd = META.grade_distribution || {};
    const total = Object.values(gd).reduce((a, b) => a + b, 0) || 1;
    const ex = SYN['executive-summary'];
    const POP = [['caffeine', 'Caffeine'], ['creatine', 'Creatine'], ['l-theanine', 'L-theanine'], ['omega-3-dha-epa', 'Omega-3'], ['bacopa-monnieri', 'Bacopa'], ['mediterranean-diet', 'Mediterranean diet']].filter(p => byId[p[0]]);
    const eligibleBenefit = r => isBenefit(r) && r._m._derived.eligibility !== 'ineligible';
    const today = bestPerIngredient(r => eligibleBenefit(r) && r.timeframe === 'acute').filter(r => 'AB'.includes(r.grade)).slice(0, 5);
    const later = bestPerIngredient(r => eligibleBenefit(r) && r.timeframe === 'chronic').filter(r => 'AB'.includes(r.grade)).slice(0, 5);
    const nope = bestPerIngredient(r => r.direction === 'no_benefit' && 'AB'.includes(r.grade)).slice(0, 5);
    const evItem = (r, showTf) => `<li><a class="ev-item" href="#ingredient.${esc(r._m.id)}">${catAv(r._m, 'sm')}<span class="ev-b"><strong>${esc(r._m.name)}</strong><small>${showTf ? tf(r.timeframe) + ' ' : ''}${esc(lab(DOMAIN_LABEL, r.domain))} · ${esc(popWord(r.population))}</small></span><span class="ev-g">${grade(r.grade)}</span></a></li>`;
    const gcol = (cls, ic, title, sub, rows, more, showTf) => `<div class="gcol ${cls}"><div class="gcol-h"><span class="gcol-ic">${icon(ic)}</span><h3>${title}</h3></div><p class="gcol-sub">${sub}</p>
      <ul class="ev-items">${rows.map(r => evItem(r, showTf)).join('')}</ul>${more}</div>`;
    const last = lastProfile();
    return `<div class="home">
    <section class="hero">
      <div>
        <div class="eyebrow">Brain Food · Evidence Atlas</div>
        <h1>What really works for your brain, <em>and what doesn’t.</em></h1>
        <p class="lead">Plain answers on foods, nutrients and supplements for focus, memory and long-run brain health, each graded from human studies and checked against PubMed or Crossref.</p>
        <button type="button" class="hero-search" data-open="palette">${icon('search')}<span>Search an ingredient or topic…</span><kbd>/</kbd></button>
        <div class="hero-pop">${RECENT.length ? `<span>Recent:</span>${RECENT.slice(0, 5).map(id => `<a href="#ingredient.${esc(id)}">${esc(byId[id].name.replace(/ \(.*\)$/, ''))}</a>`).join('')}` : `<span>Popular:</span>${POP.map(([id, l]) => `<a href="#ingredient.${id}">${esc(l)}</a>`).join('')}`}</div>
      </div>
      <div class="hero-card">
        <div class="hc-n">${(c.outcome_rows || 0).toLocaleString('en-US')}</div><div class="hc-l">graded findings, by strength of evidence</div>
        <div class="gchart">${['A', 'B', 'C', 'D', 'E'].map(g => `<div>${grade(g)}</div><div class="track"><div class="fill" style="width:${(gd[g] || 0) / total * 100}%;background:var(--g${g})"></div></div><div class="n">${gd[g] || 0}</div>`).join('')}</div>
        <div class="hc-foot">Strong evidence is rare: most findings are limited or preliminary. That is why every answer here shows its grade.</div>
      </div>
    </section>

    <section class="home-sec">
      <div class="sec-h"><div><h2>Start here</h2><p>Pick what you came for. Everything else is one click away.</p></div></div>
      <div class="paths">
        <a class="path path-main" href="#profile${last ? '.' + esc(last.s) : ''}"><span class="path-tag">${last ? 'Your result' : '2 minutes'}</span><span class="path-ic">${icon('user')}</span>
          <h3>Your profile type</h3><p>Six quick questions. You get the best habits and the best pill for you, for today and for the long run, filtered for what is safe for you.</p>
          ${last ? `<span class="path-last">You are <b>${esc(last.T[0])}</b></span><span class="path-go">See your result ${icon('arrow')}</span>` : `<span class="path-go">Start the questions ${icon('arrow')}</span>`}</a>
        <div class="path"><span class="path-ic">${icon('target')}</span><h3>Best by goal</h3><p>Three goals, three different answers, today and long-term.</p>
          <div class="path-goals"><a href="#goals.focus">Focus & attention${icon('chev')}</a><a href="#goals.memory">Memory & learning${icon('chev')}</a><a href="#goals.capacity">Overall sharpness${icon('chev')}</a></div></div>
        <a class="path" href="#database"><span class="path-ic">${icon('leaf')}</span><h3>Look up an ingredient</h3><p>All ${MONOS.length} foods, nutrients, supplements and diets. Each gets a plain yes or no for focus, memory and long-run health.</p><span class="path-go">Browse ingredients ${icon('arrow')}</span></a>
        <a class="path path-pill" href="#protocol"><span class="path-ic">${icon('infinity')}</span><h3>The Limitless Protocol</h3><p>First remove what holds your brain back, then boost it: with food, pills and habits, for today and for years. The Limitless Pill is one part of it.</p><span class="path-go">Open the protocol ${icon('arrow')}</span></a>
      </div>
    </section>

    <section class="home-sec">
      <div class="read-strip">
        <div><h3>How strong is the evidence?</h3><div class="rs-items">${['A', 'B', 'C', 'D', 'E'].map(g => `<span>${grade(g)}${GRADE_WORD[g]}</span>`).join('')}</div></div>
        <div><h3>When does it work?</h3><div class="rs-items"><span>${tf('acute')}same day</span><span>${tf('short_term_days')}2–13 days</span><span>${tf('chronic')}2+ weeks</span></div></div>
        <div><h3>Is it safe and allowed?</h3><div class="rs-items"><span>${gate('pass')}</span><span>${gate('conditional')}</span><span>${gate('fail')}</span></div></div>
        <button type="button" class="btn sm" data-open="help">${icon('help')}Full guide</button>
      </div>
    </section>

    <section class="home-sec">
      <div class="sec-h"><div><h2>The evidence at a glance</h2><p>Computed live from the graded rows: the best finding per ingredient. Check who was studied before acting on it.</p></div></div>
      <div class="glance-cols">
        ${gcol('today', 'zap', 'Works the same day', 'Best same-day benefit (grade A or B)', today, `<a class="gcol-more" href="#acute">All same-day evidence →</a>`)}
        ${gcol('long', 'hourglass', 'Works over weeks or years', 'Best long-term benefit (grade A or B)', later, `<a class="gcol-more" href="#longterm">All long-term evidence →</a>`)}
        ${gcol('no', 'xcircle', 'Tested, and did not help', 'Good trials showing no benefit for that outcome', nope, `<a class="gcol-more" href="#myths">Myths vs evidence →</a>`, true)}
      </div>
    </section>

    ${ex && (ex.key_conclusions || []).length ? `<section class="home-sec">
      <div class="sec-h"><div><h2>Key conclusions</h2><p>From the executive summary of the research program.</p></div><a href="#summary">Read all ${ex.key_conclusions.length} →</a></div>
      <ol class="concl">${ex.key_conclusions.slice(0, 4).map(k => `<li>${typeof k === 'string' ? inline(k) : structured(k)}</li>`).join('')}</ol>
    </section>` : ''}

    <section class="home-sec">
      <div class="sec-h"><div><h2>The full library</h2><p>The research behind the simple answers, on ${LIB_COUNT} pages.</p></div><a href="#library">Open the library →</a></div>
      <div class="lib-cols">${LIB.map(g => `<div class="lib-col"><h3>${icon(g.ic)}${esc(g.t)}</h3><ul>${g.items.map(([k, l]) => `<li><a href="#${k}">${esc(l)}</a></li>`).join('')}</ul></div>`).join('')}</div>
    </section>

    <section class="home-sec">
      <div class="sec-h"><div><h2>About this research</h2><p>NEUROFUEL LAB research program for the Brain Food brand. Science first, product second, marketing last.</p></div><a href="#methodology">How it was done →</a></div>
      <div class="about-row">
        <div class="tile"><div class="n">${c.monographs || 0}</div><div class="l">ingredient monographs (${c.reviewed || 0} independently reviewed so far)</div></div>
        <div class="tile"><div class="n">${(c.outcome_rows || 0).toLocaleString('en-US')}</div><div class="l">graded findings: outcome × population × timeframe</div></div>
        <div class="tile"><div class="n">${(c.unique_references || 0).toLocaleString('en-US')}</div><div class="l">unique references, ${(c.verified_references || 0).toLocaleString('en-US')} confirmed against PubMed or Crossref</div></div>
        <div class="tile"><div class="n">${(c.search_queries || 0).toLocaleString('en-US')}</div><div class="l">logged database searches</div></div>
      </div>
      ${progressPanel()}
    </section>
    </div>`;
  }

  function viewLibrary() {
    return `<div class="page-head"><div><div class="eyebrow">Library</div><h1>Everything in the atlas</h1><p class="lead">The research behind the simple answers, on ${LIB_COUNT} pages across four shelves. Every page links back to the ingredients it talks about.</p></div></div>
    ${LIB.map(g => `<section class="lib-sec"><div class="lib-h"><span class="lib-hic">${icon(g.ic)}</span><div><h2>${esc(g.t)}</h2><p>${esc(g.d)}</p></div></div>
      <div class="lib-grid">${g.items.map(([k, l, d, ic]) => `<a class="lib-card" href="#${k}"><span class="lib-ic">${icon(ic)}</span><span class="lib-tx"><strong>${esc(l)}</strong><span>${esc(d)}</span></span>${icon('chev', 'go')}</a>`).join('')}</div></section>`).join('')}`;
  }

  function progressPanel() {
    const p = META.progress;
    if (!p) return '';
    const pct = Math.round(p.units_done / p.units_total * 100);
    const sd = p.synthesis_documents_done.length, se = p.synthesis_documents_expected.length;
    return `<div class="card" style="margin:1rem 0"><div class="eyebrow">Research program progress</div>
      <div class="scoregrid" style="margin-top:.5rem">
        <div><div class="lab">Research units complete: ${p.units_done} of ${p.units_total}</div><span class="bar" style="width:100%"><span class="track"><span class="fill" style="width:${pct}%"></span></span><span class="v">${pct}%</span></span></div>
        <div><div class="lab">Synthesis documents written: ${sd} of ${se}</div><span class="bar" style="width:100%"><span class="track"><span class="fill" style="width:${Math.round(sd / se * 100)}%"></span></span><span class="v">${Math.round(sd / se * 100)}%</span></span></div>
      </div>
      ${p.pending.length ? `<p class="small" style="margin:.5rem 0 0">Still to research: ${esc(p.pending.map(x => x.replace(/^[A-Z]\d+[a-z]?-/, '').replace(/-/g, ' ')).join(', '))}. The executive summary, rankings and product concepts are written after the research finishes.</p>` : ''}</div>`;
  }

  // ingredient finder: a readable list by default, the full sortable score table on request
  const dbs = { mode: 'simple', quick: 'all', q: '', cat: '', sort: 'best' };
  const DBQ = [
    ['all', 'All', () => true],
    ['today', 'Helps today', m => sortGrade(m._derived.best_grade_acute) >= GR.C],
    ['long', 'Helps long-term', m => sortGrade(m._derived.best_grade_chronic) >= GR.C],
    ['sleep', 'Under sleep loss', m => sortGrade(m._derived.best_grade_sleep_stress) >= GR.C],
    ['clear', 'No conditions', m => m._derived.eligibility === 'eligible'],
  ];
  const eligGate = m => m._derived.eligibility === 'eligible' ? 'pass' : m._derived.eligibility === 'ineligible' ? 'fail' : 'conditional';
  function viewDatabase() {
    const seg = `<div class="seg" role="group" aria-label="View">${[['simple', 'list', 'Simple list'], ['table', 'table', 'Full table']].map(([k, ic, l]) => `<button type="button" data-dbmode="${k}" aria-pressed="${dbs.mode === k}">${icon(ic)}${l}</button>`).join('')}</div>`;
    const nDraft = MONOS.filter(m => m._derived.review_status !== 'reviewed').length;
    const head = `<div class="page-head"><div><h1>Ingredients</h1><p class="lead">${MONOS.length} foods, nutrients, supplements and diets. Each shows its best grade for a same-day and for a long-term benefit, and whether it is safe and allowed. Open one for a plain yes-or-no answer and every study behind it.</p></div></div>`;
    if (dbs.mode === 'table') {
      return head + `<div class="db-meta"><span>Every score and gate, sortable: click a column header. Grade columns count only measured cognitive outcomes, never biomarkers or mood.</span>${seg}</div>
      ${draftBanner()}
      ${dataTable({ id: 'monos', columns: monoCols, rows: MONOS, filters: monoFilters, search: monoSearch, defaultSort: 'comp', pageSize: 500 })}`;
    }
    const fq = DBQ.find(x => x[0] === dbs.quick) || DBQ[0];
    const list = MONOS.filter(m => fq[2](m) && (!dbs.cat || m.category === dbs.cat));
    const best = m => Math.max(sortGrade(m._derived.best_grade_acute), sortGrade(m._derived.best_grade_chronic));
    const SORTS = [['best', 'Best evidence first', (a, b) => best(b) - best(a)], ['today', 'Best for today', (a, b) => sortGrade(b._derived.best_grade_acute) - sortGrade(a._derived.best_grade_acute)],
      ['long', 'Best long-term', (a, b) => sortGrade(b._derived.best_grade_chronic) - sortGrade(a._derived.best_grade_chronic)], ['score', 'Overall score', () => 0], ['az', 'A to Z', (a, b) => a.name.localeCompare(b.name)]];
    const so = SORTS.find(s => s[0] === dbs.sort) || SORTS[0];
    list.sort((a, b) => so[2](a, b) || (dbs.sort === 'az' ? 0 : b._derived.composite_score - a._derived.composite_score));
    const row = m => `<div class="ing-row" data-n="${esc(m.name.toLowerCase())}" data-s="${esc([m.name, (m.aliases || []).join(' '), (m.food_sources || []).join(' '), m.category_name].join(' ').toLowerCase())}">
      <span class="ing-main">${catAv(m)}<span class="ing-tx"><a class="ing-name ing-link" href="#ingredient.${esc(m.id)}">${esc(m.name)}<span class="ing-cat">${esc(m.category_name)}</span></a>${vTrio(m)}<span class="ing-verdict">${esc(m.one_line_verdict)}</span></span></span>
      <span class="ing-g"><span class="ing-gl">Today</span>${grade(m._derived.best_grade_acute)}</span>
      <span class="ing-g"><span class="ing-gl">Long-term</span>${grade(m._derived.best_grade_chronic)}</span>
      <span class="ing-g"><span class="ing-gl">Safe &amp; legal</span>${gate(eligGate(m))}</span>${cmpTog(m)}</div>`;
    return head + `<div class="db-tools">
      <label class="db-search">${icon('search')}<span class="sr">Search ingredients</span><input type="search" id="db-q" value="${esc(dbs.q)}" placeholder="Search by name or food…" autocomplete="off"></label>
      <div class="db-row"><div class="chips" role="group" aria-label="Show only">${DBQ.map(([k, l, f]) => `<button type="button" class="chip" data-dbq="${k}" aria-pressed="${dbs.quick === k}">${esc(l)}<span class="n">${MONOS.filter(f).length}</span></button>`).join('')}</div></div>
      <div class="db-row"><label>Category<select id="db-cat" class="field"><option value="">All categories</option>${CAT_OPTS.map(([v, l]) => `<option value="${esc(v)}"${dbs.cat === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label>Sort<select id="db-sort" class="field">${SORTS.map(([v, l]) => `<option value="${v}"${dbs.sort === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label><span class="spacer"></span>${seg}</div>
    </div>
    <div class="db-meta"><span><strong id="db-n">${list.length}</strong> shown. A grade is the best found for a benefit in any group of people: open the ingredient to see who.</span>${nDraft ? `<span class="small"><span class="badge conditional">Draft</span> ${nDraft} of ${MONOS.length} not yet independently reviewed</span>` : ''}</div>
    <div class="ing-list"><div class="ing-head" aria-hidden="true"><span>Ingredient</span><span>Today</span><span>Long-term</span><span>Safe &amp; legal</span><span>Compare</span></div>${list.map(row).join('')}</div>
    <div class="db-empty" id="db-empty"${list.length ? ' hidden' : ''}><p>No ingredient matches.</p><button type="button" class="btn sm" data-dbclear>Clear search and filters</button></div>`;
  }
  function dbFilter(app) {
    const words = dbs.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    // name matches float above matches on aliases or food sources
    app.querySelectorAll('.ing-row[data-s]').forEach(r => { const ok = words.every(w => r.dataset.s.includes(w)); r.hidden = !ok; if (ok) n++; r.style.order = words.length && !words.every(w => r.dataset.n.includes(w)) ? 1 : 0; });
    const c = document.getElementById('db-n'); if (c) c.textContent = n;
    const em = document.getElementById('db-empty'); if (em) em.hidden = n > 0;
  }
  function draftBanner() {
    const n = MONOS.filter(m => m._derived.review_status !== 'reviewed').length;
    return n ? `<div class="banner"><span class="badge conditional">draft</span><span>${n} of ${MONOS.length} monographs are drafts: written and self-audited by the research agents, with every citation matched to PubMed or Crossref, but not yet through the independent second review.</span></div>` : '';
  }

  // ---------- evidence matrix ----------
  const MATRIX_GROUPS = [
    ['Acute performance', ['alertness', 'sustained_attention', 'vigilance', 'reaction_time', 'processing_speed', 'working_memory', 'executive_function', 'cognitive_fatigue']],
    ['Memory & learning', ['learning', 'episodic_memory', 'learning_retention']],
    ['Long-term', ['global_cognition', 'cognitive_aging', 'cognitive_decline', 'dementia_risk']],
    ['Under strain', ['sleep_related_cognition', 'resistance_to_decline']],
    ['Not cognition', ['mood_stress', 'cerebral_blood_flow', 'vascular_health', 'neuroplasticity_biomarkers']],
  ];
  const MATRIX_POPS = [['all', 'All populations'], ['young', 'Young adults, students, workers (rested)'], ['sleep', 'Sleep-deprived'], ['older', 'Older adults (healthy)'], ['mci', 'Older adults with MCI'], ['deficient', 'Deficient / low baseline']];
  const POP_SETS = { young: new Set(['healthy_young_adults', 'students', 'knowledge_workers', 'high_cognitive_workload']), sleep: new Set(['sleep_deprived']), older: new Set(['older_adults_healthy']), mci: new Set(['older_adults_mci']), deficient: new Set(['deficient_or_low_baseline']) };
  const mst = { pop: 'all', tf: 'all', sort: 'best' };
  function cellFor(m, dom) {
    const rows = (m.evidence_by_outcome || []).filter(r => r.domain === dom && (mst.pop === 'all' || POP_SETS[mst.pop].has(r.population)) && (mst.tf === 'all' || (mst.tf === 'acute' ? r.timeframe === 'acute' : r.timeframe !== 'acute')));
    if (!rows.length) return null;
    const ben = rows.filter(r => ['benefit', 'possible_benefit'].includes(r.direction) && GR[r.grade]);
    const harm = rows.filter(r => r.direction === 'harm');
    const best = ben.sort((a, b) => GR[b.grade] - GR[a.grade])[0];
    const tip = rows.map(r => `${r.grade} ${lab(DIR_LABEL, r.direction)} · ${lab(POP_LABEL, r.population)} · ${lab(TF_LABEL, r.timeframe)} · ${r.dose_or_intake || ''}`).join('\n');
    if (best && best.grade !== 'E') return { cls: 'b-' + best.grade, txt: best.grade, tip };
    if (harm.length) return { cls: 'h', txt: '!', tip };
    const nb = rows.find(r => r.direction === 'no_benefit');
    return { cls: 'n', txt: nb ? '×' : '~', tip };
  }
  function viewMatrix() {
    const doms = MATRIX_GROUPS.flatMap(g => g[1]);
    let monos = MONOS.slice();
    const score = m => { let s = 0; doms.forEach(d => { const c = cellFor(m, d); if (c && c.cls.startsWith('b-') && !MATRIX_GROUPS[4][1].includes(d)) s = Math.max(s, GR[c.txt]); }); return s; };
    if (mst.sort === 'best') monos.sort((a, b) => score(b) - score(a) || b._derived.composite_score - a._derived.composite_score);
    else if (mst.sort === 'cat') monos.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else monos.sort((a, b) => a.name.localeCompare(b.name));
    const shown = monos.filter(m => doms.some(d => cellFor(m, d)));
    const head1 = '<tr><th></th>' + MATRIX_GROUPS.map((g, i) => `${i ? '<th class="gap"></th>' : ''}<th class="grp" colspan="${g[1].length}">${esc(g[0])}</th>`).join('') + '</tr>';
    const SHORT = { resistance_to_decline: 'Sustained performance', neuroplasticity_biomarkers: 'Brain biomarkers', sleep_related_cognition: 'Under sleep loss', vascular_health: 'Vascular health' };
    const head2 = '<tr><th>Ingredient</th>' + MATRIX_GROUPS.map((g, i) => (i ? '<th class="gap"></th>' : '') + g[1].map(d => `<th class="dom" title="${esc(lab(DOMAIN_LABEL, d))}">${esc(SHORT[d] || lab(DOMAIN_LABEL, d))}</th>`).join('')).join('') + '</tr>';
    const body = shown.map(m => `<tr><td class="name"><a href="#ingredient.${esc(m.id)}" title="${esc(m.one_line_verdict)}">${esc(m.name)}</a></td>` + MATRIX_GROUPS.map((g, i) => (i ? '<td class="gap"></td>' : '') + g[1].map(d => { const c = cellFor(m, d); return c ? `<td class="cell ${c.cls}" title="${esc(lab(DOMAIN_LABEL, d) + '\n' + c.tip)}"><a href="#ingredient.${esc(m.id)}">${esc(c.txt)}</a></td>` : '<td class="cell"></td>'; }).join('')).join('') + '</tr>').join('');
    const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    return `<div class="page-head"><div><h1>Evidence matrix</h1><p class="lead">Every ingredient against every outcome the literature measured. A filled square is the best grade for a <em>benefit</em>; an outlined square means it was studied and showed no benefit (×) or inconsistent results (~); a red square marks a negative effect. Hover a square for the underlying rows; click to open the monograph.</p></div></div>
    <div class="filters"><label>Population${sel('mx-pop', MATRIX_POPS, mst.pop)}</label><label>Timeframe${sel('mx-tf', [['all', 'Acute and long-term'], ['acute', 'Acute only (single dose / day)'], ['chronic', 'Repeated use (days or longer)']], mst.tf)}</label><label>Order${sel('mx-sort', [['best', 'Best cognitive grade first'], ['cat', 'By category'], ['name', 'A to Z']], mst.sort)}</label><span class="spacer"></span><span class="small">${shown.length} of ${MONOS.length} ingredients have rows for this selection</span></div>
    <div class="legend"><span><span class="sw" style="background:var(--gA);color:#fff">A</span>strong</span><span><span class="sw" style="background:var(--gB);color:#fff">B</span>moderate</span><span><span class="sw" style="background:var(--gC);color:#fff">C</span>limited</span><span><span class="sw" style="background:var(--gD);color:#fff">D</span>preliminary</span><span><span class="sw" style="box-shadow:inset 0 0 0 1.5px var(--border-strong)">×</span>no benefit</span><span><span class="sw" style="box-shadow:inset 0 0 0 1.5px var(--border-strong)">~</span>inconsistent</span><span><span class="sw" style="background:var(--gE-soft);box-shadow:inset 0 0 0 1.5px var(--gE);color:var(--gE)">!</span>negative effect</span></div>
    <div class="tbl-wrap" style="padding:.5rem"><table class="matrix"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>
    <p class="small">The last group (mood, blood flow, vascular, biomarkers) is shown for completeness but is not cognition: a change there does not mean better thinking.</p>`;
  }

  // ---------- compare ----------
  let CMP = [];
  function viewCompare(param) {
    if (param) CMP = param.split(',').filter(id => byId[id]).slice(0, 4);
    if (!CMP.length) CMP = ['caffeine', 'l-theanine', 'creatine'].filter(id => byId[id]);
    const opts = MONOS.slice().sort((a, b) => a.name.localeCompare(b.name));
    const picker = [0, 1, 2, 3].map(i => `<select id="cmp-${i}" data-slot="${i}" aria-label="Ingredient ${i + 1}"><option value="">${i < CMP.length ? 'Remove' : 'Add an ingredient…'}</option>${opts.map(m => `<option value="${esc(m.id)}" ${CMP[i] === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`).join('');
    const ms = CMP.map(id => byId[id]);
    const row = (label, f) => `<tr><th class="rowh">${esc(label)}</th>${ms.map(m => `<td class="wrap">${f(m)}</td>`).join('')}</tr>`;
    const benefitList = m => { const b = m._derived.benefit_domains || {}; const k = Object.keys(b).sort((x, y) => GR[b[y]] - GR[b[x]]); return k.length ? k.map(d => `${grade(b[d])} ${esc(lab(DOMAIN_LABEL, d))}`).join('<br>') : '<span class="muted">none</span>'; };
    const nulls = m => { const r = (m.evidence_by_outcome || []).filter(x => x.direction === 'no_benefit' && ['A', 'B'].includes(x.grade)); return r.length ? r.map(x => `${grade(x.grade)} ${esc(lab(DOMAIN_LABEL, x.domain))} · ${esc(lab(POP_LABEL, x.population))}`).join('<br>') : '<span class="muted">none</span>'; };
    const table = ms.length ? `<div class="tbl-wrap"><table class="tbl cmp"><thead><tr><th class="rowh"></th>${ms.map(m => `<th><span class="cmp-h">${catAv(m, 'sm')}<a href="#ingredient.${esc(m.id)}">${esc(m.name)}</a></span></th>`).join('')}</tr></thead><tbody>
      ${row('Does it help?', m => `<span class="cmp-qa">${QA_GOALS.map(([q, , doms, onlyTf], i) => { const x = quickAnswer(m, doms, onlyTf); return `<span class="qa-a ${(VERDICT[x.a] || VERDICT.Unclear)[1]}">${vIcon(x.a)}<span><small>${VT_SHORT[i]}</small>${esc(x.a)}</span></span>`; }).join('')}</span>`)}
      ${row('Verdict', m => esc(m.one_line_verdict))}
      ${row('Eligibility', m => `${gate(m._derived.safety_gate)} safety<br>${gate(m._derived.regulatory_gate)} regulatory`)}
      ${row('Composite score', m => `<strong class="mono">${m._derived.composite_score.toFixed(1)}</strong> / 10`)}
      ${row('Evidence quality', m => bar(m.scores.evidence_quality))}
      ${row('Effect size', m => bar(m.scores.effect_magnitude))}
      ${row('Safety', m => bar(m.scores.safety))}
      ${row('Food suitability', m => bar(m.scores.food_suitability))}
      ${row('Cost / access', m => bar(m.scores.cost_access))}
      ${row('Best grade: acute', m => grade(m._derived.best_grade_acute))}
      ${row('Best grade: long-term', m => grade(m._derived.best_grade_chronic))}
      ${row('Best grade: young adults', m => grade(m._derived.best_grade_young_adults))}
      ${row('Best grade: sleep loss', m => grade(m._derived.best_grade_sleep_stress))}
      ${row('Benefit by domain', benefitList)}
      ${row('Strong null findings (A/B)', nulls)}
      ${row('Daily use', m => esc((m.safety || {}).daily_use_appropriate || '—'))}
      ${row('Sleep impact', m => inline((m.safety || {}).sleep_impact || '—'))}
      ${row('Upper limits', m => inline((m.safety || {}).upper_limits || '—'))}
      ${row('Interactions', m => esc(((m.safety || {}).drug_interactions || []).join('; ') || '—'))}
      ${row('Dose feasibility in food', m => inline((m.formulation || {}).dose_feasibility || '—'))}
      ${row('Authorised claims', m => fmtList((m.regulatory || {}).permitted_claims_examples))}
      ${row('Studies (verified)', m => `<span class="mono">${m._derived.n_verified} / ${m._derived.n_studies}</span>`)}
    </tbody></table></div>` : '<p class="muted">Pick at least one ingredient.</p>';
    return `<div class="page-head"><div><h1>Compare ingredients</h1><p class="lead">Up to four ingredients side by side: hard gates, transparent scores, best grades by population, strong null findings, safety and the claims that are actually authorised.</p></div></div>
    <div class="cmp-pick">${picker}</div>${table}`;
  }

  // ---------- navigation ----------

  function evidenceTable(id, rows, extraFilters) {
    const domains = [...new Set(rows.map(r => r.domain))].map(d => [d, lab(DOMAIN_LABEL, d)]).sort((a, b) => a[1].localeCompare(b[1]));
    const pops = [...new Set(rows.map(r => r.population))].map(p => [p, lab(POP_LABEL, p)]).sort((a, b) => a[1].localeCompare(b[1]));
    return dataTable({
      id, rows, defaultSort: 'grade', pageSize: 150,
      columns: [
        { key: 'ing', label: 'Ingredient', sort: r => r._m.name.toLowerCase(), render: r => `<a href="#ingredient.${esc(r._m.id)}">${esc(r._m.name)}</a>`, cls: 'tight' },
        { key: 'domain', label: 'Domain', sort: r => r.domain, render: r => esc(lab(DOMAIN_LABEL, r.domain)) },
        { key: 'pop', label: 'Population', sort: r => r.population, render: r => `${esc(lab(POP_LABEL, r.population))}<br><small>${esc(r.population_detail || '')}</small>`, cls: 'wrap' },
        { key: 'tf', label: 'Timeframe', sort: r => r.timeframe, render: r => tf(r.timeframe) },
        { key: 'dose', label: 'Dose / intake', sort: false, render: r => esc(r.dose_or_intake), cls: 'wrap' },
        { key: 'dur', label: 'Duration', sort: false, render: r => esc(r.duration) },
        { key: 'grade', label: 'Grade', sort: r => sortGrade(r.grade), render: r => grade(r.grade) },
        { key: 'dir', label: 'Direction', sort: r => r.direction, render: r => dir(r.direction) },
        { key: 'eff', label: 'Effect', sort: false, render: r => `${inline(r.effect_summary)}<br><small class="mono">${esc(r.effect_estimate)}</small>`, cls: 'wrap' },
        { key: 'cert', label: 'Certainty notes', sort: false, render: r => inline(r.certainty_notes), cls: 'wrap' },
      ],
      filters: [
        { key: 'domain', label: 'Domain', options: domains, match: (r, v) => r.domain === v },
        { key: 'pop', label: 'Population', options: pops, match: (r, v) => r.population === v },
        { key: 'grade', label: 'Grade', options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E']], match: (r, v) => r.grade === v },
        { key: 'dir', label: 'Direction', options: Object.entries(DIR_LABEL), match: (r, v) => r.direction === v },
        { key: 'cat', label: 'Category', options: CAT_OPTS, match: (r, v) => r._m.category === v },
        { key: 'tf', label: 'Timeframe', options: Object.entries(TF_LABEL), match: (r, v) => r.timeframe === v },
      ].concat(extraFilters || []),
      search: (r, q) => (r._m.name + ' ' + r.effect_summary + ' ' + r.population_detail).toLowerCase().includes(q),
    });
  }
  function viewAcute() {
    const rows = ROWS.filter(r => r.timeframe === 'acute');
    const mrows = []; MONOS.forEach(m => (m.acute_matrix || []).forEach(r => mrows.push(Object.assign({ _m: m }, r))));
    const sy = SYN['acute-synthesis'];
    return `<div class="page-head"><div><h1>Acute cognitive performance ${tf('acute')}</h1><p class="lead">Interventions tested within minutes to one day: alertness, attention, reaction time, working memory, executive function, fatigue. Alertness is not memory, and feeling focused is not performing better.</p></div></div>
    ${sy ? `<div class="card prose"><h3>Synthesis</h3>${md(sy.summary)}</div>${(sy.domains || []).map(d => `<div class="section prose"><h2>${esc(lab(DOMAIN_LABEL, d.domain) || d.domain)}</h2>${md(d.conclusion)}${d.best_supported && d.best_supported.length ? '<h4>Best supported</h4>' + structured(d.best_supported.map(x => Object.assign({}, x, { ingredient: byId[x.monograph_id] ? byId[x.monograph_id].name : x.monograph_id }))) : ''}${d.not_supported && d.not_supported.length ? '<h4>Not supported / insufficient</h4>' + structured(d.not_supported) : ''}${d.uncertainties ? '<h4>Uncertainties</h4>' + md(d.uncertainties) : ''}</div>`).join('')}${(sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('')}` : `<div class="section">${pending('The acute-evidence narrative synthesis', 'research/syntheses/acute-synthesis.json')}</div>`}
    <div class="section"><h2>Acute evidence rows (graded)</h2>${evidenceTable('acute-rows', rows)}</div>
    <div class="section"><h2>Acute Cognitive Performance Evidence Matrix (dose · onset · duration)</h2>${dataTable({ id: 'acute-matrix', rows: mrows, defaultSort: 'ing', defaultDir: 'asc', pageSize: 150, columns: [
      { key: 'ing', label: 'Ingredient', sort: r => r._m.name.toLowerCase(), render: r => `<a href="#ingredient.${esc(r._m.id)}">${esc(r._m.name)}</a>`, cls: 'tight' },
      { key: 'dose', label: 'Dose studied', sort: false, render: r => esc(r.dose), cls: 'wrap' }, { key: 'onset', label: 'Onset', sort: false, render: r => esc(r.onset) },
      { key: 'dur', label: 'Duration studied', sort: false, render: r => esc(r.duration_studied) }, { key: 'domain', label: 'Domain', sort: r => r.domain, render: r => esc(lab(DOMAIN_LABEL, r.domain) || r.domain) },
      { key: 'pop', label: 'Population', sort: false, render: r => esc(r.population), cls: 'wrap' }, { key: 'eff', label: 'Effect estimate', sort: false, render: r => inline(r.effect_estimate), cls: 'wrap' },
      { key: 'cert', label: 'Certainty', sort: false, render: r => inline(r.certainty), cls: 'wrap' }, { key: 'saf', label: 'Safety', sort: false, render: r => inline(r.safety), cls: 'wrap' },
      { key: 'st', label: 'Studies', sort: false, render: r => (r.study_ids || []).map(s => `<a href="#ingredient.${esc(r._m.id)}" title="see study ${esc(s)} in the monograph">${esc(s)}</a>`).join(', ') },
    ], filters: [{ key: 'cat', label: 'Category', options: CAT_OPTS, match: (r, v) => r._m.category === v }], search: (r, q) => (r._m.name + ' ' + r.domain + ' ' + r.population).toLowerCase().includes(q) })}</div>`;
  }
  // ---------- figures: horizontal bars on one shared scale (effect sizes, time windows, caffeine amounts) ----------
  // row: { l, s, segs: [{ a, b, cls }], lab, tip, ev, src: [label, 'pm:PMID' | 'ing:id'] } or { group }
  // cls: 'boost' | 'cost', plus 'lite' (range / "up to") or 'fade' (uncertain end). Every figure ships a table twin.
  function barFig(o) {
    const pct = v => Math.max(0, Math.min(100, v / o.max * 100)).toFixed(2);
    const srcLink = s => !s ? '' : s[1].startsWith('pm:') ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${esc(s[1].slice(3))}/" target="_blank" rel="noopener">${esc(s[0])}</a>` : `<a href="#ingredient.${esc(s[1].slice(4))}">${esc(s[0])}</a>`;
    const ticks = (o.ticks || []).map(([v, , ref]) => `<i class="bf-tick${ref ? ' ref' : ''}" style="left:${pct(v)}%"></i>`).join('');
    const rows = o.rows.map(r => r.group ? `<div class="bf-group">${esc(r.group)}</div>` : `<div class="bf-row" tabindex="0" data-tip="${esc(r.tip || '')}"${r.ev ? ` data-ev="${esc(r.ev)}"` : ''}>
        <div class="bf-l"><b>${esc(r.l)}</b>${r.s ? `<small>${esc(r.s)}</small>` : ''}</div>
        <div class="bf-track">${ticks}${r.segs.map(s => `<span class="bf-bar ${s.cls}" style="left:${pct(s.a)}%;width:${(pct(s.b) - pct(s.a)).toFixed(2)}%"></span>`).join('')}${valueLabel(r)}</div></div>`).join('');
    // a value near the right edge sits inside the bar end instead of overflowing the track (white on a solid fill)
    function valueLabel(r) {
      const end = Math.max(...r.segs.map(s => s.b)), last = r.segs[r.segs.length - 1];
      if (end / o.max <= 0.62) return `<span class="bf-v" style="left:${pct(end)}%">${esc(r.lab)}</span>`;
      return `<span class="bf-v flip${/lite|fade/.test(last.cls) ? '' : ' inv'}" style="right:${(100 - pct(end)).toFixed(2)}%">${esc(r.lab)}</span>`;
    }
    const axis = `<div class="bf-row bf-axis" aria-hidden="true"><div class="bf-l"></div><div class="bf-track">${(o.ticks || []).map(([v, l, ref]) => `<span class="bf-at${ref ? ' ref' : ''}${v <= 0 ? ' start' : v / o.max > 0.9 ? ' end' : ''}" style="left:${pct(v)}%">${esc(l)}</span>`).join('')}</div></div>`;
    const table = o.table ? `<details class="fig-table"><summary>Show as a table, with sources</summary><div class="tbl-wrap"><table class="tbl"><thead><tr>${o.table.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${o.rows.filter(r => !r.group).map(r => `<tr>${o.table.cells(r).map((c, i) => `<td${i ? ' class="wrap"' : ''}>${i === o.table.head.length - 1 ? srcLink(r.src) : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>` : '';
    return `<figure class="fig barfig${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''}>
      <figcaption class="fig-h"><b>${esc(o.title)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</figcaption>
      ${o.legend ? `<div class="fig-legend">${o.legend.map(([c, l]) => `<span><i class="sw ${c}"></i>${esc(l)}</span>`).join('')}</div>` : ''}
      <div class="bf">${rows}${axis}</div>
      ${o.note ? `<p class="fig-note">${o.note}</p>` : ''}${table}</figure>`;
  }
  // effect sizes: what a brake costs vs what a booster adds (|g| or |SMD|; signs dropped, outcomes differ)
  function brakesFigure() {
    const one = v => [{ a: 0, b: v, cls: '' }];
    const rows = [
      { group: 'Brakes: what the problem costs you' },
      { l: 'One night without sleep', s: 'lapses in simple attention', segs: one(0.78), lab: '0.78', cls: 'cost', tip: 'Hedges’ g −0.78 (95% CI −0.96 to −0.60) across 70 studies. Lim & Dinges 2010. Not graded here.', src: ['Lim & Dinges 2010', 'pm:20438143'], who: 'Healthy adults, under 48 h awake' },
      { l: 'Sleep loss before learning', s: 'how much you later remember', segs: one(0.62), lab: '0.62', cls: 'cost', tip: 'Hedges’ g 0.62 (0.47–0.77). Newbury et al. 2021. Not graded here.', src: ['Newbury et al. 2021', 'pm:35238586'], who: 'Adults, one night of total sleep loss' },
      { l: 'Low iron, corrected', s: 'intelligence-test scores', segs: one(0.46), lab: '0.46', cls: 'cost', tip: 'SMD 0.46 when school-age children were given iron; larger in anaemic children. Atlas grade B.', ev: 'iron:B:chronic', src: ['Iron', 'ing:iron'], who: 'School-age children (mostly low- and middle-income countries)' },
      { group: 'Boosters' },
      { l: 'Caffeine, sleep-deprived', s: 'reaction time', segs: one(1.11), lab: '1.11', cls: 'boost', tip: 'g 1.11 (0.75–1.47). Atlas grade A. A brake being released: rested, the same caffeine gives 0.28.', ev: 'caffeine:A:acute', src: ['Caffeine', 'ing:caffeine'], who: 'Sleep-deprived adults' },
      { l: 'L-theanine', s: 'choice reaction time, about 18 ms faster', segs: one(0.35), lab: '0.35', cls: 'boost', tip: 'SMD −0.35 (−0.61 to −0.10). Atlas grade B.', ev: 'l-theanine:B:acute', src: ['L-theanine', 'ing:l-theanine'], who: 'Healthy young adults' },
      { l: 'Caffeine + L-theanine', s: 'attention-switching accuracy', segs: one(0.33), lab: '0.33', cls: 'boost', tip: 'SMD 0.33 (0.13–0.54). Atlas grade B.', ev: 'l-theanine:B:acute', src: ['L-theanine', 'ing:l-theanine'], who: 'Healthy young adults' },
      { l: 'Caffeine, rested', s: 'reaction time', segs: one(0.28), lab: '0.28', cls: 'boost', tip: 'g 0.28 across 31 trials. Atlas grade A.', ev: 'caffeine:A:acute', src: ['Caffeine', 'ing:caffeine'], who: 'Healthy young adults' },
      { l: 'One bout of exercise', s: 'overall cognitive performance', segs: one(0.10), lab: '0.10', cls: 'boost', tip: 'g 0.10 across 79 studies; larger for some tasks and intensities. Chang et al. 2012. Not graded here.', src: ['Chang et al. 2012', 'pm:22480735'], who: 'Mixed adults' },
      { l: 'Multivitamin over 60, 2–3 years', s: 'global cognition', segs: one(0.07), lab: '0.07', cls: 'boost', tip: '0.07 SD pooled across the COSMOS trials. Atlas grade B.', ev: 'multivitamin-mineral-supplements:B:chronic', src: ['Multivitamin', 'ing:multivitamin-mineral-supplements'], who: 'Adults over 60' },
    ];
    rows.forEach(r => { if (r.segs) r.segs.forEach(s => { s.cls = r.cls; }); });
    return barFig({ id: 'fig-brakes', title: 'Why remove first: brakes cost more than boosters give', sub: 'Effect size (Hedges’ g or SMD) from meta-analyses and trials. A longer bar is a bigger effect.',
      legend: [['cost', 'Brake: the cost of the problem'], ['boost', 'Booster: the gain']], rows, max: 1.4,
      ticks: [[0, '0'], [0.2, '0.2 small'], [0.5, '0.5 medium'], [0.8, '0.8 large']],
      note: 'The studies measured different things, so compare the bars roughly, not exactly. The one big booster, caffeine on a sleep-deprived brain, is itself a brake being released: on a rested brain the same caffeine gives about a quarter of that.',
      table: { head: ['Item', 'Outcome', 'Effect size', 'Who was studied', 'Source'], cells: r => [r.l, r.s, r.lab, r.who, ''] } });
  }
  // when each pill ingredient works, and how long caffeine can cost sleep
  function timingFigure() {
    const rows = [
      { l: 'Caffeine', s: 'alertness, attention, reaction time', segs: [{ a: 0.5, b: 3, cls: 'boost' }, { a: 3, b: 4, cls: 'boost fade' }], lab: '0.5–4 h', tip: 'Take 30–60 minutes before the task; peaks within about an hour and runs 3–4 hours.', src: ['Caffeine', 'ing:caffeine'] },
      { l: 'Caffeine: sleep cost', s: 'if it is still in you at bedtime', segs: [{ a: 0, b: 9, cls: 'cost lite' }, { a: 9, b: 13, cls: 'cost lite fade' }], lab: 'up to 9–13 h', tip: 'Caffeine taken 0–13 hours before bed cut total sleep by about 45 minutes in pooled trials (atlas grade A).', ev: 'caffeine:A:acute', src: ['Caffeine', 'ing:caffeine'] },
      { l: 'L-theanine', s: 'smoother focus, with caffeine', segs: [{ a: 0.5, b: 2, cls: 'boost' }], lab: '≈0.5–2 h', tip: 'Peaks in the blood about 0.8 hours after a dose; effect window within about 2 hours.', src: ['L-theanine', 'ing:l-theanine'] },
      { l: 'American ginseng', s: 'working memory', segs: [{ a: 1, b: 3, cls: 'boost' }], lab: '1–3 h', tip: 'Benefit measured 1 to about 3 hours after a single dose.', src: ['American ginseng', 'ing:american-ginseng-cereboost'] },
      { l: 'Creatine, big dose', s: 'sleep-deprived only', segs: [{ a: 1.5, b: 3, cls: 'boost' }, { a: 3, b: 5, cls: 'boost fade' }], lab: 'from 1.5–3 h', tip: 'A single large dose taken 1.5–3 hours before testing; how long the effect lasts was not measured.', src: ['Creatine', 'ing:creatine'] },
    ];
    return barFig({ id: 'fig-timing', cls: 'timing', title: 'When it works, and what it costs', sub: 'Hours after taking it. Faded ends mark where the studies stop being precise.',
      legend: [['boost', 'Works'], ['cost lite', 'Can cut sleep']], rows, max: 14, ticks: [0, 2, 4, 6, 8, 10, 12, 14].map(h => [h, h + ' h']),
      note: 'The boost lasts a few hours; the sleep cost can last into the night. That is why the last dose should be about 9 hours before bed.',
      table: { head: ['Ingredient', 'What', 'Window', 'Source'], cells: r => [r.l, r.s, r.lab, ''] } });
  }
  // how fast caffeine adds up against the EFSA single-dose and daily limits
  function caffeineFigure() {
    const rng = (lo, hi) => hi > lo ? [{ a: 0, b: lo, cls: 'boost' }, { a: lo, b: hi, cls: 'boost lite' }] : [{ a: 0, b: lo, cls: 'boost' }];
    const rows = [
      { l: 'Limitless Pill core', s: 'one capsule', segs: rng(75, 100), lab: '75–100 mg', src: ['Caffeine', 'ing:caffeine'] },
      { l: 'Cup of tea', s: 'black or green', segs: rng(37.5, 75), lab: '≈40–75 mg', src: ['Tea', 'ing:tea-and-green-tea'] },
      { l: 'Matcha', s: 'one 2.7 g serving', segs: rng(70, 70), lab: '≈70 mg', src: ['Tea and matcha', 'ing:tea-and-green-tea'] },
      { l: 'Energy drink', s: '250 ml can', segs: rng(80, 80), lab: '80 mg', src: ['Energy drinks', 'ing:energy-drinks-and-stimulant-beverages'] },
      { l: 'Coffee', s: 'one shop cup', segs: rng(58, 259), lab: '58–259 mg', src: ['Coffee', 'ing:coffee'] },
      { l: 'Energy drink', s: 'large can', segs: rng(160, 300), lab: '160–300 mg', src: ['Energy drinks', 'ing:energy-drinks-and-stimulant-beverages'] },
    ];
    rows.forEach(r => { r.tip = `${r.l}, ${r.s}: ${r.lab} of caffeine.`; });
    return barFig({ id: 'fig-caffeine', cls: 'caffeine', title: 'How fast caffeine adds up', sub: 'Caffeine per serving. Dark lines: the EU safety limits for healthy adults (EFSA), 200 mg at once and 400 mg in a day.',
      legend: [['boost', 'Typical minimum'], ['boost lite', 'Up to']], rows, max: 450,
      ticks: [[0, '0'], [100, '100'], [200, '200 mg', true], [300, '300'], [400, '400 mg', true]],
      note: 'One shop coffee can hold more caffeine than the pill, and a large energy drink can pass the 200 mg single-dose limit on its own. Count every source toward 400 mg a day; pregnancy: 200 mg a day.',
      table: { head: ['Source', 'Serving', 'Caffeine', 'Source'], cells: r => [r.l, r.s, r.lab, ''] } });
  }

  function viewPill() {
    const stack = [
      { id: 'caffeine', best: 'Alertness, attention and reaction time', kpi: [['Effect', 'g 0.28', 'reaction time, rested'], ['Starts', '30–60 min', 'peaks within ~1 h'], ['Lasts', '3–4 h', 'sleep cost up to 9–13 h']], dose: '100–200 mg (roughly one strong cup of coffee), once', timing: 'Take 30–60 min before the task; effect peaks within about an hour and runs 3–4 h.',
        what: 'The single best-proven acute cognitive lever in the whole database. Reaction time improves within minutes (31-trial meta-analysis, g = 0.28, dose-dependent up to ~200 mg+), and sustained attention/vigilance accuracy improves (pooled g = 0.27). Benefits hold even in light or non-habitual users, not just caffeine-withdrawn ones.',
        rescue: 'Under sleep deprivation the effect is much larger, not smaller: 100–600 mg produced g = 0.86 (attention response time), g = 1.11 (reaction time) and restored psychomotor vigilance after 64 h awake comparably to modafinil 400 mg or d-amphetamine 20 mg.',
        catch_: 'Executive function gains are smaller and inconsistent (g = 0.35, mixed across specific tasks). Raises anxiety/jitteriness in low/non-consumers and reliably harms sleep if taken within about 9–13 h of bedtime — the "cost" of a stimulant stack is paid at night.' },
      { id: 'l-theanine', best: 'Smoother focus, with less jitter, alongside caffeine', kpi: [['Effect', '−18 ms', 'choice reaction time'], ['Starts', '≈0.5–1 h', 'blood peak at 0.8 h'], ['Lasts', '≈2 h', 'same window as caffeine']], dose: '100–200 mg, alongside the caffeine dose above', timing: 'Same time as caffeine; effect window similar (within ~2 h).',
        what: 'Speeds choice/recognition reaction time by ~15–20 ms alone. Its main value is pairing with caffeine: the combination improves alertness and attention-switching accuracy with less of the jitteriness caffeine causes alone — though the trial literature says caffeine dose explains most of the combined effect, and two trials found no extra benefit over caffeine alone.',
        rescue: null,
        catch_: 'Simple reaction time does not improve in pooled analyses. This is a smoothing agent for caffeine, not an independent enhancer at the available doses.' },
      { id: 'creatine', best: 'Thinking speed on a sleep-deprived brain only', kpi: [['Effect', 'up to 12%', 'less decline when sleep-deprived'], ['Starts', '1.5–3 h', 'after one large dose'], ['Lasts', 'not measured', '']], dose: '0.2–0.35 g/kg (about 14–25 g for a 70 kg adult), single dose, 1.5–3 h before testing', timing: 'Take 1.5–3 h ahead — onset is slower than caffeine.',
        what: 'The rescue ingredient for sleep-deprived cognition specifically: a single large dose improved processing speed on language, logic and numeric tasks plus PVT reaction speed during sleep deprivation, tracking measurable brain-energy changes (PCr/Pi, ATP, prevented cerebral pH drop).',
        rescue: 'This is its one acute use case — do not expect it to sharpen a rested, well-slept brain.',
        catch_: 'In rested healthy adults, acute single-dose creatine for working memory is graded D (insufficient evidence) — it does essentially nothing for a brain that is not short on sleep or energy. The acute dose (14–25 g) is well above Brain Food\'s proposed 5 g/day daily cap, so this is an occasional-use rescue dose, not a daily stack component.' },
      { id: 'american-ginseng-cereboost', best: 'Working memory', kpi: [['Effect', 'all doses', 'improved spatial working memory'], ['Starts', '1–3 h', 'after one dose'], ['Lasts', '~3 h tested', 'not measured beyond']], dose: '100–200 mg standardized extract (10.65% ginsenosides), single dose', timing: 'Take 1–3 h before the task — effect was measured at post-dose testing through about 3 h.',
        what: 'The one botanical with real acute single-dose human trial evidence for working memory: all tested doses (100/200/400 mg) improved spatial working memory (Corsi block test); 200 mg improved a composite working-memory factor in knowledge workers specifically, with no change in mood or blood glucose.',
        rescue: null,
        catch_: 'Only two small industry-sponsored trials behind this; no long-term safety data exists, so the safety gate is conditional, not a clean pass.' },
    ];
    const notStack = [
      { id: 'tea-and-green-tea', why: 'Real acute alertness/attention benefit, but it is the caffeine in it doing the work (37.5–75 mg per cup) — a weaker, slower version of the coffee effect, not an addition to it.' },
      { id: 'cocoa-flavanols', why: 'Improves cerebral blood flow acutely (grade B) but blood flow is a mechanistic/surrogate marker, not a measured cognitive-performance outcome — it did not make the stack because the benefit domain itself does not count as enhancement.' },
      { id: 'resveratrol', why: 'Same issue as cocoa flavanols: acute cerebral-blood-flow grade B, but no acute cognitive-outcome data behind it.' },
      { id: 'multi-ingredient-nootropic-blends', why: 'Grade B for sustained attention exists only at the level of proprietary multi-ingredient blends as tested — it cannot be decomposed into which single ingredient did the work, so it is not addable here.' },
      { id: 'energy-drinks-and-stimulant-beverages', why: 'The attention/vigilance benefit is again the caffeine (plus sugar) in the can; the format adds taurine, sugar and other additives with their own evidence/safety profile covered on its own monograph page, not a reason to prefer it over plain caffeine.' },
    ];
    const ICON = {
      acute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>',
      short_term_days: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8.5 14.5l2 2 4.5-4.5"/></svg>',
      chronic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8.5"/><path d="M12 12.5c0-4.2 3-6.8 7.5-6.8.3 4.3-2.3 7.5-7.5 7.5"/><path d="M12 13.2c0-3.1-2.2-5.4-6-5.4-.2 3 1.5 5.7 6 5.7"/></svg>',
      warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9.3v4"/><circle cx="12" cy="16.4" r=".4" fill="currentColor" stroke="none"/><path d="M10.3 3.9 2.6 17.5A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.5L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
      dot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3 4.7-5"/></svg>',
    };
    const catchBox = (t, cls) => `<div class="rc-catch${cls ? ' ' + cls : ''}">${ICON.warn}<div><strong>The catch:</strong> ${esc(t)}</div></div>`;
    const card = (s, rank) => { const m = byId[s.id]; if (!m) return ''; const d = m._derived; return `<div class="stack-card">
      <div class="stack-rank">${rank}</div>
      <div class="stack-body">
        <div class="rc-head" style="margin-bottom:.15rem"><div class="stack-t">${catAv(m)}<div><h3 style="margin:0 0 .15rem">${monoLink(s.id)}</h3><p class="stack-dose">${esc(s.dose)}</p></div></div>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">${tf('acute')}${grade(d.best_grade_acute)}${gate(d.safety_gate)}</div></div>
        <p class="stack-best">${icon('target')}<span><b>Best for:</b> ${esc(s.best)}</span></p>
        <div class="kpis">${s.kpi.map(([k, v, sub]) => `<div class="kpi"><span class="kpi-k">${esc(k)}</span><span class="kpi-v">${esc(v)}</span>${sub ? `<span class="kpi-s">${esc(sub)}</span>` : ''}</div>`).join('')}</div>
        ${catchBox(s.catch_, 'small')}
        <details class="stack-more"><summary>The full evidence</summary><p class="small muted">${esc(s.timing)}</p><p>${esc(s.what)}</p>${s.rescue ? `<p><strong>Sleep-deprivation rescue:</strong> ${esc(s.rescue)}</p>` : ''}</details>
      </div></div>`; };
    const recipes = [
      { tfKey: 'acute', title: 'Double Matcha Focus Shot', subtitle: 'Ready in 5 minutes · effective window about 1–4 h after drinking',
        ingredients: ['5–6 g ceremonial-grade matcha (two standard 2.5–3 g servings)', '150 ml hot water, 70–80 °C', 'Optional: 100 ml warm milk or oat milk, for a latte version'],
        method: ['Sift the matcha into a bowl to break up clumps.', 'Add a splash of the hot water and whisk briskly in a "W" motion until frothy.', 'Add the rest of the hot water (and milk, if making a latte).', 'Drink 30–60 minutes before the task that needs the edge.'],
        evidence: [['tea-and-green-tea', 'B', 'Matcha\'s own measured content: about 70 mg caffeine and 50 mg L-theanine per 2.7 g, so this 5–6 g shot delivers roughly 140–150 mg caffeine and 95–110 mg theanine.'], ['caffeine', 'A', 'That caffeine amount sits inside the 40–300 mg range with proven acute reaction-time and sustained-attention benefit.'], ['l-theanine', 'B', 'The combination trials used 97–250 mg theanine with 40–160 mg caffeine for less jitteriness and better attention-switching; this shot sits at the low end of the theanine range.']],
        catch_: 'No trial has tested matcha itself at this dose — this is a food-based estimate built from matcha\'s separately-measured caffeine/theanine content and the isolated-ingredient dosing trials, not a direct matcha RCT. Treat it as a reasoned approximation of the capsule stack above, not an independently proven protocol. The same sleep-timing and anxiety caveats apply.' },
      { tfKey: 'short_term_days', title: 'The Deadline-Week Protocol', subtitle: 'For the days before one specific demanding event — not a daily habit',
        ingredients: ['140 ml concentrated beetroot juice (about 12.8 mmol nitrate), every morning for 7 days', '3 g glycine powder stirred into water or warm milk, the 3 nights directly before the big day', 'Optional, heavier option: creatine 20 g/day split into 4 × 5 g doses for 5–7 days (see catch below)'],
        method: ['Each morning of the protocol week, drink the beetroot shot on an empty stomach.', 'On the final 3 nights before the event, stir the glycine powder into a glass of water or warm milk and drink it shortly before bed.', 'Stop both the morning after the event — this is a short, deliberate loading period, not a routine.'],
        evidence: [['beetroot-nitrate', 'C', 'Healthy young adults, 140 ml/day for 7 days: reaction time held up better than placebo during a fatiguing task, though accuracy was unchanged — modest, and most of this ingredient\'s stronger data is in clinical or older populations, not healthy young adults.'], ['glycine', 'B', 'Sleep-deprived adults, 3 g before bed for 3 nights: reduced next-day fatigue and improved next-day vigilance in a small industry-funded trial.'], ['creatine', 'C', 'Multiple small trials at 20 g/day for 5–7 days show scattered benefits — memory in vegetarians, attention under workload/hypoxia, partial sleep-deprivation rescue — but results are inconsistent across outcomes and this dose is well above Brain Food\'s proposed 5 g/day daily-use cap.']],
        catch_: 'This is the weakest-evidence recipe of the three — grade B/C on modest, sometimes population-mixed trials, not grade A. It is included because it is the honest ceiling of what a few days of preparation can do; it will not turn a rushed week into a well-rested one, and the beetroot effect in particular is small and inconsistent.' },
      { tfKey: 'chronic', title: 'The Long Game Plate', subtitle: 'Not a single meal — a daily pattern, judged over years',
        ingredients: ['1.5+ cups leafy greens (spinach, kale, or a cooked green), most days', '1 cup other vegetables', '1/2 cup berries, a few times a week', 'A handful of nuts (almonds, walnuts)', '1/2 cup legumes (chickpeas, lentils, beans), most days', 'A whole grain serving (whole wheat, barley, oats)', 'Olive oil as the main cooking fat and dressing', 'Fish once a week, poultry about twice a week', 'Limit, don\'t ban: red meat, butter, cheese, pastries, fried food'],
        method: ['Build a bowl or plate from the list above most days of the week.', 'Treat it as a replacement pattern, not an addition — the evidence is about what a diet is mostly made of, not an extra ingredient sprinkled on top.', 'Expect nothing noticeable this week; the supporting cohort evidence runs 3–10+ years.'],
        evidence: [['mind-diet', 'B', 'The only grade-B result for this pattern comes from a 2-year trial that bundled the diet with exercise, cognitive activity, social activity and health monitoring together — diet alone has not been isolated as the active ingredient.'], ['mind-diet', 'C', 'Observational cohorts link higher adherence to slower cognitive decline and lower dementia risk over 3–10+ years in older adults, but the one dedicated 3-year randomised trial of the diet alone found no cognitive or MRI benefit over a calorie-restricted control diet, and no trial exists in healthy young adults.'], ['mediterranean-diet', 'C', 'A closely overlapping pattern with its own page and similar grade-C cohort support — check it for a second data point.']],
        catch_: 'This is the opposite of a pill: the honest best-supported long-term action is a repeated, boring habit, evaluated over years, that has never been cleanly separated from exercise and social engagement in the one trial that found a benefit. If a deficiency is the real issue, correcting it has clearer, faster evidence than any pattern diet — see iron, vitamin D and vitamin B12 on the database before assuming the general pattern applies to you.' },
    ];
    const recipeCard = r => `<div class="recipe-card${r.tfKey === 'chronic' ? ' span2' : ''}" data-tf="${esc(r.tfKey)}" id="recipe-${esc(r.tfKey)}">
      <div class="rc-head">
        <div style="display:flex;gap:.8rem;align-items:flex-start;min-width:0">
          <div class="rc-icon">${ICON[r.tfKey]}</div>
          <div style="min-width:0"><h3>${esc(r.title)}</h3><p class="rc-sub">${esc(r.subtitle)}</p></div>
        </div>
        ${tf(r.tfKey)}
      </div>
      <div class="rc-cols">
        <div class="rc-block"><h4>Ingredients</h4><ul class="ingr-list">${r.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
        <div class="rc-block"><h4>Method</h4><ol class="method-list">${r.method.map(i => `<li>${esc(i)}</li>`).join('')}</ol></div>
      </div>
      <div class="evidence-strip"><h4>Evidence basis</h4>${r.evidence.map(([id, g, note]) => `<div class="ev-row"><div class="ev-top">${monoLink(id)} ${grade(g)}</div><div class="ev-note">${esc(note)}</div></div>`).join('')}</div>
      ${catchBox(r.catch_)}
    </div>`;
    const timeline = `<nav class="toc pill-timeline" aria-label="Jump to a recipe">
      <a href="#pill" data-jump="recipe-acute" data-tf="acute"><span class="n">${ICON.acute}</span>Today</a>
      <span class="arrow-sep">→</span>
      <a href="#pill" data-jump="recipe-short_term_days" data-tf="short_term_days"><span class="n">${ICON.short_term_days}</span>Days</a>
      <span class="arrow-sep">→</span>
      <a href="#pill" data-jump="recipe-chronic" data-tf="chronic"><span class="n">${ICON.chronic}</span>Long-term</a>
    </nav>`;
    const boundaries = [
      'It will not help a sleep-deprived brain as much as sleep itself — caffeine\'s own monograph shows it only restores performance for 2–4 h and does not substitute for recovery sleep.',
      'It does nothing for learning, long-term memory formation, or exam-week cramming — those outcomes live under <a href="#longterm">Long-term cognitive function</a> and are driven by completely different, slower-acting evidence (sleep, exercise, omega-3 status, not an acute stack).',
      'It carries real costs if used daily and late: sleep debt, tolerance, and anxiety in sensitive users. See each ingredient\'s safety section and the <a href="#safety">safety review</a> before treating this as a routine.',
      'None of this is a medical claim, a diagnosis, or a substitute for clinical advice — see the <a href="#regulatory">regulatory &amp; claims</a> page for what can and cannot be said about any of it commercially.',
    ];
    return `<div class="pill-page">
    <div class="hero-pill"><div class="nzt-hook"><a href="#nzt48" class="nzt-hook-link" aria-label="What if it didn't have to stop here? Enter The Real NZT-48" title="What if it didn't have to stop here?"><span class="nzt-hook-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg></span><span class="nzt-hook-q">What if it didn't have to stop here?</span></a></div><div class="page-head" style="margin-bottom:0"><div><h1>The Limitless Pill ${tf('acute')}</h1><p class="lead">There is no NZT-48. Nothing in 101 verified monographs raises a healthy, rested adult to a different cognitive tier — the acute-performance evidence tops out at grade A/B for alertness, reaction time and attention, from a short list of ordinary stimulant and food-derived compounds, each with a real catch. This page assembles the best-supported short-term, single-dose stack from that evidence for a before-the-task cognitive edge, and is explicit about what it does and does not do.</p></div></div></div>
    ${timeline}
    <div class="callout"><strong>What this is, honestly:</strong> a caffeine-led alertness/attention/reaction-time stack with theanine to blunt jitteriness, plus two situational additions — creatine for sleep-deprived rescue only, and American ginseng for working memory. It will make a rested person feel and test faster and more focused for a few hours. It will not create insight, learning capacity, or the fictional step-change Limitless depicts, and it borrows from sleep if timed late in the day.</div>
    <a class="px-backlink" href="#protocol">${icon('infinity')}<span><strong>The pill is one part of a bigger plan.</strong> The Limitless Protocol first removes what limits your brain, then boosts it, with food, pills and habits, for today and for years.</span>${icon('arrow')}</a>
    <div class="section" id="recipes"><h2>Three recipes, one per timeframe</h2><p class="small muted">Same evidence base as the rest of this page, turned into something you'd actually make: a drink for today, a short protocol for a demanding week, and a daily pattern for the years that actually move long-term cognitive outcomes. Grades and the honest catch are per recipe below.</p>
      <div class="recipe-grid">${recipes.map(recipeCard).join('')}</div></div>
    <div class="section" id="stack-section"><h2>The acute stack, in order of evidence strength</h2><p class="small muted">Grade shown is the best acute grade on file for that ingredient; gate is the safety-review outcome. Full dosing, interaction and safety detail is on each ingredient's own page — this page is a summary, not a replacement for it.</p>
      ${timingFigure()}
      <div class="stack-grid">${stack.map((s, i) => card(s, i + 1)).join('')}</div>
      ${caffeineFigure()}</div>
    <div class="section"><h2>Why not more ingredients?</h2><div class="prose"><p>Only ingredients with acute (same-day, single-dose) grade A or B human evidence for an actual cognitive-performance domain — not a biomarker or blood-flow surrogate — qualify for the stack above. 22 acute evidence rows across 11 ingredients met grade A/B with a benefit direction; most collapse into caffeine itself once the overlap is removed. The ones that didn't make the cut, and why:</p></div>
      <div class="exclusion-grid">${notStack.map(n => `<div class="exclusion-card"><div class="ex-head">${ICON.x}${monoLink(n.id)}</div><p>${esc(n.why)}</p></div>`).join('')}</div></div>
    <div class="section prose"><h2>What this stack will not do</h2><ul class="boundary-list">${boundaries.map(b => `<li>${ICON.dot}<span>${b}</span></li>`).join('')}</ul></div>
    </div>`;
  }

  // ---------- the Limitless Protocol: remove what limits the brain, then boost it; short and long term; eat / take / do ----------
  // ev: [monograph id, grade, timeframe] must match a graded row (checked by tools/smoke_test.cjs); syn: graded in a synthesis page;
  // src: [label, PMID] for non-nutrition levers, which this atlas has not graded, so they are shown as "Not graded here".
  const PX = {
    short: {
      remove: {
        eat: [
          { id: 's-water', t: 'Don’t run dry', how: 'A glass of water before a long task; about 2 L (women) to 2.5 L (men) of water a day from all drinks and food', why: 'Losing just 1–2% of body weight as water reliably brings fatigue, low mood and headaches. Drinking fixes it.', ev: [['hydration', 'B', 'acute']], c: 'This restores your baseline; drinking more than you need adds nothing.' },
          { id: 's-meal', t: 'Keep the meal before hard work light', how: 'A moderate, mixed meal; save the big or fatty one for after', why: 'A heavy meal raises sleepiness and lowers sustained attention for a few hours, on top of the normal afternoon dip.', ev: [['meal-composition-size-and-timing', 'B', 'acute']] },
        ],
        take: [
          { id: 's-rescue', t: 'Slept badly? Caffeine is the rescue', how: '100–200 mg once (one or two strong coffees), at least 9 hours before bed', why: 'Sleep loss is where caffeine works best: large gains in attention and reaction time, comparable to modafinil in the trials that compared them.', ev: [['caffeine', 'A', 'acute']], c: 'It hides tiredness for 2–4 hours; it does not repay the sleep. Not for pregnancy, under-18s, anxiety or heart problems.' },
          { id: 's-glycine', t: 'Glycine 3 g at bedtime on short-sleep nights', how: '3 g powder in water shortly before bed, for up to 3 nights', why: 'In adults kept on short sleep, it reduced next-day fatigue and improved next-day vigilance.', ev: [['glycine', 'B', 'short_term_days']], c: 'One small trial, funded by the maker. Not tested in well-rested people.' },
        ],
        do: [
          { id: 's-sleep', t: 'Get the sleep back', how: 'Sleep, before anything else on this page', why: 'A night without sleep causes large drops in simple attention, the biggest brake measured across 70 studies. Sleep loss before learning also cuts how much you remember.', src: [['Lim & Dinges 2010', '20438143'], ['Newbury et al. 2021', '35238586']] },
          { id: 's-cutoff', t: 'Stop caffeine 9+ hours before bed', how: 'Last coffee or tea by about 2 pm for an 11 pm bedtime', why: 'Caffeine taken up to 13 hours before bed cut sleep by about 45 minutes in pooled trials: today’s boost becomes tomorrow’s brake.', ev: [['caffeine', 'A', 'acute']] },
          { id: 's-nap', t: 'The caffeine nap', how: 'Drink a coffee, then nap 15–20 minutes straight away', why: 'The caffeine starts working as you wake up. It is the only pairing in this atlas that beat its best single part in direct trials.', syn: ['combinations', 'Combinations', 'B'], c: 'Three small trials in sleepy adults; tested for sleepiness and driving, not for learning.' },
        ],
      },
      boost: {
        eat: [
          { id: 's-cup', t: 'Coffee, tea or matcha, 30–60 minutes before', how: 'One coffee (about 80–100 mg caffeine) or 2.5–3 g matcha (about 70 mg caffeine and 50 mg L-theanine)', why: 'Faster reactions and steadier attention for a few hours: the best-proven same-day effect, in food form.', ev: [['coffee', 'A', 'acute'], ['tea-and-green-tea', 'B', 'acute']], c: 'A small effect, and in daily drinkers partly the end of overnight withdrawal. Keep tea away from iron-rich meals (see Long-term).' },
        ],
        take: [
          { id: 's-pill', t: 'The Limitless Pill core: caffeine + L-theanine', how: '75–100 mg caffeine with 100–200 mg L-theanine, 30–60 minutes before the task; no more than 2 a day', why: 'Caffeine is grade A for reaction time and attention. Theanine adds smoother focus with less jitter.', ev: [['caffeine', 'A', 'acute'], ['l-theanine', 'B', 'acute']], more: ['pill', 'Open the Limitless Pill'], c: 'Whether theanine adds anything beyond caffeine alone is still unproven. Count every coffee and energy drink toward 400 mg a day.' },
          { id: 's-ginseng', t: 'Optional: American ginseng (Cereboost)', how: '200 mg standardised extract, 1–3 hours before', why: 'The one herb with repeated same-day working-memory results.', ev: [['american-ginseng-cereboost', 'B', 'acute']], c: 'Four small trials, all with the supplier involved; safety data covers only 14 days. Avoid it with blood thinners or diabetes medicines.' },
        ],
        do: [
          { id: 's-move', t: 'Move before hard thinking', how: 'A brisk walk or light cycling, then start', why: 'A single bout of exercise gives a small lift in cognitive performance, during and after it.', src: [['Chang et al. 2012', '22480735']], c: 'Small on average; larger for some tasks and some exercise intensities.' },
          { id: 's-test', t: 'Test yourself instead of rereading', how: 'Close the book and recall it, or use flashcards; check, then repeat', why: 'Recalling what you studied makes it stick better than reading it again, especially when you recall from memory rather than just recognise.', src: [['Rowland 2014', '25150680']] },
        ],
      },
    },
    long: {
      remove: {
        eat: [
          { id: 'l-iron', t: 'Eat iron, and keep tea away from those meals', how: 'Iron-rich foods (meat, fish, legumes); drink tea between meals, not with them', why: 'In Moroccan women, tea with a meal cut iron absorption by more than 85%, and iron deficiency affects about 3 in 10 Moroccan women of reproductive age.', ev: [['tea-and-green-tea', 'A', 'acute']] },
          { id: 'l-dash', t: 'Less salt, more plants', how: 'Vegetables, fruit, whole grains, low-fat dairy, nuts and legumes; less salt and processed meat (the DASH pattern)', why: 'Lowers blood pressure within weeks, and high blood pressure is a major long-run risk for the brain.', ev: [['dash-diet', 'A', 'chronic']], c: 'The strong evidence is for blood pressure; direct proof that DASH improves thinking is limited.' },
          { id: 'l-fish', t: 'Oily fish once or twice a week', how: 'Sardines, mackerel or anchovies (low in mercury)', why: 'One portion covers much of the omega-3, B12, iodine and vitamin D that many diets lack. Regular fish eaters show slower memory decline.', ev: [['fish-and-seafood', 'C', 'chronic']], c: 'Observational; nothing shows fish sharpens a healthy young brain.' },
        ],
        take: [
          { note: 'Blood test first: ask for ferritin (iron), vitamin B12 and vitamin D. Correcting a real deficiency is the clearest supplement effect in this atlas. Without one, these pills do nothing for the brain.' },
          { id: 'l-ironpill', t: 'Iron, only if your ferritin is low', how: 'The dose and duration your doctor sets', why: 'In iron-deficient women and young people it reduced fatigue and modestly raised attention and test scores.', ev: [['iron', 'B', 'chronic']], c: 'No benefit if you are not low, and unneeded iron carries real risks.' },
          { id: 'l-b12', t: 'Vitamin B12 if you are vegan, vegetarian, older, or on metformin or acid blockers', how: 'A regular B12 supplement', why: 'Deficiency causes nerve and memory damage that can become permanent. Prevention is cheap.', ev: [['vitamin-b12', 'B', 'chronic']], c: 'No benefit for thinking if your B12 is already normal.' },
          { id: 'l-vitd', t: 'Vitamin D if your level is low', how: 'No more than 4,000 IU (100 µg) a day unless your doctor says otherwise', why: 'Low vitamin D is common in Morocco and is linked to higher dementia risk.', ev: [['vitamin-d', 'C', 'chronic']], c: 'Large trials in people who are not low found no brain benefit.' },
          { id: 'l-medical', t: 'Medical brakes: treat them with a doctor', how: 'Underactive thyroid, anaemia, sleep apnoea, depression, ADHD, hearing loss', why: 'These are real, treatable limits on the brain. This is where prescription medicine belongs: removing a medical brake, not boosting a healthy brain.', general: true },
        ],
        do: [
          { id: 'l-risks', t: 'Fix the long-run risk factors', how: 'High blood pressure, hearing loss, smoking, inactivity, high LDL cholesterol, too much alcohol', why: 'The 2024 Lancet Commission lists 14 modifiable risk factors and estimates that nearly half of dementia cases could in theory be prevented or delayed by addressing them.', src: [['Livingston et al. 2024, The Lancet', '39096926']] },
          { id: 'l-sleep', t: 'Make sleep a habit', how: '7 hours or more, night after night', why: 'The consensus of sleep-medicine experts for adults: the floor for a well-running brain.', src: [['AASM/SRS consensus 2015', '26039963']] },
        ],
      },
      boost: {
        eat: [
          { id: 'l-med', t: 'Eat the Mediterranean way, most days', how: 'Vegetables, legumes, whole grains, fish, nuts and olive oil; little red meat and few sweets', why: 'Linked to lower dementia risk in long studies. In trials, the gains came when diet was combined with exercise and mental and social activity.', ev: [['mediterranean-diet', 'B', 'chronic'], ['mind-diet', 'B', 'chronic']], c: 'The one 3-year trial of the MIND diet alone found no benefit over a control diet, and none has been run in healthy young adults.' },
          { id: 'l-nuts', t: 'A handful of nuts, and berries often', how: 'About 30 g of nuts a day; berries a few times a week', why: 'Both improve blood-vessel health, which the brain depends on.', ev: [['nuts-walnuts-almonds', 'B', 'chronic'], ['blueberry-anthocyanins', 'B', 'chronic']], c: 'Better vessels, not proven better thinking: the cognition trials are small and mixed.' },
        ],
        take: [
          { note: 'Honest answer: no pill has strong evidence for making a healthy brain better over months or years. These are the exceptions, each for one group of people.' },
          { id: 'l-mvm', t: 'A standard multivitamin, if you are over 60', how: 'One multivitamin at about 100% of daily needs', why: 'In the large COSMOS trials it slightly slowed cognitive ageing (about 0.07 SD over 2–3 years).', ev: [['multivitamin-mineral-supplements', 'B', 'chronic']], c: 'A small effect, and an earlier 12-year trial found none. In younger, well-fed adults it changes blood levels, not thinking.' },
          { id: 'l-creatine', t: 'Creatine, if you eat little meat or fish', how: '3–5 g creatine monohydrate a day, adults only', why: 'Raises brain creatine by about 5–10%, and vegetarians remembered better in a short trial.', ev: [['creatine', 'C', 'short_term_days']], c: 'Little or no effect in meat eaters. The memory trial used 20 g a day for 5 days, above the 5 g daily limit used here. Avoid with kidney disease or in pregnancy.' },
          { id: 'l-omega', t: 'Omega-3, if you rarely eat fish', how: 'Fish oil, or algae oil if you are vegan, daily', why: 'Small, inconsistent benefits show up mainly in people with a low intake.', ev: [['omega-3-dha-epa', 'C', 'chronic']], c: 'No meaningful boost in well-fed adults in randomised trials.' },
        ],
        do: [
          { id: 'l-exercise', t: 'Exercise most weeks', how: 'Aerobic and strength training, plus mind-body practice such as yoga or tai chi', why: 'Across 54 trials in healthy people, exercise improved overall cognition and every area tested: aerobic most for overall cognition, strength for executive function, mind-body for memory.', src: [['Zhang et al. 2023', '37924980']], c: 'The biggest gains were in older adults.' },
          { id: 'l-learn', t: 'Learn in spaced sessions', how: 'Review new material again after a gap of days, then weeks, and test yourself each time, instead of cramming', why: 'Spacing beats cramming for long-term recall, and the best gap grows with how long you need to remember.', src: [['Cepeda et al. 2006', '16719566']] },
        ],
      },
    },
  };
  const PX_TF = { short: ['Short-term', 'Today → this week', 'zap'], long: ['Long-term', 'Months → years', 'hourglass'] };
  const PX_ROUTE = { eat: ['utensils', 'Eat', 'Food & drink'], take: ['pill', 'Take', 'The pharmaceutical route: pills & supplements'], do: ['activity', 'Do', 'The non-pharmaceutical route: habits'] };
  const PX_BRAKES = [
    ['sleep', 'I sleep less than 7 hours on most nights', ['short', 's-sleep'], ['long', 'l-sleep']],
    ['late', 'I have coffee, tea or energy drinks after about 2 pm', ['short', 's-cutoff']],
    ['water', 'I drink little water during the day', ['short', 's-water']],
    ['lunch', 'I eat a big lunch before afternoon work', ['short', 's-meal']],
    ['iron', 'I drink tea with meals, or often feel tired and weak', ['long', 'l-iron'], ['long', 'l-ironpill']],
    ['plant', 'I eat little or no meat, fish or dairy', ['long', 'l-b12'], ['long', 'l-fish']],
    ['move', 'I rarely exercise', ['long', 'l-exercise'], ['short', 's-move']],
    ['bp', 'I have high blood pressure, or don’t know mine', ['long', 'l-dash'], ['long', 'l-risks']],
    ['unwell', 'I have felt low, anxious or unwell for weeks', ['long', 'l-medical']],
  ];
  const PX_ITEM = {};
  Object.keys(PX).forEach(tfk => ['remove', 'boost'].forEach(st => Object.keys(PX[tfk][st]).forEach(r => PX[tfk][st][r].forEach(it => { if (it.id) PX_ITEM[it.id] = it; }))));
  const pxs = { tab: 'short', brakes: (() => { try { return JSON.parse(localStorage.getItem('bf-brakes') || '[]'); } catch (e) { return []; } })() };
  function pxItem(it) {
    if (it.note) return `<p class="px-note">${esc(it.note)}</p>`;
    const ev = (it.ev || []).map(([id, g]) => `<span class="px-chip">${monoLink(id)}${grade(g)}</span>`).join('');
    const syn = it.syn ? `<span class="px-chip"><a href="#${esc(it.syn[0])}">${esc(it.syn[1])}</a>${grade(it.syn[2])}</span>` : '';
    const src = it.src ? `<span class="badge neutral" title="Real, checked sources from outside nutrition research. This atlas has not graded them.">Not graded here</span>${it.src.map(([l, pm]) => `<a class="px-src" href="https://pubmed.ncbi.nlm.nih.gov/${esc(pm)}/" target="_blank" rel="noopener">${esc(l)}</a>`).join('')}` : '';
    const gen = it.general ? '<span class="badge neutral" title="General medical guidance, outside the scope of this atlas">General medical guidance</span>' : '';
    return `<article class="px-item" id="px-${esc(it.id)}"${it.ev ? ` data-ev="${esc(it.ev.map(e => e.join(':')).join(' '))}"` : ''}>
      <h4>${esc(it.t)}</h4><p class="px-how">${esc(it.how)}</p><p class="px-why">${esc(it.why)}</p>
      <div class="px-ev">${ev}${syn}${src}${gen}</div>
      ${it.c ? `<p class="px-catch">${icon('alert')}<span>${esc(it.c)}</span></p>` : ''}
      ${it.more ? `<a class="px-more" href="#${esc(it.more[0])}">${esc(it.more[1])}${icon('arrow')}</a>` : ''}
    </article>`;
  }
  function pxStep(tfk, st) {
    const S = PX[tfk][st], rm = st === 'remove';
    return `<section class="px-step ${rm ? 'px-remove' : 'px-boost'}" aria-labelledby="px-h-${tfk}-${st}">
      <header class="px-step-h"><span class="px-n">${rm ? 1 : 2}</span><div><h3 id="px-h-${tfk}-${st}">${rm ? 'Remove what limits your brain' : 'Boost what drives it'}</h3>
        <p>${rm ? (tfk === 'short' ? 'The brakes you can release today or this week.' : 'The slow brakes: gaps, risks and medical causes.') : (tfk === 'short' ? 'On a rested, fed brain, these add a real but small edge for a few hours.' : 'Habits that keep a brain working well for years.')}</p></div></header>
      <div class="px-cols">${['eat', 'take', 'do'].map(r => `<div class="px-col px-col-${r}"><div class="px-col-h">${icon(PX_ROUTE[r][0])}<b>${PX_ROUTE[r][1]}</b><span>${esc(PX_ROUTE[r][2])}</span></div>${S[r].map(pxItem).join('')}</div>`).join('')}</div>
    </section>`;
  }
  function pxResult() {
    const on = PX_BRAKES.filter(b => pxs.brakes.includes(b[0]));
    if (!on.length) return '<p class="px-res-empty">Nothing ticked yet. If none of these is true for you, your brakes are already mostly off: go straight to the boosters.</p>';
    return `<p class="px-res-h"><b>${on.length} brake${on.length > 1 ? 's' : ''} to remove first.</b> These will do more for you than any booster.</p>
      <ul class="px-res-list">${on.map(b => `<li><span>${esc(b[1])}</span><span class="px-res-go">${b.slice(2).map(([t, id]) => `<button type="button" class="linkish" data-pxgo="${t}:${id}">${esc(PX_ITEM[id].t)}${icon('arrow')}</button>`).join('')}</span></li>`).join('')}</ul>`;
  }
  function viewProtocol(param) {
    if (param === 'short' || param === 'long') pxs.tab = param;
    const tab = pxs.tab;
    const leftOut = [
      ['Prescription stimulants for healthy people', 'Modafinil, methylphenidate and amphetamines are prescription-only and carry real risks. In this atlas they appear only as comparisons: when people were sleep-deprived, caffeine matched them for a few hours.', 'caffeine'],
      ['The big creatine “rescue” dose', 'A single 14–25 g dose helped sleep-deprived people (grade B), but that is 3–5 times the 5 g daily limit used here.', 'creatine'],
      ['Huperzine A and vinpocetine', 'Excluded: they fail a hard safety or legal requirement.', 'huperzine-a-and-vinpocetine'],
      ['Ginkgo biloba', 'Close to no effect in healthy adults, and a bleeding risk with blood thinners.', 'ginkgo-biloba'],
      ['Energy drinks and stacked caffeine', 'The same caffeine, harder to count: the easiest way past 400 mg a day without noticing.', 'energy-drinks-and-stimulant-beverages'],
      ['Experimental brain drugs', 'Ampakines, orexin drugs and similar compounds are still in trials for diseases. None is approved to boost a healthy brain, so they stay research only.', null],
    ];
    const plan = [
      ['Week 1', 'Find your brakes', 'Do the check above. Fix your sleep and the 2 pm caffeine cut-off. Book a blood test.'],
      ['Weeks 2–4', 'Remove them', 'Correct what the test shows. Start moving most days and switch to the long-term plate.'],
      ['Then', 'Boost on the days that matter', 'The pill core or a matcha before hard work; test yourself while you learn.'],
      ['Always', 'Keep the habits', 'The long-term habits are the protocol. Boosters stay occasional.'],
    ];
    return `<div class="px-page">
    <header class="px-hero">
      <div class="eyebrow">Brain Food protocol</div>
      <div class="px-hero-top"><h1>The Limitless Protocol</h1>${shareBtn()}</div>
      <p class="lead">No pill makes a brain limitless. The closest real thing is a protocol: <strong>first remove what holds your brain back, then add what pushes it forward</strong>, today and over the years, through what you eat, what you take and what you do.</p>
      <div class="px-formula" aria-label="How the protocol works">
        <span class="px-f px-f-rm">${icon('brake')}<span><small>Step 1</small>Remove what limits</span></span>${icon('arrow', 'px-f-arrow')}<span class="px-f px-f-up">${icon('trend')}<span><small>Step 2</small>Boost what drives</span></span>
        <span class="px-f-routes">${['eat', 'take', 'do'].map(r => `<span>${icon(PX_ROUTE[r][0])}${PX_ROUTE[r][1]}</span>`).join('')}</span>
      </div>
    </header>

    ${brakesFigure()}

    <section class="px-check" aria-labelledby="px-check-h">
      <div class="px-check-head"><span class="px-n">0</span><div><h2 id="px-check-h">Find your brakes</h2><p>Tick what is true for you. Each tick points to its fix.</p></div></div>
      <div class="px-brakes">${PX_BRAKES.map(([k, l]) => `<label class="px-brake"><input type="checkbox" data-brake="${k}"${pxs.brakes.includes(k) ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
      <div class="px-result" id="px-result" aria-live="polite">${pxResult()}</div>
      <p class="pf-privacy">${icon('lock')}Your ticks stay in this browser; nothing is sent anywhere.</p>
    </section>

    <div class="px-tabs" role="tablist" aria-label="Timeframe" id="px-tabs">${Object.keys(PX_TF).map(k => `<button type="button" role="tab" id="px-tab-${k}" aria-controls="px-pane-${k}" aria-selected="${tab === k}" tabindex="${tab === k ? 0 : -1}" data-ptab="${k}">${icon(PX_TF[k][2])}<span><b>${PX_TF[k][0]}</b><small>${PX_TF[k][1]}</small></span></button>`).join('')}</div>
    ${Object.keys(PX_TF).map(k => `<div class="px-pane" role="tabpanel" id="px-pane-${k}" aria-labelledby="px-tab-${k}" data-pane="${k}"${tab === k ? '' : ' hidden'}><h2 class="px-pane-h sr">${PX_TF[k][0]}: ${PX_TF[k][1].toLowerCase()}</h2>${pxStep(k, 'remove')}${pxStep(k, 'boost')}</div>`).join('')}

    <section class="section"><h2>A simple order to run it</h2>
      <ol class="px-plan">${plan.map(([w, t, d]) => `<li><span class="px-plan-w">${esc(w)}</span><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ol>
      <p class="small">A suggested order, not a tested programme.</p></section>

    <section class="section"><h2>Left out on purpose</h2>
      <div class="px-out">${leftOut.map(([t, d, id]) => `<div class="px-out-i">${icon('xcircle')}<div><b>${esc(t)}</b><p>${esc(d)}${id ? ` ${monoLink(id)}` : ''}</p></div></div>`).join('')}</div></section>

    <div class="callout px-fine"><strong>How to read this page.</strong> Grades come from this atlas and belong to the study group named on each ingredient page. Items marked <span class="badge neutral">Not graded here</span> come from research outside nutrition (sleep, exercise, learning). Their sources are real and checked against PubMed, but they have not been graded with this atlas’s method. Not medical advice: if you are pregnant, under 18, take medicines or have a health condition, talk to a doctor before taking any supplement.</div>
    </div>`;
  }
  function setPxTab(app, t) {
    pxs.tab = t;
    app.querySelectorAll('[data-ptab]').forEach(b => { const on = b.dataset.ptab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    app.querySelectorAll('.px-pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
    CURRENT = 'protocol.' + t;
    try { history.replaceState(null, '', '#' + CURRENT); } catch (e) { /* sandboxed frame */ }
  }

  function viewNZT48() {
    const NI = {
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
      skull: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C7.5 3 4 6.4 4 10.6c0 2.4 1.1 4.4 2.8 5.8V19a1 1 0 0 0 1 1h1.4v-1.6h1.2V20h3.2v-1.6h1.2V20H16a1 1 0 0 0 1-1v-2.6c1.7-1.4 2.8-3.4 2.8-5.8C19.8 6.4 16.5 3 12 3Z"/><circle cx="9.3" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.7" cy="11" r="1.1" fill="currentColor" stroke="none"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>',
    };
    const doses = [
      { h: 'H+0 · 7:00 AM', name: 'Ignition', items: ['5–6 g double matcha shot — about 140–150 mg caffeine, 95–110 mg L-theanine', 'American ginseng (Cereboost) 200 mg'],
        note: 'The full capsule-dose version of <a href="#pill">the Limitless Pill</a>\'s stack. Nothing new yet — this is the legal, well-evidenced opening dose.', run: 150 },
      { h: 'H+4 · 11:00 AM', name: 'The Patch', items: ['~100 mg caffeine (one cup of coffee or a single 2.7 g matcha serving)', '100 mg L-theanine'],
        note: 'The first dose\'s window is closing (effective 1–4 h). This tops it back up before the attention/reaction-time curve drops.', run: 250 },
      { h: 'H+8 · 3:00 PM', name: 'The Taper', items: ['~90 mg caffeine, delivered gently (black or green tea, not a shot)', '100 mg L-theanine'],
        note: 'Smaller and gentler on purpose — this is the last dose the data lets you take and still call it a ceiling, not an overdose.', run: 340 },
      { h: 'H+12 · 7:00 PM', name: 'Debrief', items: [], note: 'window closes', run: 340 },
    ];
    const excluded = [
      { t: 'Modafinil, amphetamine salts', why: 'They appear in this dataset only as trial comparators researchers used to benchmark caffeine\'s effect size under sleep deprivation — never as something tested or recommended here. Both are prescription-only, controlled substances; Brain Food is not your doctor and will not substitute for one.' },
      { t: 'Stacking undisclosed caffeine sources', why: 'Energy drinks, pre-workout powder or an extra coffee "on top" of this plan is the fastest way past the 400 mg/day ceiling without noticing — caffeine labelling is inconsistent and nobody is tracking your running total for you.' },
      { t: 'Single doses above 200 mg', why: 'That is EFSA\'s own single-dose ceiling, and this atlas\'s own caffeine data shows exactly what is on the other side of it: 400–750 mg caffeine triggered a panic attack in 51.1% of a clinical trial population versus 0% on placebo. That is the line between "enhancement" and a 911 call.' },
      { t: 'Running this back-to-back, daily', why: 'Every number on this page was measured as a single acute event. Nothing in this dataset says a 340 mg, three-dose day is safe or still effective done every day — tolerance blunts the benefit while the sleep debt keeps compounding.' },
    ];
    const CEIL = 400;
    const live = doses.filter(d => d.items.length);
    const motes = Array.from({ length: 9 }, (_, i) => `<i style="left:${14 + (i * 37) % 72}%;animation-delay:${(i * 0.53).toFixed(2)}s;animation-duration:${(3.2 + (i % 4) * 0.6).toFixed(1)}s"></i>`).join('');
    return `<div class="nzt-page" role="main">
    <div class="nz-fog" aria-hidden="true"></div><div class="nz-spot" aria-hidden="true"></div><div class="nz-grain" aria-hidden="true"></div><div class="nz-scan" aria-hidden="true"></div>
    <div class="nz-progress" aria-hidden="true"></div>
    <a href="#pill" class="nz-exit" aria-label="Leave and return to the Limitless Pill (Escape)"><span aria-hidden="true">✕</span> leave <kbd>esc</kbd></a>
    <div class="nz-hud" aria-hidden="true"><span class="nz-hud-t">H+0</span><span class="nz-hud-mg"><b>0</b> / 400 mg</span><span class="nz-hud-bar"><i></i></span></div>
    <div class="nz-col">
      <header class="nz-hero">
        <div class="nz-capsule-wrap" aria-hidden="true"><div class="nz-capsule"><span class="nz-cap-half"></span>${motes}</div><div class="nz-capsule-glow"></div></div>
        <div class="nz-boot nz-r">&gt; signal acquired<span class="nz-cursor">_</span></div>
        <h1 class="nz-title" data-text="THE REAL NZT-48" aria-label="The Real NZT-48"><span class="nz-title-t" aria-hidden="true">THE REAL NZT-48</span></h1>
        <p class="nz-whisper nz-r" style="--d:.2s">There is no real NZT-48.</p>
        <p class="nz-lead nz-r" style="--d:.35s">No ingredient in 101 verified monographs turns a brain into a different machine. What lives down here is the actual ceiling: the same graded, citation-checked evidence as the rest of the atlas, redosed across twelve hours instead of four, pushed right up to the limits regulators have already drawn — and stopped the instant it crosses into harm.</p>
      </header>

      <div class="nz-meter nz-r" style="--d:.5s" role="img" aria-label="Cumulative caffeine: 340 of a 400 milligram daily ceiling">
        <div class="nz-meter-track">${live.map((d, i) => `<div class="nz-meter-seg" style="width:${((d.run - (i ? live[i - 1].run : 0)) / CEIL) * 100}%"><span>${esc(d.name)}</span></div>`).join('')}<div class="nz-meter-ceil"><span>400 mg · EFSA daily ceiling</span></div></div>
        <div class="nz-meter-read"><b class="nz-count" data-to="340">340</b> mg across 12 h · 3 doses, each under the 200 mg single-dose ceiling · 0 prescription or controlled substances</div>
      </div>

      <section class="nz-sec" data-n="01">
        <h2 class="nz-h2 nz-r"><span>// 01</span> the descent</h2>
        <ol class="nz-line">${doses.map(d => `<li class="${d.items.length ? '' : 'end'}" data-h="${esc(d.h.split(' ')[0])}" data-mg="${d.run}">
          <div class="nz-node">${d.items.length ? NI.clock : NI.moon}</div>
          <div class="nz-time">${esc(d.h)}</div>
          <div class="nz-body"><h3>${esc(d.name)}${d.items.length ? `<span class="nz-run">${d.run} mg</span>` : ''}</h3>
            ${d.items.length ? `<ul>${d.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            <p>${d.items.length ? d.note : 'The window closes. Nothing more goes in tonight.'}</p></div>
        </li>`).join('')}</ol>
      </section>

      <section class="nz-sec" data-n="02">
        <h2 class="nz-h2 nz-r"><span>// 02</span> sealed doors</h2>
        <p class="nz-sub nz-r">What this page refuses to put in the glass — and why each door stays shut.</p>
        <div class="nz-sealed">${excluded.map((e, i) => `<div class="nz-door nz-r" style="--d:${(i * 0.12).toFixed(2)}s"><div class="nz-door-h">${NI.skull}<span class="nz-door-n">0${i + 1}</span>${esc(e.t)}</div><p>${esc(e.why)}</p></div>`).join('')}</div>
      </section>

      <section class="nz-sec" data-n="03">
        <h2 class="nz-h2 nz-r"><span>// 03</span> day two</h2>
        <div class="nz-bill nz-r">
          <p class="nz-quote">The movie never shows day two.</p>
          <p>By the caffeine monograph's own numbers, a dose this late costs real sleep that night: about <b>45 fewer minutes</b> of total sleep, <b>7% lower</b> sleep efficiency, <b>9 extra minutes</b> to fall asleep, <b>12 more minutes</b> awake after sleep onset, and roughly <b>11 fewer minutes</b> of deep sleep. A 107 mg dose needs about 8.8 h to clear before bed, so the Taper only works cleanly with a bedtime near midnight or later. There is no version of a twelve-hour chemical window that does not borrow from tomorrow.</p>
        </div>
      </section>

      <div class="nz-out"><a href="#pill">&larr; back to the honest version</a><span>not medical advice · a single acute day, never a routine</span></div>
    </div>
    </div>`;
  }

  function initNZT(app) {
    const page = app.querySelector && app.querySelector('.nzt-page');
    if (!page || typeof window.requestAnimationFrame !== 'function' || typeof window.IntersectionObserver !== 'function') return;
    const raf = window.requestAnimationFrame.bind(window);
    const still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    page.classList.add('js');
    const countUp = el => {
      const to = +el.dataset.to;
      if (still) { el.textContent = to; return; }
      const t0 = performance.now();
      const tick = now => { const k = Math.min(1, (now - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf(tick); };
      el.textContent = '0'; raf(tick);
    };
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      const c = e.target.querySelector && e.target.querySelector('.nz-count'); if (c) countUp(c);
    }), { root: page, threshold: 0.15 });
    page.querySelectorAll('.nz-r').forEach(el => io.observe(el));
    const t = page.querySelector('.nz-title-t');
    if (t && !still) {
      const final = t.textContent, glyphs = '!<>-_/[]{}=+*^?#NZT0123456789', total = 42; let f = 0;
      const step = () => { f++; t.textContent = final.split('').map((ch, i) => ch === ' ' || i < (f / total) * final.length ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]).join(''); if (f < total) raf(step); else t.textContent = final; };
      raf(step);
    }
    const line = page.querySelector('.nz-line'), items = line ? Array.from(line.children) : [];
    const hud = page.querySelector('.nz-hud'), prog = page.querySelector('.nz-progress');
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = page.clientHeight, mark = vh * 0.62;
      if (line) { const r = line.getBoundingClientRect(); line.style.setProperty('--p', Math.max(0, Math.min(1, (mark - r.top) / r.height)).toFixed(3)); }
      let cur = null;
      items.forEach(li => { const lit = li.getBoundingClientRect().top < mark; li.classList.toggle('lit', lit); if (lit) cur = li; });
      if (hud) {
        hud.classList.toggle('show', page.scrollTop > vh * 0.35);
        const mg = cur ? +cur.dataset.mg : 0;
        hud.querySelector('.nz-hud-t').textContent = cur ? cur.dataset.h : 'H+0';
        hud.querySelector('b').textContent = mg;
        hud.style.setProperty('--f', (mg / 400).toFixed(3));
      }
      if (prog) prog.style.setProperty('--sp', (page.scrollTop / Math.max(1, page.scrollHeight - vh)).toFixed(3));
    };
    page.addEventListener('scroll', () => { if (!ticking) { ticking = true; raf(update); } }, { passive: true });
    update();
    if (!still && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      let mx = 0, my = 0, pending = false;
      page.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!pending) { pending = true; raf(() => { pending = false; page.style.setProperty('--mx', mx + 'px'); page.style.setProperty('--my', my + 'px'); }); } });
    }
  }
  const PQ = [
    { k: 'who', q: 'Which of these describes you best?', opts: [['student', 'Student', 'Studying or sitting exams'], ['worker', 'Knowledge worker', 'Long stretches of desk concentration'], ['shift', 'Shift or night worker', 'Nights, rotating rosters, on call'], ['midlife', 'Adult 45–64', 'Thinking about the long run'], ['older', '65 or older', 'Keeping sharp for the years ahead'], ['teen', 'Under 18', 'School age']] },
    { k: 'sleep', q: 'How much do you usually sleep?', opts: [['good', '7 hours or more', 'Most nights'], ['short', '6–7 hours', 'Often a little short'], ['debt', 'Under 6 hours', 'Or all-nighters, broken sleep']] },
    { k: 'caf', q: 'How much caffeine do you have now?', opts: [['none', 'None or rarely', 'Caffeine-naive'], ['some', '1–2 cups a day', 'Coffee or tea'], ['lots', '3+ cups or energy drinks', 'Every day']] },
    { k: 'goal', q: 'What do you want most?', opts: [['focus', 'Focus', 'Alertness, attention, staying on task'], ['memory', 'Memory', 'Learning and remembering'], ['capacity', 'Overall sharpness', 'Long-run cognitive health']] },
    { k: 'diet', q: 'How do you eat?', opts: [['varied', 'Varied', 'Includes meat or fish'], ['plant', 'Vegetarian or vegan', 'Little or no animal food'], ['irregular', 'Irregular', 'Skipped meals or restrictive dieting']] },
    { k: 'flags', multi: true, q: 'Does any of this apply to you?', sub: 'Pick all that apply. These change what is safe to suggest.', opts: [['pregnant', 'Pregnant or breastfeeding', ''], ['anxiety', 'Anxiety or panic attacks', ''], ['heart', 'Heart condition or high blood pressure', ''], ['meds', 'Taking prescription medication', ''], ['deficient', 'Diagnosed deficiency or anaemia', ''], ['kidney', 'Kidney disease', ''], ['none', 'None of these', '']] },
  ];
  const pst = (() => { try { const s = JSON.parse(localStorage.getItem('bf-profile')); if (s && typeof s.step === 'number' && s.a) return s; } catch (e) { /* storage blocked */ } return { step: 0, a: {} }; })();
  const pSave = () => { try { localStorage.setItem('bf-profile', JSON.stringify(pst)); } catch (e) { /* storage blocked */ } };
  const pEncode = a => PQ.map(q => q.multi ? (a[q.k] || ['none']).join('+') : a[q.k]).join('~');
  function pDecode(param) {
    const parts = String(param || '').split('~');
    if (parts.length !== PQ.length) return null;
    const a = {};
    for (let i = 0; i < PQ.length; i++) {
      const q = PQ[i], ok = q.opts.map(o => o[0]);
      if (q.multi) { const v = parts[i].split('+').filter(x => ok.includes(x)); if (!v.length) return null; a[q.k] = v; }
      else { if (!ok.includes(parts[i])) return null; a[q.k] = parts[i]; }
    }
    return a;
  }
  function profileAction(cmd) {
    const [op, k, v] = cmd.split(':');
    if (op === 'pick') { pst.a[k] = v; pst.step = Math.min(pst.step + 1, PQ.length - 1); pSave(); render(); }
    else if (op === 'toggle') { let cur = (pst.a[k] || []).slice(); if (v === 'none') cur = ['none']; else { cur = cur.filter(x => x !== 'none'); cur = cur.includes(v) ? cur.filter(x => x !== v) : cur.concat(v); } pst.a[k] = cur; pSave(); render(); }
    else if (op === 'back') { pst.step = Math.max(0, pst.step - 1); pSave(); render(); }
    else if (op === 'done') { if (!(pst.a.flags || []).length) pst.a.flags = ['none']; pSave(); try { localStorage.setItem('bf-profile-last', pEncode(pst.a)); } catch (e) { /* storage blocked */ } go('profile.' + pEncode(pst.a)); }
    else if (op === 'forget') { pst.step = 0; pst.a = {}; try { localStorage.removeItem('bf-profile'); localStorage.removeItem('bf-profile-last'); } catch (e) { /* storage blocked */ } go('profile'); }
    else if (op === 'reset') { pst.step = 0; pst.a = {}; pSave(); go('profile'); }
    else if (op === 'print') { try { window.print(); } catch (e) { /* no print */ } }
  }
  function profileResult(a) {
    const f = new Set(a.flags || []);
    const teen = a.who === 'teen', preg = f.has('pregnant'), anx = f.has('anxiety'), kidney = f.has('kidney'), meds = f.has('meds');
    const debt = a.sleep === 'debt' || a.who === 'shift', lots = a.caf === 'lots', older = a.who === 'older' || a.who === 'midlife', plant = a.diet === 'plant';
    const T = teen ? ['The Growing Brain', 'Your brain is still building itself. The best levers are food, sleep and not being deficient — not stimulants.']
      : preg ? ['The Careful Path', 'Two people are relying on what you take. Fewer things, smaller doses, and your clinician in the loop.']
      : debt ? ['The Sleep Debtor', 'Your biggest cognitive cost is lost sleep. Everything else is a patch on that.']
      : lots ? ['The Overclocked', 'You are already running on caffeine. More will not help; timing and tolerance will.']
      : older ? ['The Long Game', 'You are playing for years, not hours. Patterns and deficiency checks beat any single pill.']
      : plant ? ['The Plant-Powered Brain', 'Your diet is great for the long run, with three nutrients worth checking.']
      : a.who === 'student' ? ['The Exam Sprinter', 'Short, intense demands. Use caffeine strategically and protect the sleep that actually stores what you learn.']
      : ['The Deep Worker', 'Long stretches of focus. Small, well-timed doses and real breaks beat big stacks.'];
    const pillNow = [], pillLong = [], actNow = [], actLong = [], warn = [];
    if (teen) pillNow.push({ t: 'No stimulant product', id: 'breakfast-vs-fasting', g: 'B', d: 'EFSA caps caffeine for children and adolescents at 3 mg per kg body weight per day, and nothing here is designed for under-18s. The best-evidenced same-day lever at your age is eating breakfast before school (grade B for sustained attention in children and adolescents).' });
    else if (anx) pillNow.push({ t: 'Skip the caffeine', id: 'l-theanine', g: 'B', d: 'In people with panic disorder, 400–750 mg caffeine triggered a panic attack in 51% versus 0% on placebo (grade A harm), and 150–450 mg raises jitteriness in low users. If you want something, L-theanine 100–200 mg on its own (grade B, faster choice reaction time) is the gentler option.' });
    else {
      const dose = preg ? 'Keep total caffeine at or under 200 mg for the whole day (the EFSA pregnancy limit) — one modest coffee.'
        : a.caf === 'none' ? '50–100 mg, 30–60 minutes before the task. Doses as low as 12.5–50 mg were active, and people who rarely use caffeine get more jitter at higher doses.'
        : lots ? 'Do not add more. At 3+ cups much of the morning "boost" is just reversing overnight withdrawal. Keep your first cup and stop adding after early afternoon.'
        : '75–200 mg (one strong coffee or the Double Matcha Focus Shot), 30–60 minutes before the task. Effect lasts about 3–4 h.';
      pillNow.push({ t: lots ? 'Caffeine: hold, don’t add' : 'Caffeine, timed', id: 'caffeine', g: 'A', d: dose + (debt && !preg ? ' Under sleep loss the effect is much larger (grade A for vigilance) — but it only patches performance for 2–4 h.' : '') });
      if (!preg) pillNow.push({ t: 'Add L-theanine 100–200 mg', id: 'l-theanine', g: 'B', d: 'Taken with caffeine it improves alertness and attention switching with less jitter (grade B). Caffeine dose explains most of the combined effect.' + (f.has('heart') ? ' May add to blood-pressure-lowering drugs.' : '') });
      if (debt && !preg && !kidney) pillNow.push({ t: 'Creatine rescue (severe sleep loss only)', id: 'creatine', g: 'B', d: 'One 0.2–0.35 g/kg dose 1.5–3 h before a demanding task improved processing speed during sleep deprivation (grade B). It does nothing for a rested brain, and the dose is far above the 5 g/day daily cap — occasional use only.' });
      if (a.goal === 'memory' && !preg) pillNow.push({ t: 'Memory-day option: American ginseng 200 mg', id: 'american-ginseng-cereboost', g: 'B', d: 'A single standardised dose (Cereboost) improved spatial working memory for about 3 h (grade B, two small industry-funded trials). Or a ~25 g glucose drink 15–60 min before recall (grade B, inverted U — more is worse; not with diabetes).' });
    }
    if (teen) pillLong.push({ t: 'No routine supplement', id: 'iron', g: 'B', d: 'Iron helps only if a blood test shows deficiency or anaemia (grade B in children); iron given to children who did not need it showed a harm signal. Iodine adequacy matters at this age — iodised salt and dairy usually cover it.' });
    else {
      if (f.has('deficient')) pillLong.push({ t: 'Correct the deficiency first', id: 'iron', g: 'B', d: 'The strongest long-term lever in the whole atlas: thiamine (grade A in deficiency states), iron in anaemia (grade B), iodine where deficient. It only works if you are actually deficient — follow your clinician’s dosing.' });
      if (older && !preg) pillLong.push({ t: 'A standard daily multivitamin', id: 'multivitamin-mineral-supplements', g: 'B', d: 'In older adults the COSMOS trials found about +0.07 SD global cognition over 2–3 years (grade B) — small but replicated; the 12-year PHS II trial in well-fed physicians was null.' + (meds ? ' Separate it from levothyroxine; check vitamin K if you take warfarin.' : '') });
      if (older && a.goal === 'memory' && !preg) {
        pillLong.push({ t: 'Bacopa 300 mg/day for 12+ weeks', id: 'bacopa-monnieri', g: 'B', d: 'Better delayed recall in older adults (grade B); inconsistent in younger adults. Stomach upset is common; caution with thyroid medication.' });
        pillLong.push({ t: 'or bioavailable curcumin', id: 'curcumin', g: 'B', d: 'Formulations such as Longvida improved working memory over 4 weeks to 18 months in older adults (grade B). Avoid with liver or gallbladder disease or anticoagulants.' });
      }
      if (plant && !preg && !kidney) pillLong.push({ t: 'Creatine 3–5 g/day', id: 'creatine', g: 'C', d: 'Vegetarians eat little creatine; 5 days at 20 g/day improved memory in vegetarians but not omnivores (grade C). Daily use is capped at 5 g. Also check vitamin B12 (vegans are at risk), iron and iodine.' });
      if (!pillLong.length) pillLong.push({ t: 'None needed', id: 'omega-3-dha-epa', g: 'A', nul: true, d: 'In healthy, well-fed adults no supplement reaches grade B for long-term cognitive improvement. The big names have strong null results: omega-3 DHA/EPA (A), vitamin E (A), vitamin D when not deficient (A). Spend the money on food and sleep.' });
    }
    if (debt) {
      actNow.push({ t: 'Nap, then caffeine', d: 'Night-shift naps improved cognition (effect size 0.25 across 18 studies), and in a driving study a 30-minute nap worked about as well as a 200 mg coffee. Expect 15–30 minutes of grogginess on waking.' });
      actNow.push({ t: 'Protect tonight’s sleep', d: 'Recovery sleep is the only full remedy for sleep loss. Keep caffeine at least ~9 hours before bed — late doses cost about 45 minutes of sleep.' });
    }
    if (a.goal === 'memory' || a.who === 'student') actNow.push({ t: 'Learn, then sleep on it', d: 'Losing a night’s sleep before learning cut later memory by g = 0.62 — bigger than any memory supplement effect in this atlas. Study first, sleep second, no all-nighter.' });
    if (a.goal === 'focus' || a.who === 'worker') actNow.push({ t: 'Beat mental fatigue without a pill', d: 'Over long tasks, pleasant odours, music and extrinsic motivation countered mental fatigue about as well as caffeine in a 2022 review. Breaks and a change of stimulus work.' });
    if (teen || a.diet === 'irregular') actNow.push({ t: teen ? 'Eat breakfast before school' : 'Eat before demanding work', d: teen ? 'Breakfast improved sustained attention in children and adolescents (grade B), especially in undernourished children.' : 'Fasting up to ~48 h barely changes test scores in healthy adults (grade A null), but hunger, irritability and mood reliably worsen — and regular meals matter most when you are physically depleted.' });
    if (!actNow.length) actNow.push({ t: 'Front-load your day', d: 'Put your hardest thinking in the 1–4 h window after your caffeine, and move routine work later so the late-afternoon dose is never needed.' });
    actLong.push({ t: 'Sleep 7+ hours, consistently', d: 'The AASM/SRS consensus. Fourteen days at 6 h in bed caused deficits like one to two nights of total sleep loss, and people did not notice. In 88 students, sleep the month before an exam explained ~25% of grade variance (observational).' });
    actLong.push({ t: 'Move most days', d: 'The atlas foundations review ranks exercise among the top non-supplement levers. This atlas did not grade exercise trials itself, so no grade is shown.' });
    if (older || a.goal === 'capacity') actLong.push({ t: 'MIND-style eating plus an active, social routine', id: 'mind-diet', g: 'B', d: 'A 2-year programme pairing this diet with exercise, cognitive training and social activity improved global cognition in older adults (grade B); the diet alone over 3 years did not. See the Long Game Plate recipe on the Limitless Pill page.' });
    else actLong.push({ t: 'Eat to avoid deficiency, not to “boost”', d: 'Above adequacy, more nutrients buy no extra cognition (the threshold model). Iron, iodine and B12 are the ones worth checking' + (plant ? ' — especially B12 on a vegan diet.' : '.') });
    if (lots) actLong.push({ t: 'Lower your caffeine baseline', d: 'Tolerance builds in frequent users and much of the habitual “boost” is withdrawal reversal. Cutting back lowers that baseline so a single cup does real work again.' });
    if (preg) warn.push('Pregnant or breastfeeding: keep caffeine at or under 200 mg/day (EFSA) and avoid creatine, bacopa, curcumin and L-theanine supplements and ginseng — none has pregnancy safety data. Talk to your midwife or doctor.');
    if (anx) warn.push('Anxiety or panic: caffeine can trigger panic attacks in people with panic disorder (grade A harm).');
    if (f.has('heart')) warn.push('Heart condition or high blood pressure: check any stimulant with your doctor first.');
    if (meds) warn.push('Prescription medication: ginseng and curcumin (anticoagulants), bacopa (liver enzymes, thyroid medication) and multivitamins (warfarin, levothyroxine timing) all carry interaction flags. Run anything new past your pharmacist.');
    if (kidney) warn.push('Kidney disease: creatine is excluded for you.');
    return { T, pillNow, pillLong, actNow, actLong, warn };
  }
  function viewProfile(param) {
    const decoded = param ? pDecode(param) : null;
    const PI = {
      pill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.2 7.5 5.6 9"/></svg>',
      act: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4.5" r="2"/><path d="m10 21 2-6 3 3v3M8 11l3-3 3 1.5 2.5 3M12 15l-1.5-4"/></svg>',
    };
    if (decoded) {
      const r = profileResult(decoded);
      const chips = PQ.map(q => { const v = decoded[q.k]; const lab2 = x => (q.opts.find(o => o[0] === x) || [])[1] || x; return q.multi ? v.map(lab2).join(', ') : lab2(v); });
      const itemH = it => `<li><div class="pf-it-h"><strong>${esc(it.t)}</strong>${it.id ? `<span class="pf-it-src">${monoLink(it.id)} ${it.nul ? '<span class="badge fail" title="Strong evidence of no benefit">null</span>' : ''}${grade(it.g)}</span>` : ''}</div><p>${esc(it.d)}</p></li>`;
      const quad = (cls, icon, title, tfk, items) => `<div class="pf-quad ${cls}"><div class="pf-quad-h"><span class="pf-quad-ic">${icon}</span><h3>${title}</h3>${tf(tfk)}</div><ul class="pf-items">${items.map(itemH).join('')}</ul></div>`;
      return `<div class="profile-page">
      <div class="pf-result-hero"><div class="eyebrow">Your profile type</div><h1>${esc(r.T[0])}</h1><p class="pf-tag">${esc(r.T[1])}</p><p class="pf-note">A descriptive pattern drawn from your answers, not a diagnosis. Habits come first in each row because they carry no side effects.</p>
        <div class="pf-chips">${chips.map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div>
        <div class="pf-actions"><button type="button" class="btn" data-pq="reset">Retake the questions</button><button type="button" class="btn" data-pq="print">Print or save as PDF</button>${shareBtn()}<button type="button" class="btn ghost" data-pq="forget">Delete my answers</button><span class="pf-privacy">${icon('lock')}Your answers stay in this browser; nothing is sent anywhere. Bookmark this page to keep your result.</span></div></div>
      ${r.warn.length ? `<div class="pf-warn"><strong>Before anything else</strong><ul>${r.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
      <div class="pf-grid">
        ${quad('k-act now', PI.act, 'Best non-pill action · short term', 'acute', r.actNow)}
        ${quad('k-pill now', PI.pill, 'Best pill · short term', 'acute', r.pillNow)}
        ${quad('k-act long', PI.act, 'Best non-pill action · long term', 'chronic', r.actLong)}
        ${quad('k-pill long', PI.pill, 'Best pill · long term', 'chronic', r.pillLong)}
      </div>
      <div class="callout info"><strong>How this works.</strong> Your answers run through fixed rules built on this atlas’s graded evidence and safety data. Grades link to the ingredient pages, where every claim has its studies. This is decision support, not a medical assessment. Doses assume a healthy adult unless your answers say otherwise.</div>
      </div>`;
    }
    const step = Math.min(pst.step, PQ.length - 1), q = PQ[step];
    const sel = pst.a[q.k];
    const opt = o => q.multi
      ? `<button type="button" class="pf-opt${(sel || []).includes(o[0]) ? ' on' : ''}" data-pq="toggle:${q.k}:${o[0]}" aria-pressed="${(sel || []).includes(o[0])}"><span class="pf-check"></span><span class="pf-opt-t">${esc(o[1])}</span></button>`
      : `<button type="button" class="pf-opt${sel === o[0] ? ' on' : ''}" data-pq="pick:${q.k}:${o[0]}" aria-pressed="${sel === o[0]}"><span class="pf-opt-t">${esc(o[1])}</span>${o[2] ? `<span class="pf-opt-s">${esc(o[2])}</span>` : ''}</button>`;
    return `<div class="profile-page">
    <div class="page-head"><div><div class="eyebrow">Your profile type</div><h1>Find your brain profile</h1><p class="lead">Six quick questions. You get a profile type and four answers: the best pill for today, the best pill for the long run, and the best non-pill action for each — filtered for what is safe for you.</p></div></div>
    <div class="pf-card">
      <div class="pf-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${PQ.length}" aria-valuenow="${step + 1}">${PQ.map((x, i) => `<span class="${i < step ? 'done' : i === step ? 'cur' : ''}"></span>`).join('')}</div>
      <div class="pf-count">Question ${step + 1} of ${PQ.length}</div>
      <h2 class="pf-q">${esc(q.q)}</h2>${q.sub ? `<p class="small muted" style="margin:-.3rem 0 1rem">${esc(q.sub)}</p>` : ''}
      <div class="pf-opts${q.multi ? ' multi' : ''}">${q.opts.map(opt).join('')}</div>
      <div class="pf-nav">${step > 0 ? '<button type="button" class="btn" data-pq="back">← Back</button>' : '<span></span>'}${q.multi ? `<button type="button" class="btn primary" data-pq="done">See my profile →</button>` : ''}</div>
      <p class="pf-privacy">${icon('lock')}Your answers stay in this browser and you can leave and come back. Nothing is sent anywhere.</p>
    </div>
    </div>`;
  }
  const gst = { pop: 'all' };
  function viewGoals() {
    const IC = {
      focus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
      memory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
      capacity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><circle cx="12" cy="10" r="2.2"/><path d="M6.8 7.1 10.2 9M17.2 7.1 13.8 9M12 12.2v3.6"/></svg>',
    };
    const GOALS = [
      { key: 'focus', title: 'Focus & attention', domains: ['alertness', 'sustained_attention', 'vigilance', 'reaction_time', 'processing_speed', 'cognitive_fatigue'],
        today: 'Caffeine', todayG: 'A', later: 'Nothing reaches grade B in healthy adults', laterG: '',
        verdict: 'Focus is the only goal with **grade-A** evidence, and it is almost entirely **caffeine**: faster reaction time and better sustained attention in healthy adults, and much larger effects when sleep-deprived. L-theanine, coffee, tea and energy drinks (grade B) mostly ride on the same caffeine; theanine smooths the jitter more than it adds focus. Under sleep loss, 3 g glycine before bed for 3 nights (B) reduced next-day fatigue. No long-term nutrient reaches grade B for focus in healthy adults.' },
      { key: 'memory', title: 'Memory & learning', domains: ['working_memory', 'episodic_memory', 'learning', 'learning_retention'],
        today: 'Glucose ~25 g · American ginseng', todayG: 'B', later: 'Bacopa · multivitamin · curcumin (older adults)', laterG: 'B',
        verdict: 'No ingredient reaches **grade A** for memory in any population. In healthy young adults the best same-day results are a **~25 g glucose drink** (B; an inverted U, so more is worse, and many trials are null) and **single-dose American ginseng** for spatial working memory (B; two small industry-funded trials). Long-term grade-B memory benefits appear **only in older adults**: bacopa 300 mg/day for 12 weeks, a daily multivitamin (COSMOS, ~0.06 SD), and bioavailable curcumin. In young adults bacopa is inconsistent, and zinc and iodine have grade-B *null* results.' },
      { key: 'capacity', title: 'Overall cognitive capacity', domains: ['global_cognition', 'executive_function', 'cognitive_aging', 'cognitive_decline', 'dementia_risk', 'resistance_to_decline'],
        today: 'None — nothing raises it in a day', todayG: '', later: 'Fix deficiencies · multivitamin · MIND-style lifestyle', laterG: 'B',
        verdict: 'For overall capacity the strongest real lever is **correcting what is missing**, not adding more: thiamine reverses deficiency-driven confusion (A, clinical), and iron raises IQ-type scores in **iron-deficient or anaemic** children (B), with no effect in replete people and a harm signal in replete infants. In healthy older adults a daily multivitamin (B, a small 0.07 SD over 2–3 years) and multidomain programmes that pair a MIND/Mediterranean-style diet with exercise and cognitive activity (B) help a little. The most-marketed brain supplements have strong **null** results here: omega-3 DHA/EPA (A), vitamin E (A), vitamin D (A), and B12/folate without deficiency (B). Nothing raises global cognition in healthy young adults.' },
    ];
    const POPF = [['all', 'All populations'], ['young', 'Healthy young adults, students, workers'], ['sleep', 'Sleep-deprived adults'], ['older', 'Healthy older adults'], ['mci', 'Older adults with MCI'], ['deficient', 'Deficient / low baseline']];
    const inPop = r => gst.pop === 'all' || POP_SETS[gst.pop].has(r.population);
    const general = new Set(['healthy_young_adults', 'students', 'knowledge_workers', 'high_cognitive_workload', 'mixed_adults']);
    const clean = t => { const s = String(t || '').replace(/\s*\[[A-Za-z][A-Za-z0-9_, -]*\]/g, ''); return s.length > 240 ? s.slice(0, s.lastIndexOf(' ', 236)) + '…' : s; };
    const bestPer = rows => { const b = {}; rows.forEach(r => { const k = r._m.id, cur = b[k]; if (!cur || GR[r.grade] > GR[cur.grade] || (GR[r.grade] === GR[cur.grade] && general.has(r.population) && !general.has(cur.population))) b[k] = r; }); return Object.values(b); };
    const rank = (a, b) => GR[b.grade] - GR[a.grade] || (general.has(b.population) - general.has(a.population)) || b._m._derived.composite_score - a._m._derived.composite_score;
    const pick = (doms, long) => bestPer(ROWS.filter(r => doms.includes(r.domain) && ['benefit', 'possible_benefit'].includes(r.direction) && 'ABC'.includes(r.grade) && r.grade && (long ? r.timeframe === 'chronic' : r.timeframe !== 'chronic') && inPop(r))).sort(rank).slice(0, 8);
    const nulls = doms => bestPer(ROWS.filter(r => doms.includes(r.domain) && r.direction === 'no_benefit' && 'AB'.includes(r.grade) && r.grade && inPop(r))).sort(rank);
    const item = r => `<li class="gl-item"><div class="gl-top"><span class="gl-name">${catAv(r._m, 'sm')}${monoLink(r._m.id)}</span><span class="gl-badges">${grade(r.grade)}${tf(r.timeframe)}</span></div>
      <div class="gl-pop${general.has(r.population) ? '' : ' only'}">${general.has(r.population) ? '' : 'only shown in · '}${esc(lab(POP_LABEL, r.population))}</div>
      ${r.dose_or_intake ? `<div class="gl-dose">${esc(clean(r.dose_or_intake))}</div>` : ''}
      <p class="gl-eff">${esc(clean(r.effect_summary))}</p></li>`;
    const list = rows => rows.length ? `<ol class="gl-list">${rows.map(item).join('')}</ol>` : `<p class="gl-empty">Nothing at grade C or better for this population.</p>`;
    const sec = g => { const nl = nulls(g.domains); return `<section class="gl-sec" id="goal-${g.key}">
      <div class="gl-head"><span class="gl-ic">${IC[g.key]}</span><div><h2>${esc(g.title)}</h2><p class="small muted" style="margin:0">${g.domains.map(d => esc(lab(DOMAIN_LABEL, d))).join(' · ')}</p></div></div>
      <div class="gl-verdict prose">${md(g.verdict)}</div>
      <div class="gl-cols">
        <div class="gl-col"><h3>Short term <span class="gl-tfs">${tf('acute')}${tf('short_term_days')}</span></h3>${list(pick(g.domains, false))}</div>
        <div class="gl-col"><h3>Long term <span class="gl-tfs">${tf('chronic')}</span></h3>${list(pick(g.domains, true))}</div>
      </div>
      ${nl.length ? `<details class="gl-null"><summary><span>Strong evidence it does <strong>not</strong> help</span><span class="gl-null-n">${nl.length}</span></summary><ul>${nl.map(r => `<li>${monoLink(r._m.id)} ${grade(r.grade)} ${tf(r.timeframe)} <span class="muted small">${esc(lab(POP_LABEL, r.population))} — ${esc(clean(r.effect_summary))}</span></li>`).join('')}</ul></details>` : ''}
    </section>`; };
    return `<div class="goals-page">
    <div class="page-head"><div><div class="eyebrow">Best by cognitive goal</div><h1>What actually works for memory, focus and overall capacity</h1>
      <p class="lead">Three different goals, three different answers. Each list below is computed live from the graded evidence rows (grade C or better, benefit direction), the best row per ingredient, ranked by grade with healthy-adult evidence first. The short-term and long-term columns are kept apart because a same-day boost and a years-long change are different things.</p></div></div>
    <nav class="toc gl-nav" aria-label="Jump to a goal">${GOALS.map(g => `<a href="#goals" data-jump="goal-${g.key}" class="gl-card"><span class="gl-ic">${IC[g.key]}</span><span class="gl-card-t">${esc(g.title)}</span>
      <span class="gl-row"><span class="gl-k">Today</span><span>${esc(g.today)} ${g.todayG ? grade(g.todayG) : ''}</span></span>
      <span class="gl-row"><span class="gl-k">Long term</span><span>${esc(g.later)} ${g.laterG ? grade(g.laterG) : ''}</span></span></a>`).join('')}</nav>
    <div class="filters gl-filter"><label>Show evidence for<select id="goal-pop">${POPF.map(([k, l]) => `<option value="${k}"${gst.pop === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <span class="small muted">Rows tagged <span class="gl-pop only" style="display:inline">only shown in</span> come from a narrower population and may not apply to you.</span></div>
    ${GOALS.map(sec).join('')}
    <div class="callout info"><strong>Reading these lists.</strong> A grade belongs to one ingredient × outcome × population × timeframe, not to the ingredient overall. Deficiency correction (iron, thiamine, B12) helps people who are deficient and does nothing for those who are not. Open any ingredient for its full evidence table, safety limits and regulatory status before acting on it.</div>
    </div>`;
  }
  function viewLongterm() {
    const rows = ROWS.filter(r => r.timeframe !== 'acute');
    const mrows = []; MONOS.forEach(m => (m.longterm_matrix || []).forEach(r => mrows.push(Object.assign({ _m: m }, r))));
    const sy = SYN['longterm-synthesis'];
    return `<div class="page-head"><div><h1>Long-term cognitive function ${tf('short_term_days')} ${tf('chronic')}</h1><p class="lead">Interventions of two weeks to many years: memory, executive function, cognitive aging, decline and dementia-related outcomes. This page mixes two timeframes — the ${tf('short_term_days')} badge marks 2–13 day loading/supplementation trials, ${tf('chronic')} marks ≥2 week trials — so check the badge on each row rather than assuming every result here needs months. A biomarker change is not a cognitive benefit, and reducing a risk factor is not enhancement.</p></div></div>
    ${sy ? `<div class="card prose"><h3>Synthesis</h3>${md(sy.summary)}</div>${(sy.domains || []).map(d => `<div class="section prose"><h2>${esc(lab(DOMAIN_LABEL, d.domain) || d.domain)}</h2>${md(d.conclusion)}${d.best_supported && d.best_supported.length ? '<h4>Best supported</h4>' + structured(d.best_supported.map(x => Object.assign({}, x, { ingredient: byId[x.monograph_id] ? byId[x.monograph_id].name : x.monograph_id }))) : ''}${d.not_supported && d.not_supported.length ? '<h4>Not supported / insufficient</h4>' + structured(d.not_supported) : ''}${d.uncertainties ? '<h4>Uncertainties</h4>' + md(d.uncertainties) : ''}</div>`).join('')}${(sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('')}` : `<div class="section">${pending('The long-term evidence narrative synthesis', 'research/syntheses/longterm-synthesis.json')}</div>`}
    <div class="section"><h2>Long-term evidence rows (graded)</h2>${evidenceTable('chronic-rows', rows)}</div>
    <div class="section"><h2>Long-Term Cognitive Health Evidence Matrix</h2>${dataTable({ id: 'lt-matrix', rows: mrows, defaultSort: 'ing', defaultDir: 'asc', pageSize: 150, columns: [
      { key: 'ing', label: 'Intervention', sort: r => r._m.name.toLowerCase(), render: r => `<a href="#ingredient.${esc(r._m.id)}">${esc(r._m.name)}</a>`, cls: 'tight' },
      { key: 'dur', label: 'Duration', sort: false, render: r => esc(r.duration) }, { key: 'pop', label: 'Population', sort: false, render: r => esc(r.population), cls: 'wrap' },
      { key: 'out', label: 'Cognitive outcome', sort: false, render: r => esc(r.outcome), cls: 'wrap' }, { key: 'eff', label: 'Effect estimate', sort: false, render: r => inline(r.effect_estimate), cls: 'wrap' },
      { key: 'q', label: 'Evidence quality', sort: false, render: r => inline(r.evidence_quality), cls: 'wrap' }, { key: 'lim', label: 'Limitations', sort: false, render: r => inline(r.limitations), cls: 'wrap' },
      { key: 'st', label: 'Studies', sort: false, render: r => (r.study_ids || []).map(s => esc(s)).join(', ') },
    ], filters: [{ key: 'cat', label: 'Category', options: CAT_OPTS, match: (r, v) => r._m.category === v }], search: (r, q) => (r._m.name + ' ' + r.outcome + ' ' + r.population).toLowerCase().includes(q) })}</div>`;
  }

  // plain answers for beginners: "does it help X?", computed from the graded rows, never from mechanisms or biomarkers
  const QA_GOALS = [
    ['Focus & alertness', 'attention, reaction time, fatigue', ['alertness', 'sustained_attention', 'vigilance', 'reaction_time', 'processing_speed', 'cognitive_fatigue', 'resistance_to_decline']],
    ['Memory & learning', 'working memory, recall, learning', ['working_memory', 'episodic_memory', 'learning', 'learning_retention']],
    ['Long-run brain health', 'weeks to years of use', ['global_cognition', 'executive_function', 'cognitive_aging', 'cognitive_decline', 'dementia_risk', 'episodic_memory'], 'chronic'],
  ];
  function quickAnswer(m, doms, onlyTf) {
    const rows = (m.evidence_by_outcome || []).filter(r => doms.includes(r.domain) && (!onlyTf || r.timeframe === onlyTf));
    if (!rows.length) return { cls: 'none', a: 'Not studied', d: onlyTf ? 'No long-term human study in this atlas measured it. Unknown is not the same as “does not work”.' : 'No human study in this atlas measured it. Unknown is not the same as “does not work”.' };
    const order = (x, y) => GR[y.grade] - GR[x.grade] || GENERAL.has(y.population) - GENERAL.has(x.population);
    const ben = rows.filter(r => isBenefit(r) && 'ABC'.includes(r.grade)).sort(order);
    const nul = rows.filter(r => ['no_benefit', 'harm'].includes(r.direction) && 'AB'.includes(r.grade || 'x')).sort(order);
    const where = r => `${grade(r.grade)} ${tf(r.timeframe)} <strong>${esc(lab(DOMAIN_LABEL, r.domain))}</strong> in ${esc(popWord(r.population))}`;
    const not = r => `${grade(r.grade)} ${r.direction === 'harm' ? 'a negative effect on' : 'no effect on'} ${esc(lab(DOMAIN_LABEL, r.domain).toLowerCase())} in ${esc(popWord(r.population))}`;
    const b = ben[0], n = nul[0];
    if (b && 'AB'.includes(b.grade)) return { cls: 'yes', a: GENERAL.has(b.population) ? 'Yes' : 'In some groups', d: where(b) + (n ? ` <span class="muted">· but good evidence of ${not(n)}</span>` : '') };
    if (n) return { cls: 'no', a: n.direction === 'harm' ? 'No, may harm' : 'No', d: 'Good trials found ' + not(n) + (b ? ` <span class="muted">· weaker positive signal: ${where(b)}</span>` : '') };
    if (b) return { cls: 'weak', a: 'Maybe', d: 'Limited evidence only: ' + where(b) };
    return { cls: 'weak', a: 'Unclear', d: 'Studied, but the results are weak, mixed or preliminary.' };
  }
  // the three answers as one scannable strip of icons (lists); the words stay in the tooltip and for screen readers
  const VT_SHORT = ['Focus', 'Memory', 'Long-run'];
  function vTrio(m) {
    return `<span class="vtrio">${QA_GOALS.map(([q, , doms, onlyTf], i) => { const x = quickAnswer(m, doms, onlyTf); return `<span class="vt" title="${esc(q)}: ${esc(x.a)}">${vIcon(x.a)}<span>${VT_SHORT[i]}</span><span class="sr">: ${esc(x.a)}</span></span>`; }).join('')}</span>`;
  }

  // evidence map: what was measured (rows) x how long it was taken (columns); letter = strength, arrow = direction
  const MAP_GROUPS = [
    ['Focus & alertness', ['alertness', 'sustained_attention', 'vigilance', 'reaction_time', 'processing_speed', 'cognitive_fatigue', 'resistance_to_decline']],
    ['Memory & learning', ['working_memory', 'episodic_memory', 'learning', 'learning_retention']],
    ['Thinking & ageing', ['executive_function', 'global_cognition', 'cognitive_aging', 'cognitive_decline', 'dementia_risk']],
    ['Not a thinking test', ['sleep_related_cognition', 'mood_stress', 'vascular_health', 'cerebral_blood_flow', 'neuroplasticity_biomarkers', 'other']],
  ];
  const DIR_KIND = { benefit: ['up', 'Benefit'], possible_benefit: ['up', 'Possible benefit'], no_benefit: ['flat', 'No effect'], inconsistent: ['wave', 'Mixed'], insufficient: ['wave', 'Too little evidence'], harm: ['down', 'Negative effect'] };
  const MAP_TF = ['acute', 'short_term_days', 'chronic'];
  function evidenceMap(m) {
    const rows = (m.evidence_by_outcome || []).map((r, i) => Object.assign({ _i: i }, r)).filter(r => GR[r.grade]);
    if (!rows.length) return '<p class="muted">No graded findings yet.</p>';
    const cell = (dom, t) => {
      const hit = rows.filter(r => r.domain === dom && r.timeframe === t).sort((x, y) => GR[y.grade] - GR[x.grade] || GENERAL.has(y.population) - GENERAL.has(x.population));
      if (!hit.length) return '<span class="em-cell em-empty" aria-label="not studied">·</span>';
      const r = hit[0], k = DIR_KIND[r.direction] || DIR_KIND.inconsistent;
      const tip = `${lab(DOMAIN_LABEL, dom)} · ${TF_SHORT[t]} · grade ${r.grade} (${GRADE_WORD[r.grade]}) · ${k[1]} · ${lab(POP_LABEL, r.population)}. ${String(r.effect_summary || '').replace(/\[[^\]]*\]/g, '').slice(0, 170)}${hit.length > 1 ? ` (+${hit.length - 1} more finding${hit.length > 2 ? 's' : ''})` : ''}`;
      return `<button type="button" class="em-cell em-${k[0]}" data-tip="${esc(tip)}" data-emrow="${r._i}" aria-label="${esc(tip)}">${icon(k[0])}${grade(r.grade)}${hit.length > 1 ? `<small>+${hit.length - 1}</small>` : ''}</button>`;
    };
    const body = MAP_GROUPS.map(([g, doms]) => {
      const ds = doms.filter(d => rows.some(r => r.domain === d));
      return ds.length ? `<div class="em-g">${esc(g)}</div>` + ds.map(d => `<div class="em-d">${esc(lab(DOMAIN_LABEL, d))}</div>${MAP_TF.map(t => cell(d, t)).join('')}`).join('') : '';
    }).join('');
    return `<div class="emap" role="group" aria-label="Evidence map"><div class="em-h"></div>${MAP_TF.map(t => `<div class="em-h">${tf(t)}</div>`).join('')}${body}</div>
      <div class="em-key">${['up', 'flat', 'wave', 'down'].map(k => `<span class="em-k em-${k}">${icon(k)}${{ up: 'Benefit', flat: 'No effect', wave: 'Mixed', down: 'Negative' }[k]}</span>`).join('')}<span class="em-k">${grade('A')}…${grade('E')} strength of evidence</span><span class="em-k">${'·'} not studied</span></div>`;
  }
  const ist = { id: null, tab: 'overview' };
  function viewIngredient(id) {
    const m = byId[id];
    if (!m) return `<div class="page-head"><div><h1>Ingredient not found</h1><p class="lead">There is no ingredient with the id <code>${esc(id)}</code>. <a href="#database">Browse all ingredients</a> or press <kbd>/</kbd> to search.</p></div></div>`;
    if (ist.id !== id) { ist.id = id; ist.tab = 'overview'; }
    noteRecent(id);
    const d = m._derived, s = m.safety || {}, r = m.regulatory || {}, f = m.formulation || {}, sc = m.scores || {};
    const studies = m.studies || [];
    const sid = x => `<a href="#" class="ref" data-ref="${esc(x)}">${esc(x)}</a>`;
    const rowsT = (m.evidence_by_outcome || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Timeframe</th><th>Domain</th><th>Population</th><th>Dose / intake</th><th>Duration</th><th>Grade</th><th>Direction</th><th>Effect</th><th>Certainty (GRADE reasoning)</th><th>Key studies</th></tr></thead><tbody>${m.evidence_by_outcome.map((x, i) => `<tr id="ev-row-${i}"><td class="tight">${tf(x.timeframe)}</td><td>${esc(lab(DOMAIN_LABEL, x.domain))}</td><td class="wrap">${esc(lab(POP_LABEL, x.population))}<br><small>${esc(x.population_detail)}</small></td><td class="wrap">${esc(x.dose_or_intake)}</td><td>${esc(x.duration)}</td><td>${grade(x.grade)}</td><td>${dir(x.direction)}</td><td class="wrap">${inline(x.effect_summary)}<br><small class="mono">${esc(x.effect_estimate)}</small></td><td class="wrap">${inline(x.certainty_notes)}</td><td>${(x.key_study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No outcome rows.</p>';
    const acuteT = (m.acute_matrix || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dose</th><th>Onset</th><th>Duration studied</th><th>Domain</th><th>Population</th><th>Effect estimate</th><th>Certainty</th><th>Safety</th><th>Studies</th></tr></thead><tbody>${m.acute_matrix.map(x => `<tr><td class="wrap">${esc(x.dose)}</td><td>${esc(x.onset)}</td><td>${esc(x.duration_studied)}</td><td>${esc(lab(DOMAIN_LABEL, x.domain) || x.domain)}</td><td class="wrap">${esc(x.population)}</td><td class="wrap">${inline(x.effect_estimate)}</td><td class="wrap">${inline(x.certainty)}</td><td class="wrap">${inline(x.safety)}</td><td>${(x.study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No same-day rows: not studied acutely, or not applicable.</p>';
    const ltT = (m.longterm_matrix || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Duration</th><th>Population</th><th>Outcome</th><th>Effect estimate</th><th>Evidence quality</th><th>Limitations</th><th>Studies</th></tr></thead><tbody>${m.longterm_matrix.map(x => `<tr><td>${esc(x.duration)}</td><td class="wrap">${esc(x.population)}</td><td class="wrap">${esc(x.outcome)}</td><td class="wrap">${inline(x.effect_estimate)}</td><td class="wrap">${inline(x.evidence_quality)}</td><td class="wrap">${inline(x.limitations)}</td><td>${(x.study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No long-term rows.</p>';
    const path = (m.mechanism && m.mechanism.pathway_map || []).map((p, i) => `<div class="step"><div class="i">${i + 1}</div><div><strong>${esc(p.step)}</strong><br><span class="small">${inline(p.detail)}</span></div><div class="badge neutral ev-${esc(p.evidence_level)}">${esc(lab(EV_LABEL, p.evidence_level))}</div></div>`).join('');
    const studyCard = st => `<details class="study" id="study-${esc(st.id)}"><summary><span class="badge neutral">${esc(st.id)}</span><span class="t">${esc(st.title)}</span><span class="small nowrap">${esc(st.authors ? st.authors.split(',')[0] : '')} ${esc(st.year)}</span><span class="pill">${esc(st.design)}</span><span class="pill">n=${esc(st.sample_size)}</span><span class="pill">${esc(st.role)}</span>${verifBadge(st)}</summary><div class="body"><dl class="kv">
      <dt>Journal</dt><dd>${esc(st.journal)} ${esc(st.year)} · ${[pmLink(st), doiLink(st), pmcLink(st), st.registration ? esc(st.registration) : '', st.url ? `<a href="${esc(st.url)}" target="_blank" rel="noopener">source</a>` : ''].filter(Boolean).join(' · ')}</dd>
      <dt>Design</dt><dd>${esc(st.design)}${st.country ? ' · ' + esc(st.country) : ''} · risk of bias: ${esc(st.risk_of_bias)} · access: ${esc(st.access_level)}</dd>
      <dt>Population</dt><dd>${esc(st.population)}${st.baseline_status ? ' · baseline: ' + esc(st.baseline_status) : ''}</dd>
      <dt>Intervention</dt><dd>${esc(st.intervention)}${st.dose ? ' · dose: ' + esc(st.dose) : ''} · duration: ${esc(st.duration)} · comparator: ${esc(st.comparator)}</dd>
      <dt>Outcomes</dt><dd>${esc(st.outcomes)}${st.instruments ? ' · instruments: ' + esc(st.instruments) : ''}</dd>
      <dt>Results</dt><dd>${inline(st.results)}</dd>
      <dt>Effect estimate</dt><dd class="mono">${esc(st.effect_estimate || '—')}${st.ci ? ' · CI: ' + esc(st.ci) : ''}${st.significance ? ' · ' + esc(st.significance) : ''}</dd>
      <dt>Practical significance</dt><dd>${inline(st.clinical_significance || '—')}</dd>
      <dt>Adverse events</dt><dd>${inline(st.adverse_events || '—')}</dd>
      <dt>Funding / COI</dt><dd>${esc(st.funding || '—')}${st.coi ? ' · ' + esc(st.coi) : ''}</dd>
      <dt>Limitations</dt><dd>${inline(st.limitations)}</dd>
      <dt>Relevance to Brain Food</dt><dd>${inline(st.relevance_to_brain_food)}</dd>
      ${st.verification_note ? `<dt>Verification note</dt><dd>${inline(st.verification_note)}</dd>` : ''}${st.verification && st.verification.matched_title ? `<dt>Matched record</dt><dd class="small">${esc(st.verification.matched_title)} (similarity ${esc(st.verification.similarity)}, ${esc(st.verification.source)})</dd>` : ''}
    </dl></div></details>`;
    const roleOrder = { systematic_review: 0, supporting: 1, mixed: 2, null_or_negative: 3, safety: 4, mechanistic: 5, background: 6 };
    const sorted = studies.slice().sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || String(b.year).localeCompare(String(a.year)));
    // the best benefit row behind each headline grade, so the tile can say who it was shown in
    const bestFor = (pred, g) => { const x = (m.evidence_by_outcome || []).filter(r => !NONCOG.has(r.domain) && isBenefit(r) && pred(r)).sort((p, q) => GR[q.grade] - GR[p.grade] || GENERAL.has(q.population) - GENERAL.has(p.population))[0]; return x && x.grade === g ? x : null; };
    const ba = bestFor(r => r.timeframe === 'acute', d.best_grade_acute), bl = bestFor(r => r.timeframe === 'chronic', d.best_grade_chronic);
    const tile = (ic, k, v, sub) => `<div class="gl-tile"><div class="gt-k">${icon(ic)}${k}</div><div class="gt-v">${v}</div><div class="gt-s">${sub}</div></div>`;
    const gTile = (ic, k, g, row, none) => tile(ic, k, g ? `${grade(g)}${GRADE_WORD[g]}` : `${grade(null)}No grade`, g ? (row ? `${esc(lab(DOMAIN_LABEL, row.domain))} in ${esc(popWord(row.population))}` : 'Best grade for a measured benefit') : none);
    const nulls = (m.evidence_by_outcome || []).filter(x => ['no_benefit', 'harm'].includes(x.direction) && 'AB'.includes(x.grade || 'x'));
    const cmpIds = [m.id].concat(CMP.filter(x => x !== m.id)).slice(0, 4);
    const TABS = [['overview', 'Overview'], ['evidence', 'Evidence', (m.evidence_by_outcome || []).length], ['safety', 'Safety & rules'], ['studies', 'Studies', d.n_studies]];
    const pane = (k, body) => `<section class="tabpane" data-tab="${k}" id="pane-${k}" role="tabpanel" aria-labelledby="tab-${k}"${ist.tab === k ? '' : ' hidden'}>${body}</section>`;
    return `<div class="ing-page">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#database">Ingredients</a>${icon('chev')}<span>${esc(m.category)} · ${esc(m.category_name)}</span></nav>
    <div class="ing-hero"><div><div class="ing-title">${catAv(m, 'lg')}<h1>${esc(m.name)}</h1></div><p class="verdict">${esc(m.one_line_verdict)}</p></div>
      <div class="ing-actions">${cmpTog(m, true)}${shareBtn()}</div></div>
    <section class="qa" aria-labelledby="qa-t"><div class="qa-h"><h2 id="qa-t">Does it actually help?</h2><p>Human studies only. Biomarkers and mood never count.</p></div>
      ${QA_GOALS.map(([q, sub, doms, onlyTf]) => { const x = quickAnswer(m, doms, onlyTf); return `<div class="qa-row"><div class="qa-q">${esc(q)}<small class="muted">${esc(sub)}</small></div><div class="qa-a ${(VERDICT[x.a] || VERDICT.Unclear)[1]}">${vIcon(x.a)}${esc(x.a)}</div><div class="qa-d">${x.d}</div></div>`; }).join('')}
    </section>
    <div class="glance">
      ${gTile('zap', 'Same day', d.best_grade_acute, ba, 'No same-day benefit graded')}
      ${gTile('hourglass', 'Long-term', d.best_grade_chronic, bl, 'No long-term benefit graded')}
      ${tile('shield', 'Safety', gate(d.safety_gate), esc(GATE_WORD[d.safety_gate] || ''))}
      ${tile('scale', 'Legal status', gate(d.regulatory_gate), esc(GATE_WORD[d.regulatory_gate] || ''))}
    </div>
    <div class="ing-status"><span>${icon('check')}${d.n_verified} of ${d.n_studies} studies verified against PubMed or Crossref</span><span>Overall score <strong class="mono">${d.composite_score.toFixed(1)}</strong>/10</span>${d.review_status === 'reviewed' ? '<span class="badge pass">Independently reviewed</span>' : '<span><span class="badge conditional">Draft</span> independent review pending</span>'}</div>
    <div id="itabs-anchor" class="itabs-anchor"></div>
    <div class="itabs" role="tablist" aria-label="Ingredient sections">${TABS.map(([k, l, n]) => `<button type="button" role="tab" id="tab-${k}" data-itab="${k}" aria-controls="pane-${k}" aria-selected="${ist.tab === k}" tabindex="${ist.tab === k ? 0 : -1}">${esc(l)}${n ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>
    ${pane('overview', `
      <figure class="section fig" id="emap"><figcaption class="fig-h"><b>Evidence map</b><span>Every graded finding at a glance: what was measured, how long it was taken, which way it went and how strong the evidence is. Hover or tap a cell for the detail; click it to open the finding.</span></figcaption>${evidenceMap(m)}</figure>
      ${d.review_status !== 'reviewed' ? '<div class="callout">Draft. Written and self-audited by the research agent, and every cited study was matched to its PubMed or Crossref record. The independent second review (citation audit, null-trial hunt, grade check) has not run yet.</div>' : ''}
      <div class="section prose" id="conclusion"><h2>Scientific conclusion</h2>${md(m.scientific_conclusion)}</div>
      <div class="section prose" id="deficiency"><h2>Fixing a deficiency vs boosting a healthy brain</h2>${md(m.deficiency_vs_enhancement)}</div>
      <div class="section prose" id="marketing"><h2>Marketing claims vs evidence</h2>${md(m.marketing_vs_evidence)}</div>
      <div class="section prose" id="mechanism"><h2>How it might work</h2>${md(m.mechanism && m.mechanism.summary)}<div class="pathway">${path}</div><p class="small">Pathways: ${esc((m.mechanism && m.mechanism.pathways || []).join(', '))}. A mechanism is not a substitute for a positive clinical trial.</p></div>
      <div class="section" id="about"><h2>Names and sources</h2><dl class="kv"><dt>Also known as</dt><dd>${esc((m.aliases || []).join(', ') || '—')}</dd><dt>Food sources</dt><dd>${esc((m.food_sources || []).join(', ') || '—')}</dd><dt>Active constituents</dt><dd>${esc((m.active_constituents || []).join(', ') || '—')}</dd></dl></div>
      <div class="section prose" id="gaps"><h2>What is still unknown</h2>${fmtList(m.research_gaps)}</div>`)}
    ${pane('evidence', `
      ${nulls.length ? `<div class="section" id="nulls"><h2>Where good trials found no benefit, or harm</h2><p class="small">Shown first on purpose: a strong null or negative result matters as much as a positive one.</p><ul class="null-list">${nulls.map(x => `<li>${grade(x.grade)}${tf(x.timeframe)}<span><strong>${esc(lab(DOMAIN_LABEL, x.domain))}</strong> · ${esc(lab(POP_LABEL, x.population))} — ${inline(x.effect_summary)}</span></li>`).join('')}</ul></div>` : ''}
      <div class="section" id="evidence"><h2>Every finding, by outcome, population and timeframe</h2>${rowsT}</div>
      <div class="section" id="acute"><h2>Same-day detail: dose, onset, duration</h2>${acuteT}</div>
      <div class="section" id="longterm"><h2>Long-term detail</h2>${ltT}</div>
      <div class="section" id="scores"><h2>Scores (0–10, transparent heuristics)</h2><div class="scoregrid">${[['evidence_quality', 'Evidence quality (30%)'], ['effect_magnitude', 'Effect magnitude (20%)'], ['safety', 'Safety (20%)'], ['reproducibility', 'Reproducibility (10%)'], ['food_suitability', 'Food suitability (10%)'], ['cost_access', 'Cost / access (10%)']].map(([k, l]) => `<div><div class="lab">${l}</div>${bar(sc[k])}</div>`).join('')}</div><p class="small">${inline(sc.rationale)}</p></div>`)}
    ${pane('safety', `
      <div class="section prose" id="safety"><h2>Safety</h2>${md(s.summary)}<dl class="kv"><dt>Adverse effects</dt><dd>${fmtList(s.adverse_effects)}</dd><dt>Contraindications</dt><dd>${fmtList(s.contraindications)}</dd><dt>Drug interactions</dt><dd>${fmtList(s.drug_interactions)}</dd><dt>Upper limits</dt><dd>${inline(s.upper_limits)}</dd><dt>Sleep impact</dt><dd>${inline(s.sleep_impact)}</dd><dt>Long-term exposure</dt><dd>${inline(s.long_term_exposure_studied)}</dd><dt>Daily use appropriate</dt><dd>${esc(s.daily_use_appropriate)}</dd><dt>Special populations</dt><dd>${inline(s.special_populations)}</dd><dt>Specialist review</dt><dd>${esc((s.specialist_review_needed || []).join(', ') || 'none flagged')}</dd><dt>Hard safety gate</dt><dd>${gate(s.hard_safety_gate)} ${inline(s.gate_reason)}</dd></dl></div>
      <div class="section prose" id="regulatory"><h2>Regulatory status</h2><dl class="kv"><dt>European Union</dt><dd>${md(r.eu)}</dd><dt>United States</dt><dd>${md(r.us)}</dd><dt>Morocco</dt><dd>${md(r.morocco)}</dd><dt>Authorised claim examples</dt><dd>${fmtList(r.permitted_claims_examples)}</dd><dt>Novel food / NDI issues</dt><dd>${inline(r.novel_food_or_ndi_issues)}</dd><dt>Regulatory gate</dt><dd>${gate(r.regulatory_gate)}</dd></dl></div>
      <div class="section prose" id="formulation"><h2>Formulation and food suitability</h2><dl class="kv"><dt>Food suitability</dt><dd>${inline(f.food_suitability)}</dd><dt>Formats</dt><dd>${esc((f.formats || []).join(', ') || '—')}</dd><dt>Stability</dt><dd>${inline(f.stability)}</dd><dt>Taste</dt><dd>${inline(f.taste)}</dd><dt>Matrix / bioavailability</dt><dd>${inline(f.bioavailability_matrix)}</dd><dt>Dose feasibility</dt><dd>${inline(f.dose_feasibility)}</dd><dt>Cost and availability</dt><dd>${inline(f.cost_availability)}</dd><dt>Cost evidence</dt><dd>${inline(f.cost_evidence)}</dd></dl></div>`)}
    ${pane('studies', READY.details ? `
      <div class="section" id="studies"><h2>Studies (${studies.length})</h2><p class="small">Ordered: systematic reviews, supporting, mixed, null/negative, safety, mechanistic. Open a study for the full extraction. The badge shows whether its record was confirmed against PubMed or Crossref.</p>${sorted.map(studyCard).join('')}</div>
      <div class="section" id="search"><h2>Search log</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Database</th><th>Query</th><th>Date</th><th>Hits</th></tr></thead><tbody>${(m.search_log || []).map(q => `<tr><td>${esc(q.database)}</td><td class="wrap mono small">${esc(q.query)}</td><td>${esc(q.date)}</td><td class="num">${esc(q.hits)}</td></tr>`).join('')}</tbody></table></div><h3>Coverage notes</h3><div class="prose">${md(m.coverage_notes)}</div></div>
      <div id="review">${m._critique ? critiqueBlock(m._critique) : ''}</div>` : loadingHtml('the studies'))}
    </div>`;
  }
  function setITab(app, t) {
    ist.tab = t;
    app.querySelectorAll('.itabs [data-itab]').forEach(b => { const on = b.dataset.itab === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('tabindex', on ? '0' : '-1'); });
    app.querySelectorAll('.tabpane[data-tab]').forEach(p => { p.hidden = p.dataset.tab !== t; });
  }

  // computed fallback rankings (used until the synthesis file exists; always shown as a transparent appendix)
  function computedRankings() {
    const NONCOG = new Set(['neuroplasticity_biomarkers', 'cerebral_blood_flow', 'vascular_health', 'mood_stress', 'other']);
    const rowsFor = (pred) => { const best = {}; ROWS.forEach(r => { if (NONCOG.has(r.domain) || !pred(r)) return; if (!['benefit', 'possible_benefit'].includes(r.direction)) return; const b = best[r._m.id]; if (!b || GR[r.grade] > GR[b.grade]) best[r._m.id] = r; }); return Object.values(best).sort((a, b) => GR[b.grade] - GR[a.grade] || b._m._derived.composite_score - a._m._derived.composite_score); };
    const acuteDom = new Set(['alertness', 'sustained_attention', 'vigilance', 'reaction_time', 'processing_speed', 'cognitive_fatigue', 'resistance_to_decline']);
    const mem = new Set(['learning', 'episodic_memory', 'learning_retention']);
    const lt = new Set(['global_cognition', 'cognitive_aging', 'cognitive_decline', 'dementia_risk', 'episodic_memory', 'executive_function', 'working_memory']);
    const list = (rows, note) => rows.slice(0, 12).map((r, i) => ({ rank: i + 1, id: r._m.id, grade: r.grade, why: `${lab(DOMAIN_LABEL, r.domain)} · ${lab(POP_LABEL, r.population)} · ${r.dose_or_intake} · ${r.effect_summary}`, elig: r._m._derived.eligibility }));
    return [
      { key: 'A', title: 'Best supported for acute alertness and attention', entries: list(rowsFor(r => r.timeframe === 'acute' && acuteDom.has(r.domain))) },
      { key: 'B', title: 'Best supported for working memory', entries: list(rowsFor(r => r.domain === 'working_memory')) },
      { key: 'C', title: 'Best supported for learning and recall', entries: list(rowsFor(r => mem.has(r.domain))) },
      { key: 'D', title: 'Best supported under sleep deprivation or acute stress', entries: list(rowsFor(r => r.population === 'sleep_deprived' || /stress|sleep/i.test(r.population_detail || ''))) },
      { key: 'E', title: 'Best supported for long-term cognitive function', entries: list(rowsFor(r => r.timeframe !== 'acute' && lt.has(r.domain))) },
      { key: 'F', title: 'Best whole-food and dietary-pattern candidates', entries: list(rowsFor(r => ['J', 'K', 'A'].includes(r._m.category))) },
      { key: 'G', title: 'Best candidates for product development (no failed gate, by composite score)', entries: MONOS.filter(m => m._derived.eligibility !== 'ineligible' && sortGrade(m._derived.best_grade_overall) >= 3).sort((a, b) => b._derived.composite_score - a._derived.composite_score).slice(0, 12).map((m, i) => ({ rank: i + 1, id: m.id, grade: m._derived.best_grade_overall, why: `composite ${m._derived.composite_score.toFixed(1)} · ${m.one_line_verdict}`, elig: m._derived.eligibility })) },
      { key: 'H', title: 'Popular ingredients with weak or misleading claims', entries: MONOS.filter(m => ['H', 'E', 'G', 'D'].includes(m.category) && sortGrade(m._derived.best_grade_young_adults) <= 3).sort((a, b) => a._derived.composite_score - b._derived.composite_score).slice(0, 15).map((m, i) => ({ rank: i + 1, id: m.id, grade: m._derived.best_grade_overall, why: m.one_line_verdict, elig: m._derived.eligibility })) },
      { key: 'I', title: 'Ingredients with important safety concerns', entries: MONOS.filter(m => m._derived.safety_gate !== 'pass').sort((a, b) => (a._derived.safety_gate === 'fail' ? 0 : 1) - (b._derived.safety_gate === 'fail' ? 0 : 1) || a.scores.safety - b.scores.safety).map((m, i) => ({ rank: i + 1, id: m.id, grade: m._derived.best_grade_overall, why: `${m._derived.safety_gate}: ${(m.safety || {}).gate_reason || ''}`, elig: m._derived.eligibility })) },
    ];
  }
  function viewRankings() {
    const sy = SYN['rankings'];
    const renderList = (rk, computed) => `<div class="section"><h2>Ranking ${esc(rk.key)} — ${esc(rk.title)}</h2>${rk.method ? `<p class="small">${inline(rk.method)}</p>` : ''}<div class="ranking">${(rk.entries || []).map(e => `<div class="row"><div class="pos">${esc(e.rank)}</div><div><div>${monoLink(e.monograph_id || e.id)} ${e.score != null ? `<span class="mono small">score ${esc(e.score)}</span>` : ''} ${e.elig && e.elig !== 'eligible' ? `<span class="badge ${e.elig === 'ineligible' ? 'fail' : 'conditional'}">${esc(e.elig)}</span>` : ''}</div><div class="why">${inline(e.why || e.rationale || '')}${e.caveats ? ' <em>' + inline(e.caveats) + '</em>' : ''}</div></div><div>${grade(e.grade)}</div></div>`).join('') || '<p class="muted">No entries.</p>'}</div></div>`;
    let html = `<div class="page-head"><div><h1>Final ingredient rankings</h1><p class="lead">Separate rankings for separate questions. Scores: 30% evidence quality, 20% magnitude/relevance, 20% safety, 10% reproducibility, 10% food suitability, 10% cost/access. Safety and regulatory compliance are hard eligibility requirements. Nothing here is a single overall winner across fundamentally different outcomes.</p></div></div>`;
    if (sy) { html += synthesisStatus(sy) + (sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : '') + (sy.rankings || []).map(rk => renderList(rk)).join('') + (sy.scoring_notes ? `<div class="section prose"><h2>Scoring notes</h2>${md(sy.scoring_notes)}</div>` : '') + (sy.hard_gates_applied ? `<div class="section prose"><h2>Hard gates applied</h2>${structured(sy.hard_gates_applied)}</div>` : ''); }
    else html += `<div class="section">${pending('The committee-written ranking synthesis', 'research/syntheses/rankings.json')}</div>`;
    html += `<div class="section"><h2>Computed rankings (transparent, from the database)</h2><p class="small">Generated automatically from the graded evidence rows: best grade for the relevant domains, then composite score. ${sy ? 'Compare with the committee rankings above.' : 'These stand in until the committee synthesis is written.'}</p>${computedRankings().map(rk => renderList(rk, true)).join('')}</div>`;
    return html;
  }

  function viewCombinations() {
    return synthesisPage('X1-combinations', 'Ingredient combinations: direct trial evidence', sy => {
      const c = sy.combinations || [];
      if (!c.length) return '';
      const cls = { demonstrated_additive: 'pass', demonstrated_synergistic: 'pass', plausible_untested: 'unknown', no_proven_advantage: 'conditional', potentially_counterproductive: 'fail', safety_concern: 'fail' };
      return `<div class="section"><h2>Combination Evidence Matrix</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Combination</th><th>Classification</th><th>Grade</th><th>Direct trials</th><th>Summary</th><th>Interaction notes</th></tr></thead><tbody>${c.map(x => `<tr><td class="tight"><strong>${esc(x.combo)}</strong><br><small>${esc((x.components || []).join(' + '))}</small></td><td><span class="badge ${cls[x.classification] || 'neutral'}">${esc((x.classification || '').replace(/_/g, ' '))}</span></td><td>${grade(x.grade)}</td><td class="num">${(x.direct_trials || []).length}</td><td class="wrap">${inline(x.summary)}</td><td class="wrap small">${inline(x.interaction_notes)}</td></tr>`).join('')}</tbody></table></div></div>
      ${c.map(x => `<div class="section"><h3>${esc(x.combo)}</h3><p>${inline(x.rationale)}</p>${(x.direct_trials || []).length ? structured(x.direct_trials) : '<p class="muted">No direct combination trial found.</p>'}</div>`).join('')}`;
    });
  }
  function viewPopulations() {
    const sy = SYN['populations'], x2 = SYN['X2-sleep-deprivation-stress'];
    let html = `<div class="page-head"><div><h1>Populations</h1><p class="lead">Findings are reported separately for healthy young adults, students and knowledge workers, sleep-deprived adults, older adults, and people with deficiencies versus adequate status. Evidence from patients or children is never generalized to healthy adults.</p></div></div>`;
    if (sy) { html += synthesisStatus(sy) + (sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : '') + (sy.populations || []).map(p => `<div class="section prose"><h2>${esc(p.population)}</h2>${p.what_works ? '<h4>What has evidence</h4>' + md(p.what_works) : ''}${p.what_does_not ? '<h4>What does not</h4>' + md(p.what_does_not) : ''}${p.deficiency_notes ? '<h4>Deficiency notes</h4>' + md(p.deficiency_notes) : ''}${p.key_ingredients && p.key_ingredients.length ? '<h4>Key ingredients</h4>' + structured(p.key_ingredients.map(k => Object.assign({ ingredient: byId[k.monograph_id] ? byId[k.monograph_id].name : k.monograph_id }, k))) : ''}${p.cautions ? '<h4>Cautions</h4>' + md(p.cautions) : ''}</div>`).join('') + (sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join(''); }
    else html += `<div class="section">${pending('The population synthesis', 'research/syntheses/populations.json')}</div>`;
    const pops = [...new Set(ROWS.map(r => r.population))];
    html += `<div class="section"><h2>Evidence rows by population (from the database)</h2>${evidenceTable('pop-rows', ROWS)}</div>`;
    if (x2) html += `<div class="section"><h1 style="font-size:1.5rem">Under sleep deprivation, acute stress and prolonged load</h1>${synthesisStatus(x2)}${x2.summary ? `<div class="card prose">${md(x2.summary)}</div>` : ''}${(x2.contexts || []).map(c => `<div class="section"><h2>${esc((c.context || '').replace(/_/g, ' '))}</h2><div class="prose">${md(c.description)}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Intervention</th><th>Dose</th><th>Timing</th><th>Findings</th><th>Grade</th><th>Direction</th><th>Studies</th></tr></thead><tbody>${(c.interventions || []).map(i => `<tr><td class="tight"><strong>${esc(i.ingredient)}</strong></td><td class="wrap">${esc(i.dose)}</td><td class="wrap">${esc(i.timing)}</td><td class="wrap">${inline(i.findings)}</td><td>${grade(i.grade)}</td><td>${dir(i.direction)}</td><td class="small">${esc((i.study_ids || []).join(', '))}</td></tr>`).join('')}</tbody></table></div>${c.non_nutritional_benchmarks ? `<p class="small"><strong>Non-nutritional benchmarks:</strong> ${inline(c.non_nutritional_benchmarks)}</p>` : ''}</div>`).join('')}${(x2.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('')}${sourcesList(x2.sources)}</div>`;
    else html += `<div class="section">${pending('The sleep-deprivation and stress unit', 'research/syntheses/X2-sleep-deprivation-stress.json')}</div>`;
    return html;
  }
  function viewMyths() {
    const sy = SYN['myths'];
    let html = `<div class="page-head"><div><h1>Contradictory evidence and scientific myths</h1><p class="lead">What is promoted commercially versus what controlled human studies show.</p></div></div>`;
    if (sy) { const vc = { myth: 'fail', overstated: 'conditional', partly_true: 'conditional', supported: 'pass' }; html += synthesisStatus(sy) + (sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : '') + (sy.myths && sy.myths.length ? `<div class="section">${sy.myths.map(x => `<div class="card" style="margin:.6rem 0"><div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center"><span class="badge ${vc[x.verdict] || 'neutral'}">${esc((x.verdict || '').replace(/_/g, ' '))}</span><strong>${esc(x.claim)}</strong></div>${x.who_promotes ? `<p class="small">Promoted by: ${inline(x.who_promotes)}</p>` : ''}<div class="prose">${md(x.what_evidence_shows)}</div>${(x.monograph_ids || []).length ? `<p class="small">See: ${x.monograph_ids.map(monoLink).join(', ')}</p>` : ''}</div>`).join('')}</div>` : '') + (sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('') + sourcesList(sy.sources); }
    else html += `<div class="section">${pending('The myths synthesis', 'research/syntheses/myths.json')}</div>`;
    html += `<div class="section"><h2>Marketing vs evidence, ingredient by ingredient</h2><p class="small">Taken directly from each monograph.</p>${MONOS.filter(m => m.marketing_vs_evidence).map(m => `<details class="study"><summary><span class="t">${esc(m.name)}</span>${grade(m._derived.best_grade_young_adults)}<span class="small">best grade, young adults</span></summary><div class="body prose">${md(m.marketing_vs_evidence)}</div></details>`).join('')}</div>`;
    return html;
  }
  function viewSafety() {
    const sy = SYN['safety-review'];
    let html = `<div class="page-head"><div><h1>Safety and interaction review</h1><p class="lead">Adverse effects, excessive intake, drug interactions, sleep disruption, vulnerable groups and the hard safety gate for every ingredient. Natural is not safe.</p></div></div>`;
    if (sy) { const sev = { critical: 'fail', major: 'fail', moderate: 'conditional', minor: 'neutral' }; html += synthesisStatus(sy) + (sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : '') + (sy.ingredient_flags && sy.ingredient_flags.length ? `<div class="section"><h2>Flagged ingredients</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ingredient</th><th>Severity</th><th>Concern</th><th>Populations at risk</th><th>Interactions</th><th>Upper limit</th><th>Recommendation</th></tr></thead><tbody>${sy.ingredient_flags.map(f => `<tr><td class="tight">${monoLink(f.monograph_id) || esc(f.name)}</td><td><span class="badge ${sev[f.severity] || 'neutral'}">${esc(f.severity)}</span></td><td class="wrap">${inline(f.concern)}</td><td class="wrap">${inline(f.populations_at_risk)}</td><td class="wrap">${inline(f.interactions)}</td><td class="wrap">${inline(f.upper_limit)}</td><td class="wrap">${inline(f.recommendation)}</td></tr>`).join('')}</tbody></table></div></div>` : '') + (sy.vulnerable_groups ? `<div class="section"><h2>Vulnerable groups</h2>${structured(sy.vulnerable_groups)}</div>` : '') + (sy.stimulant_stacking ? `<div class="section prose"><h2>Stimulant stacking</h2>${md(sy.stimulant_stacking)}</div>` : '') + (sy.sleep ? `<div class="section prose"><h2>Sleep</h2>${md(sy.sleep)}</div>` : '') + (sy.specialist_review_required ? `<div class="section"><h2>Specialist review required</h2>${structured(sy.specialist_review_required)}</div>` : '') + (sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('') + sourcesList(sy.sources); }
    else html += `<div class="section">${pending('The committee safety review', 'research/syntheses/safety-review.json')}</div>`;
    html += `<div class="section"><h2>Safety gate table (from the monographs)</h2>${dataTable({ id: 'safety-tbl', rows: MONOS, defaultSort: 'gate', defaultDir: 'asc', pageSize: 500, columns: [
      { key: 'name', label: 'Ingredient', sort: r => r.name.toLowerCase(), render: r => `<a href="#ingredient.${esc(r.id)}">${esc(r.name)}</a>`, cls: 'tight' },
      { key: 'gate', label: 'Safety gate', sort: r => ({ fail: 0, conditional: 1, pass: 2 })[r._derived.safety_gate] ?? 3, render: r => gate(r._derived.safety_gate) },
      { key: 'reason', label: 'Gate reason', sort: false, render: r => inline((r.safety || {}).gate_reason), cls: 'wrap' },
      { key: 'daily', label: 'Daily use', sort: r => (r.safety || {}).daily_use_appropriate, render: r => esc((r.safety || {}).daily_use_appropriate) },
      { key: 'sleep', label: 'Sleep impact', sort: false, render: r => inline((r.safety || {}).sleep_impact), cls: 'wrap' },
      { key: 'ul', label: 'Upper limits', sort: false, render: r => inline((r.safety || {}).upper_limits), cls: 'wrap' },
      { key: 'ix', label: 'Interactions', sort: r => ((r.safety || {}).drug_interactions || []).length, render: r => esc(((r.safety || {}).drug_interactions || []).join('; ')), cls: 'wrap' },
      { key: 'spec', label: 'Specialist review', sort: false, render: r => esc(((r.safety || {}).specialist_review_needed || []).join(', ')), cls: 'wrap' },
    ], filters: [{ key: 'gate', label: 'Gate', options: [['fail', 'fail'], ['conditional', 'conditional'], ['pass', 'pass']], match: (r, v) => r._derived.safety_gate === v }, { key: 'cat', label: 'Category', options: CAT_OPTS, match: (r, v) => r.category === v }], search: (r, q) => r.name.toLowerCase().includes(q) })}</div>`;
    return html;
  }
  function regBlock(id, title) {
    const sy = SYN[id];
    if (!sy) return `<div class="section"><h2>${esc(title)}</h2>${pending(title, 'research/syntheses/' + id + '.json')}</div>`;
    const known = ['authorities', 'frameworks', 'authorised_claims_relevant_to_cognition', 'rejected_or_on_hold_claims', 'caffeine_rules', 'novel_food_notes', 'novel_ingredient_rules', 'supplement_rules', 'fortification_rules', 'labelling_requirements', 'claims_risk_table', 'open_questions', 'enforcement_examples', 'claims_rules'];
    let html = `<div class="section"><h2>${esc(sy.title || title)}</h2>${synthesisStatus(sy)}${sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : ''}`;
    known.forEach(k => { if (sy[k] != null && (!Array.isArray(sy[k]) || sy[k].length)) html += `<h3>${esc(k.replace(/_/g, ' '))}</h3>${structured(sy[k])}`; });
    (sy.sections || []).forEach(s => { html += `<div class="prose"><h3>${esc(s.heading)}</h3>${md(s.body)}</div>`; });
    (sy.tables || []).forEach(t => { html += `<h3>${esc(t.name)}</h3>${structured((t.rows || []).map(r => Array.isArray(r) ? Object.fromEntries((t.columns || []).map((c, i) => [c, r[i]])) : r))}`; });
    Object.keys(sy).filter(k => !known.includes(k) && !['id', 'title', 'summary', 'sections', 'tables', 'sources', 'search_log', 'coverage_notes', '_status', '_critique'].includes(k)).forEach(k => { html += `<h3>${esc(k.replace(/_/g, ' '))}</h3>${structured(sy[k])}`; });
    if (sy.coverage_notes) html += `<div class="prose"><h3>Coverage notes</h3>${md(sy.coverage_notes)}</div>`;
    html += sourcesList(sy.sources) + (sy._critique ? critiqueBlock(sy._critique) : '') + '</div>';
    return html;
  }
  function viewRegulatory() {
    const cs = SYN['claims-strategy'];
    let html = `<div class="page-head"><div><h1>Regulatory and claims strategy</h1><p class="lead">Scientific evidence of an effect is not legal permission to advertise it. Rules for Morocco, the European Union and the United States, and a claims-risk table for the claims Brain Food might want to make. Market-specific items must be checked by a regulatory specialist before launch.</p></div></div>
    <div class="tabs" id="regtabs"><button data-tab="reg-ma" class="active">Morocco</button><button data-tab="reg-eu">European Union</button><button data-tab="reg-us">United States</button><button data-tab="reg-claims">Claims strategy</button></div>`;
    html += `<div id="reg-ma" class="tabpane">${regBlock('X6-regulatory-morocco', 'Morocco')}</div><div id="reg-eu" class="tabpane" hidden>${regBlock('X4-regulatory-eu', 'European Union')}</div><div id="reg-us" class="tabpane" hidden>${regBlock('X5-regulatory-us', 'United States')}</div>`;
    html += `<div id="reg-claims" class="tabpane" hidden>${cs ? synthesisStatus(cs) + (cs.summary ? `<div class="card prose">${md(cs.summary)}</div>` : '') + (cs.claims_risk_table ? `<div class="section"><h2>Claims-risk table</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Proposed claim</th><th>Evidence available</th><th>Regulatory concern</th><th>Safer alternative</th></tr></thead><tbody>${cs.claims_risk_table.map(c => `<tr><td class="wrap"><strong>${esc(c.proposed_claim)}</strong></td><td class="wrap">${inline(c.evidence_available)}</td><td class="wrap">${typeof c.regulatory_concern === 'object' ? structured(c.regulatory_concern, 1) : inline(c.regulatory_concern)}</td><td class="wrap">${inline(c.safer_alternative)}</td></tr>`).join('')}</tbody></table></div></div>` : '') + ['recommended_claim_language', 'prohibited', 'market_comparison'].map(k => cs[k] ? `<div class="section"><h2>${esc(k.replace(/_/g, ' '))}</h2>${structured(cs[k])}</div>` : '').join('') + (cs.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('') + sourcesList(cs.sources) : pending('The merged claims strategy (Part XI)', 'research/syntheses/claims-strategy.json')}</div>`;
    return html;
  }
  function brandsBlock(id, title) {
    return synthesisPage(id, title, sy => {
      const b = sy.brands || []; if (!b.length) return '';
      return `<div class="section"><h2>Brands examined (${b.length})</h2>${b.map(x => `<details class="study"><summary><span class="t">${esc(x.name)}</span><span class="pill">${esc(x.category || '')}</span><span class="small">${esc(x.country || '')}</span>${x.mechanistic_language_without_human_support ? '<span class="badge conditional">mechanistic language without human support</span>' : ''}${(x.finished_product_trials || []).length ? `<span class="badge pass">${x.finished_product_trials.length} finished-product trial(s)</span>` : '<span class="badge neutral">no finished-product trial found</span>'}</summary><div class="body"><dl class="kv"><dt>Products</dt><dd>${esc((x.products || []).join('; '))}</dd><dt>Key ingredients</dt><dd>${esc((x.key_ingredients || []).join(', '))}</dd><dt>Claims quoted</dt><dd>${fmtList(x.claims_quoted)}</dd><dt>Evidence transparency</dt><dd>${inline(x.evidence_transparency)}</dd>${(x.finished_product_trials || []).length ? `<dt>Finished-product trials</dt><dd>${structured(x.finished_product_trials)}</dd>` : ''}<dt>Legal / regulatory actions</dt><dd>${inline(x.regulatory_or_legal_actions || '—')}</dd><dt>Price points</dt><dd>${inline(x.price_points || '—')}</dd><dt>Strengths</dt><dd>${typeof x.strengths === 'string' ? inline(x.strengths) : fmtList(x.strengths)}</dd><dt>Weaknesses</dt><dd>${typeof x.weaknesses === 'string' ? inline(x.weaknesses) : fmtList(x.weaknesses)}</dd>${x.sources ? `<dt>Sources</dt><dd>${structured(x.sources, 1)}</dd>` : ''}</dl></div></details>`).join('')}</div>${['patterns', 'opportunities_for_brain_food', 'what_credible_science_communication_looks_like'].map(k => sy[k] ? `<div class="section prose"><h2>${esc(k.replace(/_/g, ' '))}</h2>${structured(sy[k])}</div>` : '').join('')}`;
    });
  }
  function viewCompetitors() {
    return `<div class="page-head"><div><h1>Scientific competitive analysis</h1><p class="lead">Ingredient strategies, formats, claims and evidence transparency of brain-positioned supplements, drinks and foods. Research findings are separated from marketing claims.</p></div></div><div class="tabs" id="comptabs"><button data-tab="comp-a" class="active">Supplements & drinks</button><button data-tab="comp-b">Foods, snacks & meals</button></div><div id="comp-a" class="tabpane">${brandsBlock('X7a-competitors-supplements', 'Nootropic supplements, brain drinks and functional beverages')}</div><div id="comp-b" class="tabpane" hidden>${brandsBlock('X7b-competitors-functional-foods', 'Brain-positioned functional foods, snacks, bars and meals')}</div>`;
  }
  function viewProducts() {
    const sy = SYN['product-concepts'];
    let html = `<div class="page-head"><div><h1>Product development opportunities</h1><p class="lead">Five product families, each with concept sheets built only from ingredients that pass the evidence, safety and regulatory gates. Study exposures are not consumer doses; costs and prices are ranges grounded in sourced data or marked as unknown.</p></div></div>`;
    if (!sy) return html + `<div class="section">${pending('Product concept sheets (Part X)', 'research/syntheses/product-concepts.json')}</div>`;
    html += synthesisStatus(sy) + (sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : '');
    const F = ['product_name', 'target_consumer', 'intended_use', 'classification', 'research_backed_benefit', 'key_ingredients', 'scientific_rationale', 'evidence_certainty', 'safety_considerations', 'proposed_format', 'taste_challenges', 'shelf_life_challenges', 'manufacturing_feasibility', 'estimated_ingredient_cost', 'possible_consumer_price', 'competitive_differentiation', 'permitted_claims_now', 'claims_requiring_validation', 'recommended_next_step'];
    (sy.families || []).forEach(fam => {
      html += `<div class="section"><h2>Family ${esc(fam.family)} — ${esc(fam.title)}</h2><div class="prose">${md(fam.target)}${md(fam.rationale)}</div>${(fam.concepts || []).map(c => `<div class="card" style="margin:.8rem 0"><h3>${esc(c.product_name)}</h3><dl class="kv">${F.filter(k => k !== 'product_name' && c[k] != null).map(k => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${k === 'key_ingredients' && Array.isArray(c[k]) ? structured(c[k].map(x => typeof x === 'object' ? Object.assign({}, x, { ingredient: x.monograph_id && byId[x.monograph_id] ? `<a href="#ingredient.${x.monograph_id}">${byId[x.monograph_id].name}</a>` : x.ingredient }) : x), 1) : (typeof c[k] === 'string' ? md(c[k]) : structured(c[k], 1))}</dd>`).join('')}${Object.keys(c).filter(k => !F.includes(k)).map(k => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${structured(c[k], 1)}</dd>`).join('')}</dl></div>`).join('')}</div>`;
    });
    if (sy.ineligible_ideas_rejected) html += `<div class="section"><h2>Ideas rejected and why</h2>${structured(sy.ineligible_ideas_rejected)}</div>`;
    html += (sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('') + sourcesList(sy.sources);
    return html;
  }
  function viewValidation() {
    return synthesisPage('clinical-roadmap', 'Proposed clinical validation roadmap', sy => {
      const st = sy.studies || []; if (!st.length) return '';
      return `<div class="section"><h2>Proposed studies (${st.length})</h2>${st.map(s => `<details class="study"><summary><span class="badge neutral">${esc(s.id)}</span><span class="t">${esc(s.title)}</span><span class="pill">${esc(s.design)}</span><span class="small">${esc(s.duration || '')}</span></summary><div class="body"><dl class="kv">${Object.keys(s).filter(k => !['id', 'title'].includes(k)).map(k => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${typeof s[k] === 'string' ? md(s[k]) : structured(s[k], 1)}</dd>`).join('')}</dl></div></details>`).join('')}</div>${sy.sequencing ? `<div class="section prose"><h2>Sequencing</h2>${md(sy.sequencing)}</div>` : ''}${sy.governance ? `<div class="section prose"><h2>Governance and ethics</h2>${md(sy.governance)}</div>` : ''}`;
    });
  }
  function viewBrand() { return synthesisPage('brand-positioning', 'Brand scientific positioning', sy => ['principles', 'messaging_examples', 'transparency_commitments'].map(k => sy[k] ? `<div class="section"><h2>${esc(k.replace(/_/g, ' '))}</h2>${structured(sy[k])}</div>` : '').join('')); }
  function viewFoundations() { return synthesisPage('X8-foundations', 'Nutritional neuroscience foundations', sy => sy.glossary && sy.glossary.length ? `<div class="section"><h2>Glossary</h2><dl class="kv">${sy.glossary.map(g => `<dt>${esc(g.term)}</dt><dd>${inline(g.definition)}</dd>`).join('')}</dl></div>` : ''); }
  function viewInstruments() {
    return synthesisPage('X3-cognitive-test-instruments', 'Validated cognitive testing instruments', sy => {
      const ins = sy.instruments || []; let html = '';
      if (ins.length) html += `<div class="section"><h2>Instruments (${ins.length})</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Instrument</th><th>Domains</th><th>Description</th><th>Min</th><th>Sensitivity to nutrition interventions</th><th>Validation</th><th>Use</th><th>Licensing</th></tr></thead><tbody>${ins.map(i => `<tr><td class="tight"><strong>${esc(i.name)}</strong></td><td class="wrap">${esc((i.domains || []).join(', '))}</td><td class="wrap">${inline(i.description)}</td><td class="num">${esc(i.typical_duration_min)}</td><td class="wrap">${inline(i.sensitivity_to_nutrition_interventions)}</td><td class="wrap">${inline(i.validation_notes)}</td><td class="wrap">${esc(i.suitable_for)}<br><small>${esc(i.populations || '')}</small></td><td>${esc(i.licensing)}</td></tr>`).join('')}</tbody></table></div></div>`;
      if (sy.recommended_batteries) html += `<div class="section"><h2>Recommended batteries</h2>${structured(sy.recommended_batteries)}</div>`;
      return html;
    });
  }
  function viewCosts() {
    return synthesisPage('X9-ingredient-costs', 'Ingredient cost and availability evidence', sy => {
      const it = sy.items || []; if (!it.length) return '';
      return `<div class="section"><h2>Ingredient cost ranges (sourced)</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ingredient</th><th>Form / grade</th><th>Price range per kg</th><th>Basis</th><th>Effective dose</th><th>Cost per dose</th><th>Availability</th><th>Confidence</th><th>Sources</th></tr></thead><tbody>${it.map(x => `<tr><td class="tight"><strong>${esc(x.ingredient)}</strong></td><td class="wrap">${esc(x.form_grade)}</td><td class="nowrap mono">${esc(x.price_low)}–${esc(x.price_high)} ${esc(x.currency)}</td><td class="wrap small">${esc(x.basis)}</td><td class="wrap">${esc(x.typical_effective_dose)}</td><td class="nowrap mono">${esc(x.cost_per_dose_low)}–${esc(x.cost_per_dose_high)} ${esc(x.currency)}</td><td class="wrap small">${inline(x.availability_notes)}</td><td><span class="badge ${x.confidence === 'high' ? 'pass' : x.confidence === 'medium' ? 'conditional' : 'unknown'}">${esc(x.confidence)}</span></td><td class="small">${(x.sources || []).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.vendor || 'source')}</a>`).join(', ')}</td></tr>`).join('')}</tbody></table></div></div>`;
    });
  }
  function viewMethodology() {
    const sy = SYN['methodology'];
    const q = META.search_queries || [];
    const tags = [...new Set(q.map(x => x.tag))].sort();
    let html = `<div class="page-head"><div><h1>Methodology</h1><p class="lead">Databases, dates, search strings, eligibility criteria, screening and verification process, and the limits of what was covered. The search log below is the actual record of every query run by the research agents.</p></div></div>`;
    html += `<div class="tiles"><div class="tile"><div class="n">${q.length}</div><div class="l">queries logged</div></div>${Object.entries(META.search_queries_by_database || {}).map(([k, v]) => `<div class="tile"><div class="n">${v}</div><div class="l">${esc(k)} queries</div></div>`).join('')}<div class="tile"><div class="n">${META.search_date_range ? esc(META.search_date_range[0]) : '—'}</div><div class="l">to ${META.search_date_range ? esc(META.search_date_range[1]) : '—'}</div></div>${META.verification_totals ? `<div class="tile"><div class="n">${META.verification_totals.verified}/${META.verification_totals.studies}</div><div class="l">study records verified in the independent batch check (${META.verification_totals.title_mismatch} mismatches, ${META.verification_totals.not_found} not found, ${META.verification_totals.unverifiable} unverifiable)</div></div>` : ''}</div>`;
    if (sy) html += synthesisStatus(sy) + (sy.summary ? `<div class="card prose">${md(sy.summary)}</div>` : '') + (sy.sections || []).map(s => `<div class="section prose"><h2>${esc(s.heading)}</h2>${md(s.body)}</div>`).join('') + (sy.tables || []).map(t => `<div class="section"><h2>${esc(t.name)}</h2>${structured((t.rows || []).map(r => Array.isArray(r) ? Object.fromEntries((t.columns || []).map((c, i) => [c, r[i]])) : r))}</div>`).join('');
    else html += `<div class="section prose"><h2>Protocol (standing)</h2><p><strong>Sources.</strong> PubMed/MEDLINE through the NCBI E-utilities (title/abstract/MeSH indexing), Europe PMC (citation counts, open-access full text), Crossref (DOI records), ClinicalTrials.gov v2 (registered and unpublished trials), plus EFSA, FDA/FTC, EMA, NIH ODS, WHO, Cochrane and official Moroccan sources through web search and retrieval. Embase, Scopus and Web of Science were not accessible.</p><p><strong>Eligibility.</strong> Human studies prioritised in this order: systematic reviews/meta-analyses of RCTs, RCTs, controlled crossover trials, prospective cohorts, other observational studies, human mechanistic work; animal and in-vitro evidence only for plausibility. Null, negative and safety studies were searched for explicitly.</p><p><strong>Verification.</strong> Every study was checked by the author agent (lit.py verify), audited again by an independent reviewer agent, then batch-checked by script against PubMed/Crossref title records. Unverified items remain listed but excluded from grading.</p><p><strong>Grading.</strong> A–E per outcome × population × timeframe using GRADE logic (risk of bias, inconsistency, indirectness, imprecision, publication bias).</p>${pending('The written methodology section (Part II)', 'research/syntheses/methodology.json')}</div>`;
    html += `<div class="section"><h2>Search log</h2>${dataTable({ id: 'qlog', rows: q, defaultSort: 'ts', defaultDir: 'asc', pageSize: 100, columns: [
      { key: 'tag', label: 'Unit', sort: r => r.tag, render: r => esc(r.tag), cls: 'tight' }, { key: 'database', label: 'Database', sort: r => r.database, render: r => esc(r.database) },
      { key: 'query', label: 'Query', sort: false, render: r => `<span class="mono small">${esc(r.query)}</span>`, cls: 'wrap' }, { key: 'ts', label: 'Time (UTC)', sort: r => r.ts, render: r => esc((r.ts || '').replace('T', ' ').slice(0, 16)) },
      { key: 'hits', label: 'Hits', sort: r => +r.hits, render: r => esc(r.hits), cls: 'num' }, { key: 'returned', label: 'Screened', sort: r => +r.returned, render: r => esc(r.returned), cls: 'num' },
    ], filters: [{ key: 'tag', label: 'Unit', options: tags.map(t => [t, t]), match: (r, v) => r.tag === v }, { key: 'db', label: 'Database', options: Object.keys(META.search_queries_by_database || {}).map(k => [k, k]), match: (r, v) => r.database === v }], search: (r, q2) => (r.query || '').toLowerCase().includes(q2) })}</div>`;
    return html;
  }
  function viewBibliography() {
    const cited = [...new Set(BIB.flatMap(b => b.cited_in.map(c => c.id)))].map(id => [id, byId[id] ? byId[id].name : id]).sort((a, b) => a[1].localeCompare(b[1]));
    return `<div class="page-head"><div><h1>Bibliography</h1><p class="lead">Every reference cited anywhere in the atlas, de-duplicated, with links and verification status. Verified means the identifier resolved to a record whose title matches the citation.</p></div></div>
    ${dataTable({ id: 'bib', rows: BIB, defaultSort: 'year', pageSize: 200, columns: [
      { key: 'title', label: 'Reference', sort: r => (r.title || '').toLowerCase(), render: r => `<strong>${esc(r.title)}</strong><br><small>${esc(r.authors || '')} · ${esc(r.journal || '')}</small>`, cls: 'wrap' },
      { key: 'year', label: 'Year', sort: r => String(r.year || ''), render: r => esc(r.year) },
      { key: 'design', label: 'Design / type', sort: r => r.design, render: r => esc(r.design), cls: 'wrap' },
      { key: 'links', label: 'Links', sort: false, render: r => [pmLink(r), doiLink(r), pmcLink(r), r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">url</a>` : ''].filter(Boolean).join(' · '), cls: 'tight' },
      { key: 'ver', label: 'Verified', sort: r => r.verification, render: r => verifBadge({ verification: { status: r.verification } }) },
      { key: 'cited', label: 'Cited in', sort: r => r.cited_in.length, render: r => r.cited_in.map(c => byId[c.id] ? `<a href="#ingredient.${esc(c.id)}">${esc(c.name)}</a>` : esc(c.name)).join(', '), cls: 'wrap' },
    ], filters: [{ key: 'ver', label: 'Verification', options: [['verified', 'verified'], ['agent_verified', 'agent verified'], ['title_mismatch', 'title mismatch'], ['not_found', 'not found'], ['unverified', 'unverified'], ['unverifiable', 'unverifiable']], match: (r, v) => r.verification === v }, { key: 'cited', label: 'Cited in', options: cited, match: (r, v) => r.cited_in.some(c => c.id === v) }], search: (r, q) => ((r.title || '') + ' ' + (r.authors || '') + ' ' + (r.journal || '')).toLowerCase().includes(q) })}`;
  }
  function viewDecisions() { return synthesisPage('decision-framework', 'Final decision framework', sy => (sy.questions || []).length ? `<div class="section">${sy.questions.map(q => `<div class="card prose" style="margin:.7rem 0"><div class="eyebrow">Question ${esc(q.n)}</div><h3>${esc(q.question)}</h3>${md(q.answer)}${(q.key_ingredients || []).length ? `<p class="small">Ingredients: ${q.key_ingredients.map(monoLink).join(', ')}</p>` : ''}</div>`).join('')}</div>` : ''); }
  function viewSummary() { return synthesisPage('executive-summary', 'Executive scientific summary', sy => ['key_conclusions', 'major_uncertainties', 'safety_findings', 'top_opportunities'].map(k => sy[k] ? `<div class="section prose"><h2>${esc(k.replace(/_/g, ' '))}</h2>${structured(sy[k])}</div>` : '').join('')); }
  // full-text search across monographs, studies, cross-cutting documents and the bibliography
  let SEARCH_INDEX = null;
  function buildIndex() {
    const docs = [];
    MONOS.forEach(m => {
      docs.push({ kind: 'Ingredient', title: m.name, href: '#ingredient.' + m.id, weight: 3, head: (m.name + ' ' + (m.aliases || []).join(' ')).toLowerCase(),
        text: [m.one_line_verdict, m.scientific_conclusion, m.deficiency_vs_enhancement, m.marketing_vs_evidence, (m.food_sources || []).join(' '), (m.safety || {}).summary, (m.regulatory || {}).eu, (m.regulatory || {}).morocco].join(' \n ') });
      (m.studies || []).forEach(s => docs.push({ kind: 'Study', title: s.title, href: '#ingredient.' + m.id, sub: `${s.authors ? s.authors.split(',')[0] : ''} ${s.year || ''} · cited in ${m.name}`, weight: 1, head: (s.title || '').toLowerCase(), text: [s.results, s.population, s.intervention].join(' ') }));
    });
    const SYN_ROUTE = { 'X1-combinations': 'combinations', 'X2-sleep-deprivation-stress': 'populations', 'X3-cognitive-test-instruments': 'instruments', 'X4-regulatory-eu': 'regulatory', 'X5-regulatory-us': 'regulatory', 'X6-regulatory-morocco': 'regulatory', 'X7a-competitors-supplements': 'competitors', 'X7b-competitors-functional-foods': 'competitors', 'X8-foundations': 'foundations', 'X9-ingredient-costs': 'costs' };
    Object.entries(SYN).forEach(([id, sy]) => {
      const href = '#' + (SYN_ROUTE[id] || id);
      (sy.sections || []).forEach(sec => docs.push({ kind: 'Document', title: `${sy.title || id}: ${sec.heading || ''}`, href, weight: 2, head: (sec.heading || '').toLowerCase(), text: sec.body || '' }));
      if (sy.summary) docs.push({ kind: 'Document', title: sy.title || id, href, weight: 2, head: (sy.title || '').toLowerCase(), text: sy.summary });
    });
    docs.forEach(d => { d.low = (d.text || '').toLowerCase(); });
    return docs;
  }
  function viewSearch(q) {
    return `<div class="search-page"><label class="db-search">${icon('search')}<span class="sr">Search all text</span><input type="search" id="search-q" value="${esc(q || '')}" placeholder="Search all text, then press Enter" autocomplete="off"></label>${searchResults(q)}</div>`;
  }
  function searchResults(q) {
    if (!SEARCH_INDEX) SEARCH_INDEX = buildIndex();
    const terms = (q || '').toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (!terms.length) return '<div class="page-head"><div><h1>Search</h1><p class="lead">Type at least two letters, then press Enter.</p></div></div>';
    const hits = [];
    SEARCH_INDEX.forEach(d => {
      let score = 0;
      for (const t of terms) {
        const inHead = d.head.includes(t), inText = d.low.includes(t);
        if (!inHead && !inText) { score = 0; break; }
        score += (inHead ? 5 : 0) + (inText ? 1 : 0);
      }
      if (score) hits.push({ d, score: score * d.weight });
    });
    hits.sort((a, b) => b.score - a.score);
    const snippet = d => { const i = d.low.indexOf(terms[0]); if (i < 0) return ''; const s = Math.max(0, i - 90); let t = d.text.slice(s, i + 160).replace(/\s+/g, ' '); terms.forEach(w => { t = esc(t).replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return (s ? '… ' : '') + t + ' …'; };
    const groups = ['Ingredient', 'Document', 'Study'];
    return `<div class="page-head"><div><h1>Search: “${esc(q)}”</h1><p class="lead">${hits.length} result${hits.length === 1 ? '' : 's'} across ingredient monographs, cross-cutting documents and cited studies.</p></div></div>` +
      (hits.length ? groups.map(g => { const gh = hits.filter(h => h.d.kind === g).slice(0, g === 'Study' ? 40 : 25); return gh.length ? `<div class="section"><h2>${g === 'Study' ? 'Studies' : g === 'Document' ? 'Documents' : 'Ingredients'} (${hits.filter(h => h.d.kind === g).length})</h2>${gh.map(h => `<div class="search-hit"><a href="${esc(h.d.href)}"><strong>${esc(h.d.title)}</strong></a>${h.d.sub ? ` <span class="small">${esc(h.d.sub)}</span>` : ''}<br><span class="small">${snippet(h.d)}</span></div>`).join('')}</div>` : ''; }).join('') : '<p class="muted">Nothing matches every word. Try fewer or different words.</p>');
  }

  // ---------- claims library ----------
  function viewClaims() {
    const rows = [];
    MONOS.forEach(m => ((m.regulatory || {}).permitted_claims_examples || []).forEach(c => rows.push({ m, claim: typeof c === 'string' ? c : JSON.stringify(c) })));
    const eu = (SYN['X4-regulatory-eu'] || {}).authorised_claims_relevant_to_cognition;
    const rej = (SYN['X4-regulatory-eu'] || {}).rejected_or_on_hold_claims;
    const cs = SYN['claims-strategy'];
    return `<div class="page-head"><div><h1>Claims library</h1><p class="lead">Every claim the research found to be actually authorised, next to the claims that were refused or are on hold. Evidence of an effect is not permission to claim it: use only authorised wording, with its conditions of use, and have a regulatory specialist confirm it for each market.</p></div></div>
    ${eu ? `<div class="section"><h2>EU claims relevant to cognition and the nervous system</h2>${structured(eu)}</div>` : ''}
    <div class="section"><h2>Authorised claims recorded in the ingredient monographs (${rows.length})</h2>${dataTable({ id: 'claims', rows, defaultSort: 'ing', defaultDir: 'asc', pageSize: 400, columns: [
      { key: 'ing', label: 'Ingredient', sort: r => r.m.name.toLowerCase(), render: r => `<a href="#ingredient.${esc(r.m.id)}">${esc(r.m.name)}</a>`, cls: 'tight' },
      { key: 'claim', label: 'Claim and conditions (as recorded)', sort: false, render: r => inline(r.claim), cls: 'wrap' },
      { key: 'reg', label: 'Regulatory gate', sort: r => r.m._derived.regulatory_gate, render: r => gate(r.m._derived.regulatory_gate) },
      { key: 'saf', label: 'Safety gate', sort: r => r.m._derived.safety_gate, render: r => gate(r.m._derived.safety_gate) },
    ], filters: [{ key: 'cat', label: 'Category', options: CAT_OPTS, match: (r, v) => r.m.category === v }], search: (r, q) => (r.m.name + ' ' + r.claim).toLowerCase().includes(q) })}</div>
    ${rej ? `<div class="section"><h2>Refused or on-hold claims (EU)</h2>${structured(rej)}</div>` : ''}
    ${cs && cs.claims_risk_table ? `<div class="section"><h2>Claims-risk table</h2>${structured(cs.claims_risk_table)}</div>` : '<p class="small">The full claims-risk table for proposed Brain Food claims is on the <a href="#regulatory">Regulatory &amp; claims</a> page.</p>'}`;
  }

  // ---------- theme (system / light / dark; per-viewer preference only) ----------
  const THEMES = ['system', 'light', 'dark'];
  const THEME_LABEL = { system: 'Match system', light: 'Light', dark: 'Dark' };
  function getTheme() { try { return localStorage.getItem('bf-theme') || 'system'; } catch (e) { return 'system'; } }
  function applyTheme(t) { const r = document.documentElement; if (!r) return; if (t === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t); }
  applyTheme(getTheme());

  // ---------- background data: first paint uses the slim monographs; the rest arrives just after ----------
  const VER = (() => { try { const c = document.currentScript; return (c && c.src && c.src.split('?')[1]) || ''; } catch (e) { return ''; } })();
  const LAZY = { details: ['details.js', 'monograph_details'], syn: ['syntheses.js', 'syntheses'], bib: ['bibliography.js', 'bibliography'] };
  const READY = {}, PENDING = {};
  function absorb(k) {
    if (k === 'details') { const x = D.monograph_details || {}; MONOS.forEach(m => Object.assign(m, x[m.id] || {})); }
    else if (k === 'syn') Object.assign(SYN, D.syntheses || {});
    else if (k === 'bib') BIB.push(...(D.bibliography || []));
    READY[k] = true; SEARCH_INDEX = null;
  }
  Object.keys(LAZY).forEach(k => { if (D[LAZY[k][1]]) absorb(k); });  // already present (smoke test, single-file copies)
  function loadLazy(k) {
    if (READY[k]) return Promise.resolve();
    if (!PENDING[k]) PENDING[k] = new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'data/' + LAZY[k][0] + (VER ? '?' + VER : '');
      sc.onload = () => { absorb(k); res(); };
      sc.onerror = () => { PENDING[k] = null; sc.remove(); rej(new Error('could not load ' + k)); };
      document.body.appendChild(sc);
    });
    return PENDING[k];
  }
  // what a view cannot render without; and which views re-render to add late detail
  const NEEDS = v => v === 'search' ? ['details', 'syn', 'bib'] : v === 'bibliography' ? ['bib'] : LIB_OF[v] && v !== 'compare' && v !== 'matrix' ? ['syn'] : [];
  const REFRESH = { details: ['ingredient'], syn: ['home'] };
  const loadingHtml = what => `<div class="loading-view" role="status"><span class="spinner" aria-hidden="true"></span><p>Loading ${esc(what)}…</p></div>`;

  // ---------- navigation ----------
  const VIEWS = { home: viewHome, library: viewLibrary, pill: viewPill, nzt48: viewNZT48, goals: viewGoals, summary: viewSummary, decisions: viewDecisions, methodology: viewMethodology, database: viewDatabase, acute: viewAcute, longterm: viewLongterm, populations: viewPopulations, combinations: viewCombinations, rankings: viewRankings, myths: viewMyths, foundations: viewFoundations, safety: viewSafety, regulatory: viewRegulatory, competitors: viewCompetitors, products: viewProducts, costs: viewCosts, validation: viewValidation, instruments: viewInstruments, brand: viewBrand, bibliography: viewBibliography };
  // in-page router: the current view lives in CURRENT, so navigation works even where the host frame ignores hash changes
  let CURRENT = (location.hash || '#home').slice(1) || 'home';
  function route() { const h = CURRENT || 'home'; const i = h.indexOf('.'); return i < 0 ? { view: h, param: null } : { view: h.slice(0, i), param: decodeURIComponent(h.slice(i + 1)) }; }
  function go(h) { if (!h) return; if (OVL) closeOverlay(true); CURRENT = h; try { history.replaceState(null, '', '#' + h); } catch (e) { /* sandboxed frame */ } window.__tblKeepScroll = false; _render(); }
  const navKey = view => view === 'ingredient' ? 'database' : view;
  const navOpen = {};
  function renderNav() {
    const cur = navKey(route().view);
    const curG = LIB_OF[cur] ? LIB_OF[cur].g.key : null;
    const link = (k, inner) => `<a href="#${k}"${cur === k ? ' class="active" aria-current="page"' : ''}>${inner}</a>`;
    const nav = document.getElementById('nav');
    nav.innerHTML = `<button type="button" class="search-trigger" data-open="palette">${icon('search')}<span>Search</span><kbd>Ctrl K</kbd></button>
      <div class="nav-primary">${PRIMARY.map(([k, l, , ic]) => link(k, `${icon(ic)}<span>${esc(l)}</span>`)).join('')}</div>
      <div class="nav-lib"><a href="#library" class="nav-lib-h${cur === 'library' ? ' active' : ''}">Library<span>All ${LIB_COUNT} pages</span></a>
        ${LIB.map(g => { const open = navOpen[g.key] !== undefined ? navOpen[g.key] : g.key === curG; return `<details class="nav-group${g.key === curG ? ' has-active' : ''}" data-g="${g.key}"${open ? ' open' : ''}><summary>${icon(g.ic)}<span>${esc(g.t)}</span>${icon('chev', 'chev')}</summary><div class="nav-sub">${g.items.map(([k, l]) => link(k, esc(l))).join('')}</div></details>`; }).join('')}</div>
      <div class="nav-foot"><button type="button" class="nav-help" data-open="help">${icon('help')}<span>How to read the grades</span></button>
        <div class="theme-seg" role="group" aria-label="Colour theme">${THEMES.map(t => `<button type="button" data-theme-set="${t}" aria-pressed="${getTheme() === t}" title="${THEME_LABEL[t]}">${icon(t === 'system' ? 'monitor' : t === 'light' ? 'sun' : 'moon')}<span>${t === 'system' ? 'Auto' : THEME_LABEL[t]}</span></button>`).join('')}</div></div>`;
    nav.querySelectorAll('details.nav-group').forEach(d => d.addEventListener('toggle', () => { navOpen[d.dataset.g] = d.open; }));
  }
  function renderTabbar() {
    const tb = document.getElementById('tabbar');
    if (!tb) return;
    const v = navKey(route().view), cur = TAB_OF[v] || v;
    tb.innerHTML = PRIMARY.filter(([k]) => !TAB_OF[k]).map(([k, , s, ic]) => `<a href="#${k}"${cur === k ? ' class="active" aria-current="page"' : ''}>${icon(ic)}<span>${esc(s)}</span></a>`).join('');
  }
  function setDrawer(open) {
    const r = document.getElementById('rail'), sc = document.getElementById('scrim'), mb = document.getElementById('menuBtn');
    if (!r) return;
    r.classList.toggle('open', open); sc.hidden = !open; document.body.classList.toggle('drawer-open', open);
    if (mb.setAttribute) mb.setAttribute('aria-expanded', String(open));
    if (open) { const f = r.querySelector('.search-trigger'); if (f && f.focus) f.focus(); }
  }
  function crumbs(view) { const x = LIB_OF[view]; return x ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="#library">Library</a>${icon('chev')}<span>${esc(x.g.t)}</span></nav>` : ''; }
  function pager(view) {
    const x = LIB_OF[view];
    if (!x) return '';
    const it = x.g.items, p = it[x.i - 1], n = it[x.i + 1];
    return `<nav class="pager" aria-label="More in ${esc(x.g.t)}">${p ? `<a class="prev" href="#${p[0]}"><small>${icon('back')}Previous</small><strong>${esc(p[1])}</strong></a>` : ''}${n ? `<a class="next" href="#${n[0]}"><small>Next${icon('arrow')}</small><strong>${esc(n[1])}</strong></a>` : `<a class="next" href="#library"><small>Back to${icon('arrow')}</small><strong>The library</strong></a>`}</nav>`;
  }
  function siteFoot() {
    const c = META.counts || {};
    return `<footer class="site-foot"><div class="sf-brand">${BRAND_SVG}Brain Food Evidence Atlas</div>
      <p>Decision support built from graded human evidence. Nothing here is medical advice or a product claim, and the scores are transparent heuristics, not validated measures.</p>
      <p>Data built ${esc((META.generated_at || '').replace('T', ' ').slice(0, 16))} UTC · ${esc(c.monographs || 0)} ingredients · ${esc((c.unique_references || 0).toLocaleString('en-US'))} references · <button type="button" class="linkish" data-open="help">How to read the grades</button></p></footer>`;
  }

  // ---------- overlays: search palette (Ctrl K or /) and the reading guide (?) ----------
  let OVL = null;
  const ALL_PAGES = PRIMARY.map(([k, l, , ic, d]) => ({ k, t: l, d, ic })).concat([{ k: 'library', t: 'Library', d: `All ${LIB_COUNT} research pages, on four shelves.`, ic: 'grid' }], LIB.flatMap(g => g.items.map(([k, l, d, ic]) => ({ k, t: l, d, ic }))));
  function palResults(q) {
    const s = q.trim().toLowerCase();
    const ingItem = m => ({ href: '#ingredient.' + m.id, t: m.name, s: m.category_name, ic: CAT_IC[m.category] || 'leaf', m });
    const pageItem = p => ({ href: '#' + p.k, t: p.t, s: p.d, ic: p.ic });
    if (!s) return (RECENT.length ? [['Recently viewed', RECENT.slice(0, 4).map(id => ingItem(byId[id]))]] : []).concat([['Go to', ALL_PAGES.slice(0, PRIMARY.length).map(pageItem)], ['Popular ingredients', ['caffeine', 'creatine', 'l-theanine', 'omega-3-dha-epa', 'bacopa-monnieri'].filter(id => byId[id]).map(id => ingItem(byId[id]))]]);
    const words = s.split(/\s+/).filter(Boolean);
    const score = (head, body) => { let sc = 0; for (const w of words) { if (head.startsWith(w)) sc += 6; else if (new RegExp('\\b' + escRe(w)).test(head)) sc += 4; else if (head.includes(w)) sc += 2; else if (body.includes(w)) sc += 1; else return 0; } return sc; };
    const ings = MONOS.map(m => ({ m, sc: score(m.name.toLowerCase(), [(m.aliases || []).join(' '), (m.food_sources || []).join(' '), m.category_name].join(' ').toLowerCase()) })).filter(x => x.sc)
      .sort((a, b) => b.sc - a.sc || a.m.name.localeCompare(b.m.name)).slice(0, 8).map(x => ingItem(x.m));
    const pages = ALL_PAGES.map(p => ({ p, sc: score(p.t.toLowerCase(), (p.d || '').toLowerCase()) })).filter(x => x.sc).sort((a, b) => b.sc - a.sc).slice(0, 5).map(x => pageItem(x.p));
    const out = [];
    if (ings.length) out.push(['Ingredients', ings]);
    if (pages.length) out.push(['Pages', pages]);
    out.push([ings.length || pages.length ? 'Search deeper' : 'No direct match', [{ href: '#search.' + encodeURIComponent(q.trim()), t: `Search all text for “${q.trim()}”`, s: 'Ingredient pages, research documents and every cited study', ic: 'search' }]]);
    return out;
  }
  function palRender() {
    const inp = document.getElementById('pal-q'), list = document.getElementById('pal-list');
    if (!inp || !list || !OVL) return;
    const groups = palResults(inp.value);
    OVL.items = groups.flatMap(g => g[1]);
    if (OVL.sel >= OVL.items.length) OVL.sel = 0;
    const words = inp.value.trim().split(/\s+/).filter(w => w.length > 1).map(w => escRe(esc(w)));
    const re = words.length ? new RegExp('(' + words.join('|') + ')', 'ig') : null;
    const hl = t => re ? esc(t).replace(re, '<mark>$1</mark>') : esc(t);
    let n = 0;
    list.innerHTML = groups.map(([h, items]) => `<div class="pal-h">${esc(h)}</div>` + items.map(it => { const i = n++; return `<a class="pal-item" href="${esc(it.href)}" role="option" id="pal-o${i}" data-i="${i}" aria-selected="${i === OVL.sel}"><span class="pi-ic">${icon(it.ic)}</span><span class="pi-body"><span class="pi-t">${hl(it.t)}</span>${it.s ? `<span class="pi-s">${esc(it.s)}</span>` : ''}</span>${it.m ? `<span class="pi-g" title="Best grade today / long-term"><small>Today</small>${grade(it.m._derived.best_grade_acute)}<small>Long</small>${grade(it.m._derived.best_grade_chronic)}</span>` : ''}</a>`; }).join('')).join('');
    inp.setAttribute('aria-activedescendant', 'pal-o' + OVL.sel);
    list.querySelectorAll('.pal-item').forEach(a => a.addEventListener('mousemove', () => { if (OVL && OVL.sel !== +a.dataset.i) { OVL.sel = +a.dataset.i; palMark(); } }));
  }
  function palMark() {
    const list = document.getElementById('pal-list'), inp = document.getElementById('pal-q');
    if (!list || !OVL) return;
    list.querySelectorAll('.pal-item').forEach(a => a.setAttribute('aria-selected', String(+a.dataset.i === OVL.sel)));
    const cur = document.getElementById('pal-o' + OVL.sel);
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    if (inp) inp.setAttribute('aria-activedescendant', 'pal-o' + OVL.sel);
  }
  function palKey(e) {
    if (!OVL || !OVL.items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); OVL.sel = (OVL.sel + 1) % OVL.items.length; palMark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); OVL.sel = (OVL.sel - 1 + OVL.items.length) % OVL.items.length; palMark(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = OVL.items[OVL.sel]; if (it) go(it.href.slice(1)); }
  }
  function helpHtml() {
    const row = (badge, text) => `<span>${badge}</span><span>${text}</span>`;
    return `<div class="dlg help-dlg" role="dialog" aria-modal="true" aria-labelledby="help-t">
      <div class="dlg-h"><div><div class="eyebrow">Reading guide</div><h2 id="help-t">How to read this atlas</h2></div><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="dlg-b"><p>Every finding comes from human studies, each matched to its PubMed or Crossref record. Three labels tell you almost everything.</p>
        <div class="legend-block"><h3><span class="n">1</span>How strong is the evidence?</h3><div class="legend-rows">${['A', 'B', 'C', 'D', 'E'].map(g => row(grade(g), `<b>${GRADE_WORD[g]}</b>: ${GRADE_HELP[g]}`)).join('')}${row(grade(null), '<b>No grade</b>: not studied for this. Unknown, which is not the same as “no effect”.')}</div></div>
        <div class="legend-block"><h3><span class="n">2</span>When does it work?</h3><div class="legend-rows">${row(tf('acute'), 'A single dose, tested the same day.')}${row(tf('short_term_days'), '2 to 13 days of use.')}${row(tf('chronic'), '2 weeks or longer of regular use.')}</div></div>
        <div class="legend-block"><h3><span class="n">3</span>Is it safe and allowed?</h3><div class="legend-rows">${row(gate('pass'), 'No safety or legal barrier found.')}${row(gate('conditional'), 'Usable only within the limits on its page: dose, who should avoid it, allowed wording.')}${row(gate('fail'), 'Excluded: fails a hard safety or legal requirement.')}</div></div>
        <div class="legend-block"><h3><span class="n">4</span>The plain answers</h3><div class="legend-rows">${[['Yes', 'Good evidence of a benefit in healthy adults.'], ['In some groups', 'Good evidence, but only in a narrower group (for example older adults or the sleep-deprived).'], ['Maybe', 'Only limited evidence of a benefit.'], ['Unclear', 'Studied, but the results are weak or mixed.'], ['No', 'Good trials found no benefit.'], ['No, may harm', 'Good trials found a negative effect.'], ['Not studied', 'No human study measured it.']].map(([a, t]) => row(`<span class="qa-a">${vIcon(a)}</span>`, `<b>${a}</b>: ${t}`)).join('')}</div></div>
        <div class="legend-note"><strong>One rule to remember:</strong> a grade belongs to one outcome, in one group of people, over one timeframe. Caffeine is grade A for same-day alertness and has no long-term grade at all. Feeling alert is not remembering more, and a better blood marker is not a better brain.</div>
        <div class="legend-block"><h3>Shortcuts</h3><div class="legend-rows">${row('<kbd>/</kbd> or <kbd>Ctrl K</kbd>', 'Search anything')}${row('<kbd>?</kbd>', 'Open this guide')}${row('<kbd>Esc</kbd>', 'Close a panel')}</div></div>
      </div>
      <div class="dlg-f"><span class="small">Decision support, not medical advice.</span><button type="button" class="btn primary" data-close>Got it</button></div></div>`;
  }
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const f = Array.from(e.currentTarget.querySelectorAll('a[href], button, input, select, [tabindex]:not([tabindex="-1"])')).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openOverlay(kind) {
    const root = document.getElementById('overlay-root');
    if (!root || document.body.classList.contains('nzt-takeover')) return;
    if (OVL) closeOverlay(true);
    setDrawer(false);
    OVL = { kind, sel: 0, items: [], ret: document.activeElement };
    document.body.classList.add('ovl-open');
    root.innerHTML = kind === 'help' ? `<div class="ovl" data-ovl>${helpHtml()}</div>` : `<div class="ovl ovl-top" data-ovl><div class="dlg pal" role="dialog" aria-modal="true" aria-label="Search the atlas">
      <div class="pal-in">${icon('search')}<input id="pal-q" type="search" placeholder="Search ingredients, pages, studies…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list"><kbd>Esc</kbd><button type="button" class="icon-btn pal-x" data-close aria-label="Close search">${icon('x')}</button></div>
      <div class="pal-list" id="pal-list" role="listbox" aria-label="Results"></div>
      <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div></div>`;
    const ov = root.querySelector('[data-ovl]');
    ov.addEventListener('mousedown', e => { if (e.target === ov) closeOverlay(); });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeOverlay()));
    ov.addEventListener('keydown', trapFocus);
    if (kind === 'help') { const b = ov.querySelector('[data-close]'); if (b) b.focus(); return; }
    const inp = document.getElementById('pal-q');
    palRender();
    inp.addEventListener('input', () => { OVL.sel = 0; palRender(); });
    inp.addEventListener('keydown', palKey);
    inp.focus();
  }
  function closeOverlay(silent) {
    const root = document.getElementById('overlay-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('ovl-open');
    const ret = OVL && OVL.ret;
    OVL = null;
    if (!silent && ret && ret.focus && document.body.contains(ret)) ret.focus();
  }

  function render() {
    const { view, param } = route();
    const app = document.getElementById('app');
    hideTip();
    // keep focus (and caret) in a filter box across re-renders
    const ae = document.activeElement, keepId = ae && ae.id && app.contains && app.contains(ae) ? ae.id : null;
    const caret = keepId && typeof ae.selectionStart === 'number' ? ae.selectionStart : null;
    let html;
    // pages built on documents that load in the background wait for them; everything else paints at once
    const need = NEEDS(view).filter(k => !READY[k]);
    if (need.length) {
      document.body.classList.remove('nzt-takeover');
      app.innerHTML = crumbs(view) + loadingHtml('this page');
      renderNav(); renderTabbar(); setDrawer(false);
      Promise.all(need.map(loadLazy)).then(() => { if (route().view === view) _render(); },
        () => { if (route().view === view) app.innerHTML = '<div class="page-head"><div><h1>This page could not load</h1><p class="lead">Check your connection, then <a href="#' + esc(CURRENT) + '">try again</a>.</p></div></div>'; });
      return;
    }
    try {
      if (view === 'ingredient') html = viewIngredient(param);
      else if (view === 'compare') html = viewCompare(param);
      else if (view === 'matrix') html = viewMatrix();
      else if (view === 'claims') html = viewClaims();
      else if (view === 'search') html = viewSearch(param);
      else if (view === 'profile') html = viewProfile(param);
      else if (view === 'protocol') html = viewProtocol(param);
      else if (VIEWS[view]) html = VIEWS[view]();
      else html = `<div class="page-head"><div><h1>Page not found</h1><p class="lead">This address does not match a page. <a href="#home">Go to the start page</a> or press <kbd>/</kbd> to search.</p></div></div>`;
    } catch (e) { html = `<h1>Rendering error</h1><pre>${esc(e.stack || e)}</pre>`; console.error(e); }
    document.body.classList.toggle('nzt-takeover', view === 'nzt48');
    app.innerHTML = view === 'nzt48' ? html : crumbs(view) + html + pager(view) + siteFoot();
    if (view === 'nzt48') initNZT(app);
    wireTables(app);
    [['mx-pop', 'pop'], ['mx-tf', 'tf'], ['mx-sort', 'sort']].forEach(([id, k]) => { const s = document.getElementById(id); if (s && s.addEventListener) s.addEventListener('change', () => { mst[k] = s.value; render(); }); });
    app.querySelectorAll('[data-pq]').forEach(b => b.addEventListener('click', () => profileAction(b.dataset.pq)));
    { const gp = document.getElementById('goal-pop'); if (gp && gp.addEventListener) gp.addEventListener('change', () => { gst.pop = gp.value; render(); }); }
    [0, 1, 2, 3].forEach(i => { const s = document.getElementById('cmp-' + i); if (s && s.addEventListener) s.addEventListener('change', () => { const next = CMP.slice(); if (s.value) next[i] = s.value; else next.splice(i, 1); go('compare.' + next.filter(Boolean).filter((v, j, a) => a.indexOf(v) === j).join(',')); }); });
    // ingredient finder
    { const q = document.getElementById('db-q'); if (q && q.addEventListener && view === 'database') { q.addEventListener('input', () => { dbs.q = q.value; dbFilter(app); }); dbFilter(app); } }
    app.querySelectorAll('[data-dbq]').forEach(b => b.addEventListener('click', () => { dbs.quick = b.dataset.dbq; render(); }));
    app.querySelectorAll('[data-dbmode]').forEach(b => b.addEventListener('click', () => { dbs.mode = b.dataset.dbmode; render(); }));
    app.querySelectorAll('[data-dbclear]').forEach(b => b.addEventListener('click', () => { dbs.q = ''; dbs.quick = 'all'; dbs.cat = ''; render(); }));
    [['db-cat', 'cat'], ['db-sort', 'sort']].forEach(([id, k]) => { const s = document.getElementById(id); if (s && s.addEventListener && view === 'database') s.addEventListener('change', () => { dbs[k] = s.value; render(); }); });
    // search page box
    { const sq = document.getElementById('search-q'); if (sq && sq.addEventListener && view === 'search') sq.addEventListener('keydown', e => { if (e.key === 'Enter' && sq.value.trim()) go('search.' + encodeURIComponent(sq.value.trim())); }); }
    // ingredient tabs (arrow keys move between tabs)
    app.querySelectorAll('.itabs [data-itab]').forEach(b => b.addEventListener('click', () => {
      setITab(app, b.dataset.itab);
      const anc = document.getElementById('itabs-anchor');
      if (anc && anc.getBoundingClientRect) { const top = anc.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0) - 6; if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' }); }
    }));
    { const tl = app.querySelector('.itabs'); if (tl && tl.addEventListener && view === 'ingredient') tl.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const bs = Array.from(tl.querySelectorAll('[data-itab]')); const i = bs.findIndex(b => b.dataset.itab === ist.tab); const nb = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; setITab(app, nb.dataset.itab); nb.focus(); }); }
    // evidence map: a cell opens its finding in the Evidence tab
    app.querySelectorAll('[data-emrow]').forEach(b => b.addEventListener('click', () => {
      setITab(app, 'evidence');
      const tr = document.getElementById('ev-row-' + b.dataset.emrow);
      if (tr) { tr.scrollIntoView({ behavior: 'smooth', block: 'center' }); tr.classList.add('row-flash'); setTimeout(() => tr.classList.remove('row-flash'), 2000); }
    }));
    // protocol: timeframe tabs, brake check, jump from a brake to its fix
    app.querySelectorAll('[data-ptab]').forEach(b => b.addEventListener('click', () => setPxTab(app, b.dataset.ptab)));
    { const tl = document.getElementById('px-tabs'); if (tl && tl.addEventListener && view === 'protocol') tl.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const nt = pxs.tab === 'short' ? 'long' : 'short'; setPxTab(app, nt); const b = document.getElementById('px-tab-' + nt); if (b) b.focus(); }); }
    app.querySelectorAll('[data-brake]').forEach(cb => cb.addEventListener('change', () => {
      const k = cb.dataset.brake;
      pxs.brakes = pxs.brakes.filter(x => x !== k).concat(cb.checked ? [k] : []);
      try { localStorage.setItem('bf-brakes', JSON.stringify(pxs.brakes)); } catch (e) { /* storage blocked */ }
      const r = document.getElementById('px-result'); if (r) r.innerHTML = pxResult();
    }));
    { const pr = document.getElementById('px-result'); if (pr && pr.addEventListener && view === 'protocol') pr.addEventListener('click', e => {
      const b = e.target && e.target.closest ? e.target.closest('[data-pxgo]') : null; if (!b) return;
      const [t, id] = b.dataset.pxgo.split(':'); setPxTab(app, t);
      const el = document.getElementById('px-' + id);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('px-flash'); setTimeout(() => el.classList.remove('px-flash'), 1800); }
    }); }
    app.querySelectorAll('a.ref[data-ref]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = document.getElementById('study-' + a.dataset.ref); if (el) { const p = el.closest('.tabpane'); if (p && p.hidden) setITab(app, p.dataset.tab); el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
    app.querySelectorAll('.toc a[data-jump]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth' }); }));
    app.querySelectorAll('.tabs').forEach(tabs => tabs.querySelectorAll('button[data-tab]').forEach(b => b.addEventListener('click', () => { tabs.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); const pane = tabs.parentElement; pane.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.id !== b.dataset.tab; }); })));
    buildOnPage(app, view);
    renderNav();
    renderTabbar();
    renderTray();
    setDrawer(false);
    if (!window.__tblKeepScroll) {
      window.scrollTo(0, 0);
      // #goals.memory etc. land on that goal
      if (view === 'goals' && param) { const el = document.getElementById('goal-' + param); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
    }
    window.__tblKeepScroll = false;
    if (keepId) { const el = document.getElementById(keepId); if (el && el.focus) { el.focus(); if (caret != null && el.setSelectionRange) { try { el.setSelectionRange(caret, caret); } catch (e) { /* not a text field */ } } } }
  }
  const _render = render;
  render = function () { window.__tblKeepScroll = true; const y = window.scrollY; _render(); window.scrollTo(0, y); };
  document.addEventListener('keydown', e => {
    if (document.body.classList.contains('nzt-takeover')) { if (e.key === 'Escape') location.hash = '#pill'; return; }
    if (e.key === 'Escape') { if (OVL) { e.preventDefault(); closeOverlay(); } else if (document.body.classList.contains('drawer-open')) setDrawer(false); return; }
    const t = e.target || {}, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || t.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (OVL && OVL.kind === 'palette') closeOverlay(); else openOverlay('palette'); }
    else if (!typing && !OVL && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === '/') { e.preventDefault(); openOverlay('palette'); }
      else if (e.key === '?') { e.preventDefault(); openOverlay('help'); }
    }
  });
  // ---------- compare tray: pick up to four ingredients anywhere, compare them in one click ----------
  function toggleTray(id) {
    const i = TRAY.indexOf(id);
    if (i >= 0) TRAY.splice(i, 1);
    else if (TRAY.length >= 4) { toast('Compare holds four ingredients. Remove one first.'); return; }
    else TRAY.push(id);
    store.set('bf-compare', TRAY);
    syncTray();
  }
  function syncTray() {
    document.querySelectorAll('.cmp-tog[data-cmptog]').forEach(b => {
      const on = TRAY.includes(b.dataset.cmptog), m = byId[b.dataset.cmptog];
      b.setAttribute('aria-pressed', String(on)); b.title = (on ? 'Remove from' : 'Add to') + ' compare';
      b.innerHTML = icon(on ? 'check' : 'plus') + (b.classList.contains('btn') ? `<span>${on ? 'In compare' : 'Add to compare'}</span>` : `<span class="sr">Compare ${esc(m ? m.name : '')}</span>`);
    });
    renderTray();
  }
  function renderTray() {
    const el = document.getElementById('tray');
    if (!el) return;
    const v = route().view, show = TRAY.length > 0 && v !== 'compare' && v !== 'nzt48';
    el.hidden = !show;
    document.body.classList.toggle('has-tray', show);
    el.innerHTML = show ? `<div class="tray-in"><span class="tray-l">${icon('columns')}<span>Compare</span></span>
      <div class="tray-items">${TRAY.map(id => `<span class="tray-it">${catAv(byId[id], 'sm')}<span class="tray-n">${esc(byId[id].name.replace(/ \(.*\)$/, ''))}</span><button type="button" class="tray-x" data-cmptog="${esc(id)}" aria-label="Remove ${esc(byId[id].name)} from compare">${icon('x')}</button></span>`).join('')}</div>
      <button type="button" class="btn primary sm" data-traygo${TRAY.length < 2 ? ' disabled' : ''}>${TRAY.length < 2 ? 'Add one more' : `Compare ${TRAY.length}`}</button>
      <button type="button" class="icon-btn tray-clear" data-trayclear aria-label="Clear compare">${icon('x')}</button></div>` : '';
  }
  // ---------- small confirmations ----------
  let toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400);
  }
  function sharePage() {
    const url = location.href.split('#')[0] + '#' + CURRENT;
    const h = document.querySelector('#app h1');
    const title = (h ? h.textContent.trim() + ' · ' : '') + 'Brain Food Evidence Atlas';
    if (navigator.share) { navigator.share({ title, url }).catch(() => { /* closed */ }); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => toast('Link copied'), () => toast(url));
    else toast(url);
  }
  // ---------- long research pages: a sticky "on this page" bar that follows the reader ----------
  let spy = null;
  function buildOnPage(app, view) {
    if (spy) { spy.disconnect(); spy = null; }
    app.classList.remove('has-onpage');
    if (!LIB_OF[view] || typeof IntersectionObserver === 'undefined' || !app.querySelectorAll) return;
    const hs = Array.from(app.querySelectorAll('h2')).filter(h => !h.closest('.site-foot, .pager, figure, details, .onpage') && h.textContent.trim());
    if (hs.length < 4) return;
    hs.forEach((h, i) => { if (!h.id) h.id = 'sec-' + (i + 1); });
    const anchor = app.querySelector('.page-head') || app.querySelector('h1');
    if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', `<nav class="onpage" aria-label="On this page"><span class="onpage-l">${icon('list')}<span>On this page</span></span><div class="onpage-chips">${hs.map(h => `<button type="button" data-goto="${esc(h.id)}">${esc(h.textContent.trim().replace(/\s+/g, ' ').slice(0, 44))}</button>`).join('')}</div></nav>`);
    app.classList.add('has-onpage');
    const bar = app.querySelector('.onpage-chips');
    const mark = id => bar.querySelectorAll('button').forEach(b => {
      const on = b.dataset.goto === id;
      b.classList.toggle('on', on);
      if (on) bar.scrollTo({ left: b.offsetLeft - bar.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
    });
    bar.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { const el = document.getElementById(b.dataset.goto); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); mark(b.dataset.goto); } }));
    spy = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) mark(e.target.id); }); }, { rootMargin: '-130px 0px -62% 0px' });
    hs.forEach(h => spy.observe(h));
  }
  // back to top, once the reader is two screens down
  let topBtn = null;
  window.addEventListener('scroll', () => {
    const on = window.scrollY > window.innerHeight * 2;
    if (on && !topBtn) { topBtn = document.createElement('button'); topBtn.type = 'button'; topBtn.className = 'to-top'; topBtn.setAttribute('aria-label', 'Back to top'); topBtn.innerHTML = icon('up'); topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); document.body.appendChild(topBtn); }
    if (topBtn) topBtn.classList.toggle('on', on);
  }, { passive: true });
  // one shared tooltip for figures: hover or keyboard focus (or a tap) shows it; plain text only, never HTML
  let tipEl = null;
  function showTip(t) {
    const s = t.dataset.tip;
    if (!s) { hideTip(); return; }
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    tipEl.textContent = s; tipEl.hidden = false;
    const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const y = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { if (tipEl) tipEl.hidden = true; }
  const tipTarget = e => e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  document.addEventListener('pointerover', e => { const t = tipTarget(e); if (t) showTip(t); else hideTip(); });
  document.addEventListener('focusin', e => { const t = tipTarget(e); if (t) showTip(t); else hideTip(); });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true });
  window.addEventListener('hashchange', () => { const h = (location.hash || '#home').slice(1) || 'home'; if (h !== CURRENT) { if (OVL) closeOverlay(true); CURRENT = h; window.__tblKeepScroll = false; _render(); } });
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    const op = t.closest('[data-open]');
    if (op) { e.preventDefault(); openOverlay(op.dataset.open); return; }
    const ct = t.closest('[data-cmptog]');
    if (ct) { e.preventDefault(); toggleTray(ct.dataset.cmptog); return; }
    if (t.closest('[data-traygo]')) { if (TRAY.length > 1) go('compare.' + TRAY.join(',')); return; }
    if (t.closest('[data-trayclear]')) { TRAY.length = 0; store.set('bf-compare', TRAY); syncTray(); return; }
    if (t.closest('[data-share]')) { e.preventDefault(); sharePage(); return; }
    const th = t.closest('[data-theme-set]');
    if (th) { const v = th.dataset.themeSet; try { localStorage.setItem('bf-theme', v); } catch (err) { /* storage blocked */ } applyTheme(v); renderNav(); return; }
    if (t.closest('.skip-link')) { e.preventDefault(); const m = document.getElementById('app'); if (m && m.focus) m.focus(); return; }
    const a = t.closest('a[href^="#"]');
    if (!a || a.classList.contains('ref') || a.dataset.jump) return;
    const h = a.getAttribute('href').slice(1);
    if (!h) return;
    e.preventDefault();
    go(h);
  });
  document.getElementById('menuBtn').addEventListener('click', () => setDrawer(!document.getElementById('rail').classList.contains('open')));
  document.getElementById('railClose').addEventListener('click', () => setDrawer(false));
  document.getElementById('scrim').addEventListener('click', () => setDrawer(false));
  if (!MONOS.length) document.getElementById('app').innerHTML = '<div class="pending">No data files found. Run <code>python -I tools/build_data.py</code> to generate <code>app/data/*.js</code>, then reload.</div>';
  _render();
  // then fetch the rest in the background, and refresh a page that was waiting on it
  setTimeout(() => Object.keys(LAZY).forEach(k => loadLazy(k).then(() => { if ((REFRESH[k] || []).includes(route().view)) render(); }, () => { /* retried when a page needs it */ })), 30);
  // offline support on the standalone website only (the page links a manifest there; file:// and embedded copies skip this)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable; the site still works online */ });
  }
})();
