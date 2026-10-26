/* Brain Food Evidence Atlas — single-page app over the NEUROFUEL LAB research corpus (no build step, works from file://) */
(function () {
  'use strict';
  const D = window.BF_DATA || {};
  const META = D.meta || { counts: {}, grade_distribution: {}, categories: {} };
  const MONOS = (D.monographs || []).slice();
  const SYN = D.syntheses || {};
  const BIB = D.bibliography || [];
  const GR = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const GRADE_LABEL = { A: 'Strong human evidence', B: 'Moderate human evidence', C: 'Limited human evidence', D: 'Preliminary (mechanistic/animal/exploratory)', E: 'Not supported or concerning' };
  const DOMAIN_LABEL = { alertness: 'Alertness', sustained_attention: 'Sustained attention', reaction_time: 'Reaction time', working_memory: 'Working memory', executive_function: 'Executive function', processing_speed: 'Processing speed', vigilance: 'Vigilance', cognitive_fatigue: 'Cognitive fatigue', learning: 'Learning', resistance_to_decline: 'Resistance to performance decline', episodic_memory: 'Episodic memory', learning_retention: 'Learning retention', global_cognition: 'Global cognition', cognitive_aging: 'Cognitive aging', vascular_health: 'Brain vascular health', cognitive_decline: 'Cognitive decline', dementia_risk: 'Dementia risk', neuroplasticity_biomarkers: 'Neuroplasticity biomarkers', sleep_related_cognition: 'Sleep-related cognition', mood_stress: 'Mood / stress', cerebral_blood_flow: 'Cerebral blood flow', other: 'Other' };
  const POP_LABEL = { healthy_young_adults: 'Healthy young adults', students: 'Students', knowledge_workers: 'Knowledge workers', high_cognitive_workload: 'High cognitive workload', sleep_deprived: 'Sleep-deprived adults', older_adults_healthy: 'Older adults (healthy)', older_adults_mci: 'Older adults with MCI', deficient_or_low_baseline: 'Deficient / low baseline', replete_or_high_baseline: 'Replete / high baseline', vegetarian_vegan: 'Vegetarians / vegans', children_adolescents: 'Children / adolescents', clinical_population: 'Clinical population', mixed_adults: 'Mixed adults', other: 'Other' };
  const DIR_LABEL = { benefit: 'Benefit', possible_benefit: 'Possible benefit', inconsistent: 'Inconsistent', no_benefit: 'No convincing benefit', harm: 'Negative effect', insufficient: 'Insufficient evidence' };
  const TF_LABEL = { acute: 'Acute (single dose / day)', short_term_days: 'Short term (2–13 days)', chronic: 'Chronic (≥ 2 weeks)' };
  const EV_LABEL = { established_human: 'Established in humans', limited_human: 'Limited human data', animal: 'Mainly animal research', plausible: 'Mechanistically plausible', speculative: 'Speculative' };
  const byId = {};
  MONOS.forEach(m => { byId[m.id] = m; });

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lab = (map, k) => map[k] || (k ? String(k).replace(/_/g, ' ') : '—');
  const grade = g => g ? `<span class="badge grade-${esc(g)}" title="${esc(GRADE_LABEL[g] || '')}">${esc(g)}</span>` : '<span class="badge neutral">n/a</span>';
  const gate = g => `<span class="badge ${esc(g || 'unknown')}">${esc(g || 'unknown')}</span>`;
  const dir = d => `<span class="dir-${esc(d)}">${esc(lab(DIR_LABEL, d))}</span>`;
  const bar = (v, max = 10) => { const n = Number(v); if (isNaN(n)) return '<span class="muted">—</span>'; return `<span class="bar"><span class="track"><span class="fill" style="width:${Math.max(0, Math.min(100, n / max * 100))}%"></span></span><span class="v">${n.toFixed(1)}</span></span>`; };
  const fmtList = a => Array.isArray(a) && a.length ? '<ul class="compact">' + a.map(x => `<li>${typeof x === 'string' ? inline(x) : structured(x)}</li>`).join('') + '</ul>' : '<span class="muted">—</span>';
  const pmLink = s => s && s.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${esc(s.pmid)}/" target="_blank" rel="noopener">PMID ${esc(s.pmid)}</a>` : '';
  const doiLink = s => s && s.doi ? `<a href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener">DOI</a>` : '';
  const pmcLink = s => s && s.pmcid ? `<a href="https://pmc.ncbi.nlm.nih.gov/articles/${esc(s.pmcid)}/" target="_blank" rel="noopener">${esc(s.pmcid)}</a>` : '';
  const verifBadge = s => { const v = (s.verification && s.verification.status) || (s.verified_by_agent ? 'agent_verified' : 'unverified'); const cls = v === 'verified' ? 'pass' : v === 'agent_verified' ? 'conditional' : 'fail'; const t = v === 'verified' ? 'Record confirmed against PubMed/Crossref' : v === 'agent_verified' ? 'Verified by the research agent; independent batch check pending' : v === 'title_mismatch' ? 'Identifier found but title does not match: treat as unverified' : 'Not verified: excluded from quantitative synthesis'; return `<span class="badge ${cls}" title="${esc(t)}">${esc(v.replace('_', ' '))}</span>`; };
  const sortGrade = g => GR[g] || 0;
  const monoLink = id => byId[id] ? `<a href="#ingredient.${esc(id)}">${esc(byId[id].name)}</a>` : `<span class="muted">${esc(id)}</span>`;

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
    let html = `<div class="page-head"><div><div class="eyebrow">${esc(id)}</div><h1>${esc(sy.title || fallbackTitle)}</h1></div></div>${synthesisStatus(sy)}`;
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
    const st = (window.__tbl = window.__tbl || {})[spec.id] = (window.__tbl || {})[spec.id] || { sort: spec.defaultSort || null, dir: spec.defaultDir || 'desc', f: {}, q: '', limit: spec.pageSize || 200 };
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
    html += `<span class="spacer"></span><span class="small">${rows.length} rows${rows.length > shown.length ? ' (showing ' + shown.length + ')' : ''}</span><button type="button" class="btn" data-export="${spec.id}" title="Download the filtered rows as a spreadsheet file">Download CSV</button></div>`;
    html += `<div class="tbl-wrap"><table class="tbl" id="${spec.id}"><thead><tr>${spec.columns.map(c => `<th class="${c.sort !== false ? 'sortable' : ''}" data-sort="${c.key}">${esc(c.label)}${st.sort === c.key ? `<span class="arrow">${st.dir === 'asc' ? '▲' : '▼'}</span>` : ''}</th>`).join('')}</tr></thead><tbody>`;
    html += shown.map(r => '<tr>' + spec.columns.map(c => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('') + '</tr>').join('');
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

  function viewHome() {
    const c = META.counts || {};
    const gd = META.grade_distribution || {};
    const total = Object.values(gd).reduce((a, b) => a + b, 0) || 1;
    const ex = SYN['executive-summary'];
    const eligible = MONOS.filter(m => m._derived.eligibility !== 'ineligible').sort((a, b) => b._derived.composite_score - a._derived.composite_score).slice(0, 10);
    return `<div class="page-head"><div><div class="eyebrow">NEUROFUEL LAB · research program for the Brain Food brand</div><h1>What nutrition can and cannot do for cognition</h1><p class="lead">A verified, graded evidence base on foods, nutrients and supplements and human cognitive performance, with the safety, regulatory and product analysis needed to build a company whose claims survive scrutiny. Science first. Product second. Marketing last.</p></div></div>
    <div class="tiles">
      <div class="tile"><div class="n">${c.monographs || 0}</div><div class="l">ingredient monographs (${c.reviewed || 0} independently reviewed)</div></div>
      <div class="tile"><div class="n">${c.outcome_rows || 0}</div><div class="l">graded outcome × population rows</div></div>
      <div class="tile"><div class="n">${c.unique_references || 0}</div><div class="l">unique references (${c.verified_references || 0} confirmed against PubMed/Crossref)</div></div>
      <div class="tile"><div class="n">${c.search_queries || 0}</div><div class="l">logged database queries</div></div>
    </div>
    <div class="cards">
      <a class="card link" href="#summary"><h3>Executive scientific summary</h3><p class="small">Main conclusions, key evidence, major uncertainties and safety findings.</p></a>
      <a class="card link" href="#database"><h3>Ingredient database</h3><p class="small">Sortable scores, grades and hard safety/regulatory gates for every ingredient.</p></a>
      <a class="card link" href="#matrix"><h3>Evidence matrix</h3><p class="small">Every ingredient against every cognitive outcome, filterable by population and timeframe.</p></a>
      <a class="card link" href="#compare"><h3>Compare ingredients</h3><p class="small">Up to four side by side: gates, scores, grades, safety and authorised claims.</p></a>
      <a class="card link" href="#rankings"><h3>Rankings A–I</h3><p class="small">Best supported per cognitive domain, whole foods, product candidates, weak claims, safety concerns.</p></a>
      <a class="card link" href="#products"><h3>Product concepts</h3><p class="small">Five product families with concept sheets built only from eligible evidence.</p></a>
      <a class="card link" href="#regulatory"><h3>Regulatory & claims</h3><p class="small">Morocco, EU and US rules; the claims-risk table.</p></a>
      <a class="card link" href="#claims"><h3>Claims library</h3><p class="small">Every authorised claim found, next to refused and on-hold claims.</p></a>
    </div>
    ${progressPanel()}
    <h2>Distribution of evidence grades across all outcome rows</h2>
    <p class="small">Each row is one ingredient × cognitive outcome × population × timeframe judgement. Grade letters are always shown; colours are secondary.</p>
    <div class="gchart">${['A', 'B', 'C', 'D', 'E'].map(g => `<div>${grade(g)}</div><div class="track"><div class="fill" style="width:${(gd[g] || 0) / total * 100}%;background:var(--g${g})"></div></div><div class="n">${gd[g] || 0}</div>`).join('')}</div>
    ${ex ? `<div class="section prose"><h2>Key conclusions</h2>${fmtList(ex.key_conclusions)}<p><a href="#summary">Read the full executive summary →</a></p></div>` : `<div class="section"><h2>Key conclusions</h2>${pending('The executive summary', 'research/syntheses/executive-summary.json')}</div>`}
    <div class="section"><h2>Highest-scoring ingredients that fail no hard gate</h2><p class="small">Composite = 30% evidence quality + 20% effect magnitude + 20% safety + 10% reproducibility + 10% food suitability + 10% cost/access. Safety and regulatory gates are eligibility requirements, not points: a failed gate removes an ingredient; “conditional” means usable only under the conditions stated in its monograph. Scores are transparent decision heuristics, not validated measures.</p>
    ${eligible.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ingredient</th><th>Status</th><th>Best acute</th><th>Best long-term</th><th>Composite</th><th>Verdict</th></tr></thead><tbody>${eligible.map(m => `<tr><td><a href="#ingredient.${esc(m.id)}">${esc(m.name)}</a></td><td>${gate(m._derived.eligibility === 'eligible' ? 'pass' : 'conditional')}</td><td>${grade(m._derived.best_grade_acute)}</td><td>${grade(m._derived.best_grade_chronic)}</td><td class="num">${m._derived.composite_score.toFixed(1)}</td><td class="wrap small">${esc(m.one_line_verdict)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No monographs loaded yet.</p>'}</div>
    <div class="section prose"><h2>How to read this atlas</h2><ul><li><strong>Grades are per outcome, population and timeframe.</strong> An ingredient can be A for acute alertness and D for memory.</li><li><strong>Acute</strong> means a single dose or day; <strong>chronic</strong> means two weeks or longer. Benefits in deficient people are reported separately from enhancement in well-nourished people.</li><li><strong>Verification.</strong> Each study was checked against PubMed or Crossref. Unverified items stay visible but carry no weight.</li><li><strong>Gates.</strong> A safety or regulatory gate failure makes an ingredient ineligible for product development regardless of its score.</li></ul></div>`;
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

  function viewDatabase() {
    return `<div class="page-head"><div><h1>Ingredient database</h1><p class="lead">Every investigated ingredient, food and dietary pattern with its best evidence grades, hard gates and transparent sub-scores. Click a column header to sort; use the filters to narrow.</p><p class="small">Grade columns show the best grade for a <em>benefit</em> on a measured cognitive outcome. Biomarkers (brain creatine, cerebral blood flow, BDNF) and mood rows never count toward them. “Young adults (rested)” covers healthy young adults, students and knowledge workers; sleep-deprived trials have their own column.</p></div></div>
    ${draftBanner()}
    ${dataTable({ id: 'monos', columns: monoCols, rows: MONOS, filters: monoFilters, search: monoSearch, defaultSort: 'comp', pageSize: 500 })}`;
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
    const table = ms.length ? `<div class="tbl-wrap"><table class="tbl cmp"><thead><tr><th class="rowh"></th>${ms.map(m => `<th><a href="#ingredient.${esc(m.id)}">${esc(m.name)}</a></th>`).join('')}</tr></thead><tbody>
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
        { key: 'tf', label: 'Timeframe', sort: r => r.timeframe, render: r => esc(lab(TF_LABEL, r.timeframe)) },
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
      ].concat(extraFilters || []),
      search: (r, q) => (r._m.name + ' ' + r.effect_summary + ' ' + r.population_detail).toLowerCase().includes(q),
    });
  }
  function viewAcute() {
    const rows = ROWS.filter(r => r.timeframe === 'acute');
    const mrows = []; MONOS.forEach(m => (m.acute_matrix || []).forEach(r => mrows.push(Object.assign({ _m: m }, r))));
    const sy = SYN['acute-synthesis'];
    return `<div class="page-head"><div><h1>Acute cognitive performance</h1><p class="lead">Interventions tested within minutes to one day: alertness, attention, reaction time, working memory, executive function, fatigue. Alertness is not memory, and feeling focused is not performing better.</p></div></div>
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
  function viewPill() {
    const stack = [
      { id: 'caffeine', dose: '100–200 mg (roughly one strong cup of coffee), once', timing: 'Take 30–60 min before the task; effect peaks within about an hour and runs 3–4 h.',
        what: 'The single best-proven acute cognitive lever in the whole database. Reaction time improves within minutes (31-trial meta-analysis, g = 0.28, dose-dependent up to ~200 mg+), and sustained attention/vigilance accuracy improves (pooled g = 0.27). Benefits hold even in light or non-habitual users, not just caffeine-withdrawn ones.',
        rescue: 'Under sleep deprivation the effect is much larger, not smaller: 100–600 mg produced g = 0.86 (attention response time), g = 1.11 (reaction time) and restored psychomotor vigilance after 64 h awake comparably to modafinil 400 mg or d-amphetamine 20 mg.',
        catch_: 'Executive function gains are smaller and inconsistent (g = 0.35, mixed across specific tasks). Raises anxiety/jitteriness in low/non-consumers and reliably harms sleep if taken within about 9–13 h of bedtime — the "cost" of a stimulant stack is paid at night.' },
      { id: 'l-theanine', dose: '100–200 mg, alongside the caffeine dose above', timing: 'Same time as caffeine; effect window similar (within ~2 h).',
        what: 'Speeds choice/recognition reaction time by ~15–20 ms alone. Its main value is pairing with caffeine: the combination improves alertness and attention-switching accuracy with less of the jitteriness caffeine causes alone — though the trial literature says caffeine dose explains most of the combined effect, and two trials found no extra benefit over caffeine alone.',
        rescue: null,
        catch_: 'Simple reaction time does not improve in pooled analyses. This is a smoothing agent for caffeine, not an independent enhancer at the available doses.' },
      { id: 'creatine', dose: '0.2–0.35 g/kg (about 14–25 g for a 70 kg adult), single dose, 1.5–3 h before testing', timing: 'Take 1.5–3 h ahead — onset is slower than caffeine.',
        what: 'The rescue ingredient for sleep-deprived cognition specifically: a single large dose improved processing speed on language, logic and numeric tasks plus PVT reaction speed during sleep deprivation, tracking measurable brain-energy changes (PCr/Pi, ATP, prevented cerebral pH drop).',
        rescue: 'This is its one acute use case — do not expect it to sharpen a rested, well-slept brain.',
        catch_: 'In rested healthy adults, acute single-dose creatine for working memory is graded D (insufficient evidence) — it does essentially nothing for a brain that is not short on sleep or energy. The acute dose (14–25 g) is well above Brain Food\'s proposed 5 g/day daily cap, so this is an occasional-use rescue dose, not a daily stack component.' },
      { id: 'american-ginseng-cereboost', dose: '100–200 mg standardized extract (10.65% ginsenosides), single dose', timing: 'Take 1–3 h before the task — effect was measured at post-dose testing through about 3 h.',
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
    const card = s => { const m = byId[s.id]; if (!m) return ''; const d = m._derived; return `<div class="card prose" style="margin-bottom:1rem">
      <div class="mono-head" style="align-items:flex-start"><div><h3 style="margin:0 0 .2rem">${monoLink(s.id)}</h3><p class="small mono" style="margin:0 0 .5rem">${esc(s.dose)} · ${esc(s.timing)}</p></div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">${grade(d.best_grade_acute)}${gate(d.safety_gate)}</div></div>
      <p>${esc(s.what)}</p>${s.rescue ? `<p><strong>Sleep-deprivation rescue:</strong> ${esc(s.rescue)}</p>` : ''}<p class="small muted"><strong>The catch:</strong> ${esc(s.catch_)}</p></div>`; };
    return `<div class="page-head"><div><h1>The Limitless Pill</h1><p class="lead">There is no NZT-48. Nothing in 101 verified monographs raises a healthy, rested adult to a different cognitive tier — the acute-performance evidence tops out at grade A/B for alertness, reaction time and attention, from a short list of ordinary stimulant and food-derived compounds, each with a real catch. This page assembles the best-supported short-term, single-dose stack from that evidence for a before-the-task cognitive edge, and is explicit about what it does and does not do.</p></div></div>
    <div class="callout"><strong>What this is, honestly:</strong> a caffeine-led alertness/attention/reaction-time stack with theanine to blunt jitteriness, plus two situational additions — creatine for sleep-deprived rescue only, and American ginseng for working memory. It will make a rested person feel and test faster and more focused for a few hours. It will not create insight, learning capacity, or the fictional step-change Limitless depicts, and it borrows from sleep if timed late in the day.</div>
    <div class="section"><h2>The acute stack, in order of evidence strength</h2><p class="small muted">Grade shown is the best acute grade on file for that ingredient; gate is the safety-review outcome. Full dosing, interaction and safety detail is on each ingredient's own page — this page is a summary, not a replacement for it.</p>${stack.map(card).join('')}</div>
    <div class="section prose"><h2>Why not more ingredients?</h2><p>Only ingredients with acute (same-day, single-dose) grade A or B human evidence for an actual cognitive-performance domain — not a biomarker or blood-flow surrogate — qualify for the stack above. 22 acute evidence rows across 11 ingredients met grade A/B with a benefit direction; most collapse into caffeine itself once the overlap is removed. The ones that didn't make the cut, and why:</p>
      <ul class="compact">${notStack.map(n => `<li>${monoLink(n.id)} — ${esc(n.why)}</li>`).join('')}</ul></div>
    <div class="section prose"><h2>What this stack will not do</h2><ul class="compact">
      <li>It will not help a sleep-deprived brain as much as sleep itself — caffeine's own monograph shows it only restores performance for 2–4 h and does not substitute for recovery sleep.</li>
      <li>It does nothing for learning, long-term memory formation, or exam-week cramming — those outcomes live under <a href="#longterm">Long-term cognitive function</a> and are driven by completely different, slower-acting evidence (sleep, exercise, omega-3 status, not an acute stack).</li>
      <li>It carries real costs if used daily and late: sleep debt, tolerance, and anxiety in sensitive users. See each ingredient's safety section and the <a href="#safety">safety review</a> before treating this as a routine.</li>
      <li>None of this is a medical claim, a diagnosis, or a substitute for clinical advice — see the <a href="#regulatory">regulatory &amp; claims</a> page for what can and cannot be said about any of it commercially.</li>
    </ul></div>`;
  }
  function viewLongterm() {
    const rows = ROWS.filter(r => r.timeframe !== 'acute');
    const mrows = []; MONOS.forEach(m => (m.longterm_matrix || []).forEach(r => mrows.push(Object.assign({ _m: m }, r))));
    const sy = SYN['longterm-synthesis'];
    return `<div class="page-head"><div><h1>Long-term cognitive function</h1><p class="lead">Interventions of two weeks to many years: memory, executive function, cognitive aging, decline and dementia-related outcomes. A biomarker change is not a cognitive benefit, and reducing a risk factor is not enhancement.</p></div></div>
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

  function viewIngredient(id) {
    const m = byId[id];
    if (!m) return `<h1>Not found</h1><p>No monograph with id <code>${esc(id)}</code>. <a href="#database">Back to the database</a>.</p>`;
    const d = m._derived, s = m.safety || {}, r = m.regulatory || {}, f = m.formulation || {}, sc = m.scores || {};
    const studies = m.studies || [];
    const sid = x => `<a href="#" class="ref" data-ref="${esc(x)}">${esc(x)}</a>`;
    const rowsT = (m.evidence_by_outcome || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Timeframe</th><th>Domain</th><th>Population</th><th>Dose / intake</th><th>Duration</th><th>Grade</th><th>Direction</th><th>Effect</th><th>Certainty (GRADE reasoning)</th><th>Key studies</th></tr></thead><tbody>${m.evidence_by_outcome.map(x => `<tr><td class="tight">${esc(lab(TF_LABEL, x.timeframe))}</td><td>${esc(lab(DOMAIN_LABEL, x.domain))}</td><td class="wrap">${esc(lab(POP_LABEL, x.population))}<br><small>${esc(x.population_detail)}</small></td><td class="wrap">${esc(x.dose_or_intake)}</td><td>${esc(x.duration)}</td><td>${grade(x.grade)}</td><td>${dir(x.direction)}</td><td class="wrap">${inline(x.effect_summary)}<br><small class="mono">${esc(x.effect_estimate)}</small></td><td class="wrap">${inline(x.certainty_notes)}</td><td>${(x.key_study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No outcome rows.</p>';
    const acuteT = (m.acute_matrix || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dose</th><th>Onset</th><th>Duration studied</th><th>Domain</th><th>Population</th><th>Effect estimate</th><th>Certainty</th><th>Safety</th><th>Studies</th></tr></thead><tbody>${m.acute_matrix.map(x => `<tr><td class="wrap">${esc(x.dose)}</td><td>${esc(x.onset)}</td><td>${esc(x.duration_studied)}</td><td>${esc(lab(DOMAIN_LABEL, x.domain) || x.domain)}</td><td class="wrap">${esc(x.population)}</td><td class="wrap">${inline(x.effect_estimate)}</td><td class="wrap">${inline(x.certainty)}</td><td class="wrap">${inline(x.safety)}</td><td>${(x.study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No acute matrix rows (not studied acutely or not applicable).</p>';
    const ltT = (m.longterm_matrix || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Duration</th><th>Population</th><th>Outcome</th><th>Effect estimate</th><th>Evidence quality</th><th>Limitations</th><th>Studies</th></tr></thead><tbody>${m.longterm_matrix.map(x => `<tr><td>${esc(x.duration)}</td><td class="wrap">${esc(x.population)}</td><td class="wrap">${esc(x.outcome)}</td><td class="wrap">${inline(x.effect_estimate)}</td><td class="wrap">${inline(x.evidence_quality)}</td><td class="wrap">${inline(x.limitations)}</td><td>${(x.study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No long-term matrix rows.</p>';
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
    const toc = ['conclusion', 'evidence', 'acute', 'longterm', 'mechanism', 'deficiency', 'marketing', 'safety', 'regulatory', 'formulation', 'scores', 'gaps', 'studies', 'search', 'review'];
    const tocLabel = { conclusion: 'Scientific conclusion', evidence: 'Evidence by outcome', acute: 'Acute matrix', longterm: 'Long-term matrix', mechanism: 'Mechanism map', deficiency: 'Deficiency vs enhancement', marketing: 'Marketing vs evidence', safety: 'Safety', regulatory: 'Regulatory', formulation: 'Formulation', scores: 'Scores', gaps: 'Research gaps', studies: 'Studies', search: 'Search log', review: 'Independent review' };
    return `<div class="two-col"><div>
    <div class="eyebrow"><a href="#database">Database</a> · Category ${esc(m.category)} · ${esc(m.category_name)}</div>
    <div class="mono-head"><div><h1>${esc(m.name)}</h1><p class="verdict">${esc(m.one_line_verdict)}</p></div>
      <div class="card" style="min-width:220px"><div class="eyebrow">Gates & scores</div><dl class="kv" style="font-size:.86rem"><dt>Safety gate</dt><dd>${gate(d.safety_gate)}</dd><dt>Regulatory gate</dt><dd>${gate(d.regulatory_gate)}</dd><dt>Eligibility</dt><dd><strong>${esc(d.eligibility)}</strong></dd><dt>Best acute</dt><dd>${grade(d.best_grade_acute)}</dd><dt>Best long-term</dt><dd>${grade(d.best_grade_chronic)}</dd><dt>Young adults (rested)</dt><dd>${grade(d.best_grade_young_adults)}</dd><dt>Sleep loss</dt><dd>${grade(d.best_grade_sleep_stress)}</dd><dt>Biomarkers only</dt><dd>${grade(d.best_grade_surrogate)}</dd><dt>Composite</dt><dd class="mono"><strong>${d.composite_score.toFixed(1)}</strong>/10</dd><dt>Studies</dt><dd class="mono">${d.n_verified} verified / ${d.n_studies}</dd><dt>Status</dt><dd>${d.review_status === 'reviewed' ? '<span class="badge pass">reviewed</span>' : '<span class="badge conditional">draft, unreviewed</span>'}</dd></dl></div></div>
    <dl class="kv"><dt>Also known as</dt><dd>${esc((m.aliases || []).join(', ') || '—')}</dd><dt>Food sources</dt><dd>${esc((m.food_sources || []).join(', ') || '—')}</dd><dt>Active constituents</dt><dd>${esc((m.active_constituents || []).join(', ') || '—')}</dd></dl>
    ${d.review_status !== 'reviewed' ? '<div class="callout">Draft. Written and self-audited by the research agent, and every cited study was matched to its PubMed or Crossref record. The independent second review (citation audit, null-trial hunt, grade check) has not run yet.</div>' : ''}
    <div class="section prose" id="conclusion"><h2>Scientific conclusion</h2>${md(m.scientific_conclusion)}</div>
    <div class="section" id="evidence"><h2>Evidence by outcome, population and timeframe</h2>${rowsT}</div>
    <div class="section" id="acute"><h2>Acute matrix</h2>${acuteT}</div>
    <div class="section" id="longterm"><h2>Long-term matrix</h2>${ltT}</div>
    <div class="section prose" id="mechanism"><h2>Mechanism map</h2>${md(m.mechanism && m.mechanism.summary)}<div class="pathway">${path}</div><p class="small">Pathways: ${esc((m.mechanism && m.mechanism.pathways || []).join(', '))}. A mechanism is not a substitute for a positive clinical trial.</p></div>
    <div class="section prose" id="deficiency"><h2>Deficiency correction vs enhancement</h2>${md(m.deficiency_vs_enhancement)}</div>
    <div class="section prose" id="marketing"><h2>Marketing claims vs evidence</h2>${md(m.marketing_vs_evidence)}</div>
    <div class="section prose" id="safety"><h2>Safety</h2>${md(s.summary)}<dl class="kv"><dt>Adverse effects</dt><dd>${fmtList(s.adverse_effects)}</dd><dt>Contraindications</dt><dd>${fmtList(s.contraindications)}</dd><dt>Drug interactions</dt><dd>${fmtList(s.drug_interactions)}</dd><dt>Upper limits</dt><dd>${inline(s.upper_limits)}</dd><dt>Sleep impact</dt><dd>${inline(s.sleep_impact)}</dd><dt>Long-term exposure</dt><dd>${inline(s.long_term_exposure_studied)}</dd><dt>Daily use appropriate</dt><dd>${esc(s.daily_use_appropriate)}</dd><dt>Special populations</dt><dd>${inline(s.special_populations)}</dd><dt>Specialist review</dt><dd>${esc((s.specialist_review_needed || []).join(', ') || 'none flagged')}</dd><dt>Hard safety gate</dt><dd>${gate(s.hard_safety_gate)} ${inline(s.gate_reason)}</dd></dl></div>
    <div class="section prose" id="regulatory"><h2>Regulatory status</h2><dl class="kv"><dt>European Union</dt><dd>${md(r.eu)}</dd><dt>United States</dt><dd>${md(r.us)}</dd><dt>Morocco</dt><dd>${md(r.morocco)}</dd><dt>Authorised claim examples</dt><dd>${fmtList(r.permitted_claims_examples)}</dd><dt>Novel food / NDI issues</dt><dd>${inline(r.novel_food_or_ndi_issues)}</dd><dt>Regulatory gate</dt><dd>${gate(r.regulatory_gate)}</dd></dl></div>
    <div class="section prose" id="formulation"><h2>Formulation and food suitability</h2><dl class="kv"><dt>Food suitability</dt><dd>${inline(f.food_suitability)}</dd><dt>Formats</dt><dd>${esc((f.formats || []).join(', ') || '—')}</dd><dt>Stability</dt><dd>${inline(f.stability)}</dd><dt>Taste</dt><dd>${inline(f.taste)}</dd><dt>Matrix / bioavailability</dt><dd>${inline(f.bioavailability_matrix)}</dd><dt>Dose feasibility</dt><dd>${inline(f.dose_feasibility)}</dd><dt>Cost and availability</dt><dd>${inline(f.cost_availability)}</dd><dt>Cost evidence</dt><dd>${inline(f.cost_evidence)}</dd></dl></div>
    <div class="section" id="scores"><h2>Scores (0–10, transparent heuristics)</h2><div class="scoregrid">${[['evidence_quality', 'Evidence quality (30%)'], ['effect_magnitude', 'Effect magnitude (20%)'], ['safety', 'Safety (20%)'], ['reproducibility', 'Reproducibility (10%)'], ['food_suitability', 'Food suitability (10%)'], ['cost_access', 'Cost / access (10%)']].map(([k, l]) => `<div><div class="lab">${l}</div>${bar(sc[k])}</div>`).join('')}</div><p class="small">${inline(sc.rationale)}</p></div>
    <div class="section prose" id="gaps"><h2>Research gaps</h2>${fmtList(m.research_gaps)}</div>
    <div class="section" id="studies"><h2>Studies (${studies.length})</h2><p class="small">Ordered: systematic reviews, supporting, mixed, null/negative, safety, mechanistic. Expand a study for the full extraction. Verification badges show whether the record was confirmed against PubMed or Crossref.</p>${sorted.map(studyCard).join('')}</div>
    <div class="section" id="search"><h2>Search log</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Database</th><th>Query</th><th>Date</th><th>Hits</th></tr></thead><tbody>${(m.search_log || []).map(q => `<tr><td>${esc(q.database)}</td><td class="wrap mono small">${esc(q.query)}</td><td>${esc(q.date)}</td><td class="num">${esc(q.hits)}</td></tr>`).join('')}</tbody></table></div><h3>Coverage notes</h3><div class="prose">${md(m.coverage_notes)}</div></div>
    <div id="review">${m._critique ? critiqueBlock(m._critique) : ''}</div>
    </div><aside><nav class="toc"><div class="eyebrow">On this page</div>${toc.map(t => `<a href="#ingredient.${esc(id)}" data-jump="${t}">${tocLabel[t]}</a>`).join('')}</nav></aside></div>`;
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
    if (!SEARCH_INDEX) SEARCH_INDEX = buildIndex();
    const terms = (q || '').toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (!terms.length) return '<h1>Search</h1><p class="muted">Type at least two letters in the search box.</p>';
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

  // ---------- navigation ----------
  const NAV = [
    ['Overview', [['home', 'Home'], ['pill', 'The Limitless Pill'], ['summary', 'Executive summary'], ['decisions', 'Decision framework'], ['methodology', 'Methodology']]],
    ['Evidence', [['database', 'Ingredient database', () => MONOS.length], ['matrix', 'Evidence matrix'], ['compare', 'Compare'], ['acute', 'Acute performance'], ['longterm', 'Long-term function'], ['populations', 'Populations'], ['combinations', 'Combinations'], ['rankings', 'Rankings'], ['myths', 'Myths vs evidence'], ['foundations', 'Foundations']]],
    ['Safety & rules', [['safety', 'Safety review'], ['regulatory', 'Regulatory & claims'], ['claims', 'Claims library']]],
    ['Company', [['competitors', 'Competitors'], ['products', 'Product concepts'], ['costs', 'Ingredient costs'], ['validation', 'Clinical roadmap'], ['instruments', 'Test instruments'], ['brand', 'Brand positioning']]],
    ['Reference', [['bibliography', 'Bibliography', () => BIB.length]]],
  ];
  const VIEWS = { home: viewHome, pill: viewPill, summary: viewSummary, decisions: viewDecisions, methodology: viewMethodology, database: viewDatabase, acute: viewAcute, longterm: viewLongterm, populations: viewPopulations, combinations: viewCombinations, rankings: viewRankings, myths: viewMyths, foundations: viewFoundations, safety: viewSafety, regulatory: viewRegulatory, competitors: viewCompetitors, products: viewProducts, costs: viewCosts, validation: viewValidation, instruments: viewInstruments, brand: viewBrand, bibliography: viewBibliography };
  // in-page router: the current view lives in CURRENT, so navigation works even where the host frame ignores hash changes
  let CURRENT = (location.hash || '#home').slice(1) || 'home';
  function route() { const h = CURRENT || 'home'; const i = h.indexOf('.'); return i < 0 ? { view: h, param: null } : { view: h.slice(0, i), param: decodeURIComponent(h.slice(i + 1)) }; }
  function go(h) { if (!h) return; CURRENT = h; try { history.replaceState(null, '', '#' + h); } catch (e) { /* sandboxed frame */ } window.__tblKeepScroll = false; _render(); }
  function renderNav() {
    const { view } = route();
    const nav = document.getElementById('nav');
    nav.innerHTML = `<div class="group">Find</div><label style="padding:0 .5rem"><input type="search" id="globalq" placeholder="ingredient, food…" style="width:100%;font:inherit;font-size:.9rem;padding:.35rem .5rem;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg);color:var(--fg)"></label>` +
      NAV.map(([g, items]) => `<div class="group">${g}</div>` + items.map(([k, l, cnt]) => `<a href="#${k}" class="${view === k || (view === 'ingredient' && k === 'database') ? 'active' : ''}">${l}${cnt ? `<span class="count">${cnt()}</span>` : ''}</a>`).join('')).join('') +
      `<div class="group">Display</div><button type="button" id="themeBtn" class="btn" style="margin:0 .5rem;text-align:left">Theme: ${THEME_LABEL[getTheme()]}</button>`;
    const tb = nav.querySelector('#themeBtn');
    if (tb) tb.addEventListener('click', () => { const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length]; try { localStorage.setItem('bf-theme', next); } catch (e) { /* storage blocked */ } applyTheme(next); renderNav(); });
    const q = nav.querySelector('#globalq');
    if (q) q.addEventListener('keydown', e => { if (e.key === 'Enter' && q.value.trim()) { go('search.' + encodeURIComponent(q.value.trim())); } });
  }
  function render() {
    const { view, param } = route();
    const app = document.getElementById('app');
    let html;
    try {
      if (view === 'ingredient') html = viewIngredient(param);
      else if (view === 'compare') html = viewCompare(param);
      else if (view === 'matrix') html = viewMatrix();
      else if (view === 'claims') html = viewClaims();
      else if (view === 'search') html = viewSearch(param);
      else if (VIEWS[view]) html = VIEWS[view]();
      else html = `<h1>Section not found</h1><p><a href="#home">Back home</a>.</p>`;
    } catch (e) { html = `<h1>Rendering error</h1><pre>${esc(e.stack || e)}</pre>`; console.error(e); }
    app.innerHTML = html + `<div class="footer-note">Brain Food Evidence Atlas · data built ${esc((META.generated_at || '').replace('T', ' ').slice(0, 16))} UTC · ${META.counts ? esc(META.counts.monographs) : 0} monographs · scores are decision-support heuristics, not validated measures · nothing here is medical advice or a product claim.</div>`;
    wireTables(app);
    [['mx-pop', 'pop'], ['mx-tf', 'tf'], ['mx-sort', 'sort']].forEach(([id, k]) => { const s = document.getElementById(id); if (s && s.addEventListener) s.addEventListener('change', () => { mst[k] = s.value; render(); }); });
    [0, 1, 2, 3].forEach(i => { const s = document.getElementById('cmp-' + i); if (s && s.addEventListener) s.addEventListener('change', () => { const next = CMP.slice(); if (s.value) next[i] = s.value; else next.splice(i, 1); go('compare.' + next.filter(Boolean).filter((v, j, a) => a.indexOf(v) === j).join(',')); }); });
    app.querySelectorAll('a.ref[data-ref]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = document.getElementById('study-' + a.dataset.ref); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
    app.querySelectorAll('.toc a[data-jump]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth' }); }));
    app.querySelectorAll('.tabs').forEach(tabs => tabs.querySelectorAll('button[data-tab]').forEach(b => b.addEventListener('click', () => { tabs.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); const pane = tabs.parentElement; pane.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.id !== b.dataset.tab; }); })));
    renderNav();
    document.getElementById('rail').classList.remove('open'); document.getElementById('scrim').hidden = true;
    if (!window.__tblKeepScroll) window.scrollTo(0, 0);
    window.__tblKeepScroll = false;
  }
  const _render = render;
  render = function () { window.__tblKeepScroll = true; const y = window.scrollY; _render(); window.scrollTo(0, y); };
  window.addEventListener('hashchange', () => { const h = (location.hash || '#home').slice(1) || 'home'; if (h !== CURRENT) { CURRENT = h; window.__tblKeepScroll = false; _render(); } });
  document.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || a.classList.contains('ref') || a.dataset.jump) return;
    const h = a.getAttribute('href').slice(1);
    if (!h) return;
    e.preventDefault();
    go(h);
  });
  document.getElementById('menuBtn').addEventListener('click', () => { const r = document.getElementById('rail'); r.classList.toggle('open'); document.getElementById('scrim').hidden = !r.classList.contains('open'); });
  document.getElementById('scrim').addEventListener('click', () => { document.getElementById('rail').classList.remove('open'); document.getElementById('scrim').hidden = true; });
  if (!MONOS.length) document.getElementById('app').innerHTML = '<div class="pending">No data files found. Run <code>python -I tools/build_data.py</code> to generate <code>app/data/*.js</code>, then reload.</div>';
  _render();
  // offline support on the standalone website only (the page links a manifest there; file:// and embedded copies skip this)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable; the site still works online */ });
  }
})();
