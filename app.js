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
  const TF_SHORT = { acute: 'Today', short_term_days: 'Days', chronic: 'Long-term' };
  const EV_LABEL = { established_human: 'Established in humans', limited_human: 'Limited human data', animal: 'Mainly animal research', plausible: 'Mechanistically plausible', speculative: 'Speculative' };
  const byId = {};
  MONOS.forEach(m => { byId[m.id] = m; });

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lab = (map, k) => map[k] || (k ? String(k).replace(/_/g, ' ') : '—');
  const grade = g => g ? `<span class="badge grade-${esc(g)}" title="${esc(GRADE_LABEL[g] || '')}">${esc(g)}</span>` : '<span class="badge neutral">n/a</span>';
  const gate = g => `<span class="badge ${esc(g || 'unknown')}">${esc(g || 'unknown')}</span>`;
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
    <div class="section prose"><h2>How to read this atlas</h2><ul><li><strong>Grades are per outcome, population and timeframe.</strong> An ingredient can be A for acute alertness and D for memory.</li><li><strong>Every evidence row carries a timeframe badge:</strong> ${tf('acute')} a single dose, tested the same day · ${tf('short_term_days')} 2–13 days of use · ${tf('chronic')} 2 weeks or longer. Benefits in deficient people are reported separately from enhancement in well-nourished people.</li><li><strong>Verification.</strong> Each study was checked against PubMed or Crossref. Unverified items stay visible but carry no weight.</li><li><strong>Gates.</strong> A safety or regulatory gate failure makes an ingredient ineligible for product development regardless of its score.</li></ul></div>`;
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
        <div class="rc-head" style="margin-bottom:.15rem"><div><h3 style="margin:0 0 .15rem">${monoLink(s.id)}</h3><p class="small mono" style="margin:0">${esc(s.dose)}</p></div>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">${tf('acute')}${grade(d.best_grade_acute)}${gate(d.safety_gate)}</div></div>
        <p class="small muted" style="margin:.3rem 0 .7rem">${esc(s.timing)}</p>
        <p>${esc(s.what)}</p>${s.rescue ? `<p><strong>Sleep-deprivation rescue:</strong> ${esc(s.rescue)}</p>` : ''}
        ${catchBox(s.catch_, 'small')}
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
    <div class="section" id="recipes"><h2>Three recipes, one per timeframe</h2><p class="small muted">Same evidence base as the rest of this page, turned into something you'd actually make: a drink for today, a short protocol for a demanding week, and a daily pattern for the years that actually move long-term cognitive outcomes. Grades and the honest catch are per recipe below.</p>
      <div class="recipe-grid">${recipes.map(recipeCard).join('')}</div></div>
    <div class="section" id="stack-section"><h2>The acute stack, in order of evidence strength</h2><p class="small muted">Grade shown is the best acute grade on file for that ingredient; gate is the safety-review outcome. Full dosing, interaction and safety detail is on each ingredient's own page — this page is a summary, not a replacement for it.</p>
      <div class="stack-grid">${stack.map((s, i) => card(s, i + 1)).join('')}</div></div>
    <div class="section"><h2>Why not more ingredients?</h2><div class="prose"><p>Only ingredients with acute (same-day, single-dose) grade A or B human evidence for an actual cognitive-performance domain — not a biomarker or blood-flow surrogate — qualify for the stack above. 22 acute evidence rows across 11 ingredients met grade A/B with a benefit direction; most collapse into caffeine itself once the overlap is removed. The ones that didn't make the cut, and why:</p></div>
      <div class="exclusion-grid">${notStack.map(n => `<div class="exclusion-card"><div class="ex-head">${ICON.x}${monoLink(n.id)}</div><p>${esc(n.why)}</p></div>`).join('')}</div></div>
    <div class="section prose"><h2>What this stack will not do</h2><ul class="boundary-list">${boundaries.map(b => `<li>${ICON.dot}<span>${b}</span></li>`).join('')}</ul></div>
    </div>`;
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
    else if (op === 'done') { if (!(pst.a.flags || []).length) pst.a.flags = ['none']; pSave(); go('profile.' + pEncode(pst.a)); }
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
      <div class="pf-result-hero"><div class="eyebrow">Your profile type</div><h1>${esc(r.T[0])}</h1><p class="pf-tag">${esc(r.T[1])}</p>
        <div class="pf-chips">${chips.map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div>
        <div class="pf-actions"><button type="button" class="btn" data-pq="reset">Retake the questions</button><button type="button" class="btn" data-pq="print">Print or save as PDF</button><span class="small muted">Bookmark this page to keep your result.</span></div></div>
      ${r.warn.length ? `<div class="pf-warn"><strong>Before anything else</strong><ul>${r.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
      <div class="pf-grid">
        ${quad('k-pill now', PI.pill, 'Best pill · short term', 'acute', r.pillNow)}
        ${quad('k-pill long', PI.pill, 'Best pill · long term', 'chronic', r.pillLong)}
        ${quad('k-act now', PI.act, 'Best non-pill action · short term', 'acute', r.actNow)}
        ${quad('k-act long', PI.act, 'Best non-pill action · long term', 'chronic', r.actLong)}
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
    const item = r => `<li class="gl-item"><div class="gl-top">${monoLink(r._m.id)}<span class="gl-badges">${grade(r.grade)}${tf(r.timeframe)}</span></div>
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

  function viewIngredient(id) {
    const m = byId[id];
    if (!m) return `<h1>Not found</h1><p>No monograph with id <code>${esc(id)}</code>. <a href="#database">Back to the database</a>.</p>`;
    const d = m._derived, s = m.safety || {}, r = m.regulatory || {}, f = m.formulation || {}, sc = m.scores || {};
    const studies = m.studies || [];
    const sid = x => `<a href="#" class="ref" data-ref="${esc(x)}">${esc(x)}</a>`;
    const rowsT = (m.evidence_by_outcome || []).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Timeframe</th><th>Domain</th><th>Population</th><th>Dose / intake</th><th>Duration</th><th>Grade</th><th>Direction</th><th>Effect</th><th>Certainty (GRADE reasoning)</th><th>Key studies</th></tr></thead><tbody>${m.evidence_by_outcome.map(x => `<tr><td class="tight">${tf(x.timeframe)}</td><td>${esc(lab(DOMAIN_LABEL, x.domain))}</td><td class="wrap">${esc(lab(POP_LABEL, x.population))}<br><small>${esc(x.population_detail)}</small></td><td class="wrap">${esc(x.dose_or_intake)}</td><td>${esc(x.duration)}</td><td>${grade(x.grade)}</td><td>${dir(x.direction)}</td><td class="wrap">${inline(x.effect_summary)}<br><small class="mono">${esc(x.effect_estimate)}</small></td><td class="wrap">${inline(x.certainty_notes)}</td><td>${(x.key_study_ids || []).map(sid).join(', ')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No outcome rows.</p>';
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
    ['Overview', [['home', 'Home'], ['pill', 'The Limitless Pill'], ['goals', 'Best by cognitive goal'], ['profile', 'Your profile type'], ['summary', 'Executive summary'], ['decisions', 'Decision framework'], ['methodology', 'Methodology']]],
    ['Evidence', [['database', 'Ingredient database', () => MONOS.length], ['matrix', 'Evidence matrix'], ['compare', 'Compare'], ['acute', 'Acute performance'], ['longterm', 'Long-term function'], ['populations', 'Populations'], ['combinations', 'Combinations'], ['rankings', 'Rankings'], ['myths', 'Myths vs evidence'], ['foundations', 'Foundations']]],
    ['Safety & rules', [['safety', 'Safety review'], ['regulatory', 'Regulatory & claims'], ['claims', 'Claims library']]],
    ['Company', [['competitors', 'Competitors'], ['products', 'Product concepts'], ['costs', 'Ingredient costs'], ['validation', 'Clinical roadmap'], ['instruments', 'Test instruments'], ['brand', 'Brand positioning']]],
    ['Reference', [['bibliography', 'Bibliography', () => BIB.length]]],
  ];
  const VIEWS = { home: viewHome, pill: viewPill, nzt48: viewNZT48, goals: viewGoals, summary: viewSummary, decisions: viewDecisions, methodology: viewMethodology, database: viewDatabase, acute: viewAcute, longterm: viewLongterm, populations: viewPopulations, combinations: viewCombinations, rankings: viewRankings, myths: viewMyths, foundations: viewFoundations, safety: viewSafety, regulatory: viewRegulatory, competitors: viewCompetitors, products: viewProducts, costs: viewCosts, validation: viewValidation, instruments: viewInstruments, brand: viewBrand, bibliography: viewBibliography };
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
      else if (view === 'profile') html = viewProfile(param);
      else if (VIEWS[view]) html = VIEWS[view]();
      else html = `<h1>Section not found</h1><p><a href="#home">Back home</a>.</p>`;
    } catch (e) { html = `<h1>Rendering error</h1><pre>${esc(e.stack || e)}</pre>`; console.error(e); }
    document.body.classList.toggle('nzt-takeover', view === 'nzt48');
    app.innerHTML = view === 'nzt48' ? html : html + `<div class="footer-note">Brain Food Evidence Atlas · data built ${esc((META.generated_at || '').replace('T', ' ').slice(0, 16))} UTC · ${META.counts ? esc(META.counts.monographs) : 0} monographs · scores are decision-support heuristics, not validated measures · nothing here is medical advice or a product claim.</div>`;
    if (view === 'nzt48') initNZT(app);
    wireTables(app);
    [['mx-pop', 'pop'], ['mx-tf', 'tf'], ['mx-sort', 'sort']].forEach(([id, k]) => { const s = document.getElementById(id); if (s && s.addEventListener) s.addEventListener('change', () => { mst[k] = s.value; render(); }); });
    app.querySelectorAll('[data-pq]').forEach(b => b.addEventListener('click', () => profileAction(b.dataset.pq)));
    { const gp = document.getElementById('goal-pop'); if (gp && gp.addEventListener) gp.addEventListener('change', () => { gst.pop = gp.value; render(); }); }
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nzt-takeover')) location.hash = '#pill'; });
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
