/* CustHome — positioned tile grid editor with auto-save (pointer events: mouse + touch) */
function custhomeInit() {
	'use strict';

	var root = document.getElementById('custhome');
	if (!root) return;

	var grid = document.getElementById('custhome-grid');
	var canEdit = root.getAttribute('data-canedit') === '1';
	var ajaxUrl = root.getAttribute('data-ajax');
	var token = root.getAttribute('data-token');
	var COLS = Math.max(1, +root.getAttribute('data-columns') || 4);
	var MAXH = 4;
	var L = window.CUSTHOME_LANG || {};
	var tiles = Array.isArray(window.CUSTHOME_TILES) ? window.CUSTHOME_TILES : [];
	var urlroot = window.CUSTHOME_URLROOT || '';
	var editing = false;
	var current = null;
	var saveTimer = null;
	var ICONS = ['home','th-large','star','heart','bolt','bell','bookmark','flag','tag','tags','link','external-link-alt','search','plus','check','times','cog','cogs','tools','wrench','sliders-h','user','users','user-tie','user-friends','address-book','address-card','id-card','building','industry','store','warehouse','handshake','briefcase','suitcase','box','boxes','cube','cubes','barcode','qrcode','shopping-cart','shopping-bag','cart-plus','truck','shipping-fast','dolly','pallet','file','file-alt','file-invoice','file-invoice-dollar','file-contract','file-signature','file-pdf','file-excel','file-csv','file-import','file-export','folder','folder-open','copy','paste','clipboard','clipboard-list','clipboard-check','list','list-ul','list-ol','tasks','check-square','calendar','calendar-alt','calendar-check','calendar-plus','clock','history','hourglass-half','stopwatch','chart-bar','chart-line','chart-pie','chart-area','table','th','th-list','columns','tachometer-alt','dollar-sign','euro-sign','coins','money-bill','money-bill-wave','money-check-alt','credit-card','wallet','piggy-bank','receipt','cash-register','balance-scale','percent','calculator','university','landmark','hand-holding-usd','envelope','envelope-open','paper-plane','inbox','comments','comment','comment-dots','phone','phone-alt','mobile-alt','fax','headset','bullhorn','rss','globe','globe-europe','map-marker-alt','map','compass','route','plane','car','bicycle','ship','project-diagram','sitemap','network-wired','server','database','cloud','cloud-upload-alt','cloud-download-alt','download','upload','sync','sync-alt','redo','undo','exchange-alt','random','code','code-branch','terminal','laptop','laptop-code','desktop','tablet-alt','print','camera','image','images','video','music','microphone','play','pause','stop','lock','unlock','key','shield-alt','user-shield','user-lock','eye','eye-slash','lightbulb','magic','rocket','paint-brush','palette','pen','pencil-alt','edit','highlighter','trash','trash-alt','archive','book','book-open','graduation-cap','chalkboard-teacher','newspaper','info-circle','question-circle','exclamation-triangle','exclamation-circle','life-ring','medkit','first-aid','stethoscope','hospital','heartbeat','seedling','leaf','tree','sun','moon','umbrella','fire','snowflake','thermometer-half','bed','couch','utensils','coffee','birthday-cake','gift','trophy','award','medal','crown','gem','smile','thumbs-up','thumbs-down','hands-helping','hand-point-right','sign-in-alt','sign-out-alt','power-off','cut','paperclip','puzzle-piece','layer-group','filter','sort','arrows-alt','expand','compress','bars','ellipsis-h','hashtag','at','asterisk','ban','recycle','gavel','passport','ticket-alt','industry','hard-hat','hammer','screwdriver','toolbox','plug','battery-half','wifi','satellite-dish','robot','microchip','wine-bottle','beer','pizza-slice','shopping-basket','tshirt','shoe-prints','dog','cat','paw','horse','fish'];
	var PRESETS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#d97706', '#059669', '#0891b2', '#475569', '#1f2937', '#dc2626', '#65a30d', '#0ea5e9'];

	/* ---------- helpers ---------- */
	function esc(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function href(u) {
		if (!u) return '#';
		if (/^https?:\/\//i.test(u)) return u;
		return urlroot + u;
	}
	function iconClass(ic) {
		ic = (ic || 'fa-link').trim();
		if (/^fa[brs]? /.test(ic)) return ic;
		return 'fa ' + ic;
	}
	function dims(t) {
		var m = /^(\d+)x(\d+)$/.exec(t.size || '');
		var w = m ? Math.max(1, +m[1]) : 1, h = m ? Math.max(1, +m[2]) : 1;
		return { w: Math.min(w, COLS), h: Math.min(h, MAXH) };
	}
	function rect(t) { var d = dims(t); return { x: +t.x || 0, y: +t.y || 0, w: d.w, h: d.h }; }
	function overlaps(a, b) {
		return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
	}
	function isFree(r, skipIdx) {
		if (r.x < 1 || r.y < 1 || r.x + r.w - 1 > COLS) return false;
		for (var i = 0; i < tiles.length; i++) {
			if (i === skipIdx) continue;
			if (overlaps(r, rect(tiles[i]))) return false;
		}
		return true;
	}
	function maxRow() {
		var m = 0;
		tiles.forEach(function (t) { var r = rect(t); m = Math.max(m, r.y + r.h - 1); });
		return m;
	}
	// Legacy tiles without position: first-fit placement
	function placeUnpositioned() {
		var changed = false;
		tiles.forEach(function (t, i) {
			if (+t.x >= 1 && +t.y >= 1) return;
			var d = dims(t);
			for (var y = 1; y < 200; y++) {
				for (var x = 1; x <= COLS - d.w + 1; x++) {
					if (isFree({ x: x, y: y, w: d.w, h: d.h }, i)) { t.x = x; t.y = y; changed = true; return; }
				}
			}
		});
		return changed;
	}

	/* ---------- square cells: row height = column width ---------- */
	function syncRowHeight() {
		var gs = getComputedStyle(grid);
		var gap = parseFloat(gs.columnGap) || 14;
		var cols = COLS;
		var ncols = gs.gridTemplateColumns.split(' ').length; // resolved track list
		if (ncols >= 1) cols = ncols;
		var w = (grid.clientWidth - gap * (cols - 1)) / cols;
		if (w > 0) grid.style.setProperty('--ch-row', Math.round(w) + 'px');
	}
	window.addEventListener('resize', syncRowHeight);

	/* ---------- geometry of the grid ---------- */
	function metrics() {
		var gs = getComputedStyle(grid);
		var gap = parseFloat(gs.columnGap) || 14;
		var gr = grid.getBoundingClientRect();
		return { gap: gap, left: gr.left, top: gr.top, cellW: (grid.clientWidth - gap * (COLS - 1)) / COLS, cellH: parseFloat(gs.gridAutoRows) || 120 };
	}
	function cellAt(m, clientX, clientY) {
		return {
			x: Math.floor((clientX - m.left + m.gap / 2) / (m.cellW + m.gap)) + 1,
			y: Math.floor((clientY - m.top + m.gap / 2) / (m.cellH + m.gap)) + 1
		};
	}
	function place(el, r) {
		el.style.gridColumn = r.x + ' / span ' + r.w;
		el.style.gridRow = r.y + ' / span ' + r.h;
	}

	/* ---------- render ---------- */
	function render() {
		grid.innerHTML = '';
		var rows = maxRow();
		if (editing) {
			// empty slots so the user sees the grid (one extra row to drop into)
			var occ = {};
			tiles.forEach(function (t) { var r = rect(t); for (var y = r.y; y < r.y + r.h; y++) for (var x = r.x; x < r.x + r.w; x++) occ[x + ',' + y] = 1; });
			for (var y = 1; y <= rows + 1; y++) {
				for (var x = 1; x <= COLS; x++) {
					if (occ[x + ',' + y]) continue;
					var sl = document.createElement('div');
					sl.className = 'custhome-slot';
					place(sl, { x: x, y: y, w: 1, h: 1 });
					grid.appendChild(sl);
				}
			}
		}
		tiles.forEach(function (t, i) {
			var r = rect(t);
			var a = document.createElement('a');
			a.className = 'custhome-tile' + ((r.w > 1 && r.h > 1) ? ' big' : '');
			a.style.setProperty('--w', r.w);
			a.style.setProperty('--h', r.h);
			place(a, r);
			a.style.background = t.bg || '#2563eb';
			a.style.color = t.fg || '#fff';
			a.href = href(t.url);
			a.draggable = false;
			if (t.target === '_blank') { a.target = '_blank'; a.rel = 'noopener'; }
			a.setAttribute('data-idx', i);
			a.innerHTML =
				'<span class="custhome-ico ' + esc(iconClass(t.icon)) + '"></span>' +
				'<span class="custhome-ico-bg ' + esc(iconClass(t.icon)) + '"></span>' +
				(canEdit ? '<button type="button" class="custhome-edit" title="Edit"><span class="fa fa-pen"></span></button><button type="button" class="custhome-del" title="Delete"><span class="fa fa-trash"></span></button><span class="custhome-resize" title="Resize"></span>' : '') +
				'<span class="custhome-title">' + esc(t.title || L.newtile || 'Tile') + '</span>' +
				(t.subtitle ? '<span class="custhome-sub">' + esc(t.subtitle) + '</span>' : '');
			if (canEdit) {
				a.addEventListener('click', function (e) { if (editing) e.preventDefault(); });
				a.querySelector('.custhome-edit').addEventListener('click', function (e) {
					e.preventDefault(); e.stopPropagation(); openPanel(i);
				});
				a.querySelector('.custhome-del').addEventListener('click', function (e) {
					e.preventDefault(); e.stopPropagation(); deleteTile(i);
				});
				setupMove(a, i);
				setupResize(a, i);
			}
			grid.appendChild(a);
		});
	}

	/* ---------- auto-save ---------- */
	function setStatus(msg, err) {
		var el = document.getElementById('custhome-status');
		if (!el) return;
		el.textContent = msg || '';
		el.className = 'custhome-status' + (err ? ' err' : '');
	}
	function scheduleSave() {
		clearTimeout(saveTimer);
		setStatus(L.saving || 'Saving…');
		saveTimer = setTimeout(save, 500);
	}
	function save() {
		var xhr = new XMLHttpRequest();
		xhr.open('POST', ajaxUrl + (ajaxUrl.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token), true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onload = function () {
			var ok = false;
			try { ok = xhr.status === 200 && JSON.parse(xhr.responseText).ok; } catch (e) { ok = false; }
			setStatus(ok ? (L.saved || 'Saved') : (L.error || 'Save error'), !ok);
			if (ok) setTimeout(function () { setStatus(''); }, 2000);
		};
		xhr.onerror = function () { setStatus(L.error || 'Save error', true); };
		xhr.send(JSON.stringify({ tiles: tiles }));
	}

	/* ---------- ghost (drop target preview) ---------- */
	var ghost = null;
	function showGhost(r, ok) {
		if (!ghost) { ghost = document.createElement('div'); ghost.className = 'custhome-ghost'; grid.appendChild(ghost); }
		place(ghost, r);
		ghost.classList.toggle('bad', !ok);
	}
	function hideGhost() { if (ghost) { ghost.remove(); ghost = null; } }

	/* ---------- move by dragging (pointer events) ---------- */
	function setupMove(el, idx) {
		el.addEventListener('pointerdown', function (e) {
			if (!editing || e.button !== 0) return;
			if (e.target.closest('.custhome-resize, .custhome-edit, .custhome-del')) return;
			e.preventDefault();
			var m = metrics();
			var start = rect(tiles[idx]);
			var sx = e.clientX, sy = e.clientY;
			var offX = e.clientX - el.getBoundingClientRect().left, offY = e.clientY - el.getBoundingClientRect().top;
			var moved = false, target = null;
			el.setPointerCapture(e.pointerId);
			function onMove(ev) {
				if (!moved && Math.abs(ev.clientX - sx) < 6 && Math.abs(ev.clientY - sy) < 6) return;
				if (!moved) { moved = true; el.classList.add('dragging'); }
				var c = cellAt(m, ev.clientX - offX + m.cellW / 2, ev.clientY - offY + m.cellH / 2);
				target = { x: Math.min(Math.max(1, c.x), COLS - start.w + 1), y: Math.max(1, c.y), w: start.w, h: start.h };
				showGhost(target, isFree(target, idx));
				el.style.transform = 'translate(' + (ev.clientX - sx) + 'px,' + (ev.clientY - sy) + 'px)';
			}
			function onUp() {
				el.removeEventListener('pointermove', onMove);
				el.removeEventListener('pointerup', onUp);
				el.removeEventListener('pointercancel', onUp);
				el.classList.remove('dragging');
				el.style.transform = '';
				hideGhost();
				if (!moved) { openPanel(idx); return; }
				if (target && isFree(target, idx) && (target.x !== start.x || target.y !== start.y)) {
					tiles[idx].x = target.x; tiles[idx].y = target.y;
					scheduleSave();
				}
				render();
			}
			el.addEventListener('pointermove', onMove);
			el.addEventListener('pointerup', onUp);
			el.addEventListener('pointercancel', onUp);
		});
	}

	/* ---------- resize by dragging the corner handle ---------- */
	function setupResize(el, idx) {
		var h = el.querySelector('.custhome-resize');
		if (!h) return;
		h.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
		h.addEventListener('pointerdown', function (e) {
			if (!editing) return;
			e.preventDefault(); e.stopPropagation();
			var m = metrics();
			var r0 = el.getBoundingClientRect();
			var start = rect(tiles[idx]);
			var target = null;
			el.classList.add('resizing');
			h.setPointerCapture(e.pointerId);
			function onMove(ev) {
				var w = Math.round((ev.clientX - r0.left + m.gap / 2) / (m.cellW + m.gap));
				var hh = Math.round((ev.clientY - r0.top + m.gap / 2) / (m.cellH + m.gap));
				w = Math.min(COLS - start.x + 1, Math.max(1, w)); hh = Math.min(MAXH, Math.max(1, hh));
				target = { x: start.x, y: start.y, w: w, h: hh };
				var ok = isFree(target, idx);
				place(el, target);
				el.classList.toggle('resizing-bad', !ok);
			}
			function onUp() {
				h.removeEventListener('pointermove', onMove);
				h.removeEventListener('pointerup', onUp);
				h.removeEventListener('pointercancel', onUp);
				el.classList.remove('resizing', 'resizing-bad');
				if (target && isFree(target, idx) && (target.w !== start.w || target.h !== start.h)) {
					tiles[idx].size = target.w + 'x' + target.h;
					scheduleSave();
				}
				render();
			}
			h.addEventListener('pointermove', onMove);
			h.addEventListener('pointerup', onUp);
			h.addEventListener('pointercancel', onUp);
		});
	}

	function deleteTile(i) {
		if (!confirm(L.confirmdelete || 'Delete this tile?')) return;
		tiles.splice(i, 1);
		closePanel(); render(); scheduleSave();
	}

	/* ---------- edit mode ---------- */
	function setEditing(on) {
		editing = on;
		root.classList.toggle('editing', editing);
		var b = document.getElementById('custhome-toggle-edit');
		if (b) b.innerHTML = '<span class="fa ' + (editing ? 'fa-check' : 'fa-pen') + '"></span> ' + (editing ? (L.done || 'OK') : b.getAttribute('data-label'));
		if (!editing) closePanel();
		render();
	}

	/* ---------- side panel ---------- */
	var panel = document.getElementById('custhome-panel');
	function field(name) { return panel ? panel.querySelector('[data-field="' + name + '"]') : null; }
	function openPanel(i) {
		current = i;
		var t = tiles[i];
		field('title').value = t.title || '';
		field('subtitle').value = t.subtitle || '';
		field('url').value = t.url || '';
		field('urlpick').value = t.url || '';
		if (field('urlpick').value !== (t.url || '')) field('urlpick').value = '';
		field('target').checked = t.target === '_blank';
		field('icon').value = t.icon || 'fa-link';
		field('bg').value = t.bg || '#2563eb';
		field('fg').value = t.fg || '#ffffff';
		panel.hidden = false;
		if (typeof updateIconPreview === 'function') { iconSearch.value = ''; renderIcons(''); updateIconPreview(); }
		requestAnimationFrame(function () { panel.classList.add('open'); });
		field('title').focus();
	}
	function closePanel() {
		if (!panel || panel.hidden) return;
		panel.classList.remove('open');
		current = null;
		setTimeout(function () { if (!panel.classList.contains('open')) panel.hidden = true; }, 260);
	}
	function readPanel() {
		if (current === null) return;
		var t = tiles[current];
		t.title = field('title').value;
		t.subtitle = field('subtitle').value;
		t.url = field('url').value.trim();
		t.target = field('target').checked ? '_blank' : '';
		t.icon = field('icon').value.trim() || 'fa-link';
		t.bg = field('bg').value;
		t.fg = field('fg').value;
		render(); scheduleSave();
	}

	if (canEdit && panel) {
		var tb = document.getElementById('custhome-toggle-edit');
		tb.setAttribute('data-label', tb.textContent.trim());
		tb.addEventListener('click', function () { setEditing(!editing); });

		document.getElementById('custhome-add').addEventListener('click', function () {
			var t = { id: Math.random().toString(36).slice(2, 12), title: L.newtile || 'New tile', subtitle: '', icon: 'fa-star', bg: PRESETS[tiles.length % PRESETS.length], fg: '#ffffff', size: '1x1', url: '', target: '', x: 0, y: 0 };
			tiles.push(t);
			placeUnpositioned();
			if (!editing) setEditing(true); else render();
			scheduleSave();
			openPanel(tiles.length - 1);
		});

		document.getElementById('custhome-panel-close').addEventListener('click', closePanel);
		document.getElementById('custhome-delete').addEventListener('click', function () {
			if (current !== null) deleteTile(current);
		});

		['title', 'subtitle', 'url', 'icon', 'bg', 'fg', 'target'].forEach(function (n) {
			var f = field(n);
			f.addEventListener('input', readPanel);
			f.addEventListener('change', readPanel);
		});
		field('urlpick').addEventListener('change', function () {
			if (this.value) {
				field('url').value = this.value;
				var opt = this.options[this.selectedIndex];
				var tt = field('title');
				if (!tt.value || tt.value === (L.newtile || 'New tile')) tt.value = opt.textContent.replace(/^(—\s*)+/, '').replace(/^.*\/\s*/, '').replace(/\.php$/, '');
				readPanel();
			}
		});

		var iconsBox = document.getElementById('custhome-icons');
		var iconSearch = document.getElementById('custhome-iconsearch');
		var preview = document.getElementById('custhome-iconpreview');
		function updateIconPreview() {
			var ic = field('icon').value.trim() || 'fa-link';
			preview.innerHTML = '<span class="' + esc(iconClass(ic)) + '"></span>';
			preview.style.background = field('bg').value;
			preview.style.color = field('fg').value;
			iconsBox.querySelectorAll('span.sel').forEach(function (n) { n.classList.remove('sel'); });
			var cur = iconsBox.querySelector('[data-icon="' + ic.replace(/^fa[brs]? /, '') + '"]');
			if (cur) cur.classList.add('sel');
		}
		function renderIcons(filter) {
			filter = (filter || '').toLowerCase().replace(/^fa-/, '');
			iconsBox.innerHTML = '';
			ICONS.forEach(function (name) {
				if (filter && name.indexOf(filter) < 0) return;
				var sp = document.createElement('span');
				sp.setAttribute('data-icon', 'fa-' + name);
				sp.title = 'fa-' + name;
				sp.innerHTML = '<span class="fa fa-' + name + '"></span>';
				sp.addEventListener('click', function () { field('icon').value = 'fa-' + name; readPanel(); updateIconPreview(); });
				iconsBox.appendChild(sp);
			});
		}
		iconSearch.addEventListener('input', function () { renderIcons(this.value); updateIconPreview(); });
		['icon', 'bg', 'fg'].forEach(function (n) { field(n).addEventListener('input', updateIconPreview); });
		renderIcons('');

		var pr = document.getElementById('custhome-presets');
		PRESETS.forEach(function (c) {
			var s = document.createElement('span');
			s.style.background = c; s.title = c;
			s.addEventListener('click', function () { field('bg').value = c; readPanel(); updateIconPreview(); });
			pr.appendChild(s);
		});

		document.addEventListener('keydown', function (e) {
			if (e.key !== 'Escape') return;
			if (!panel.hidden) closePanel(); else if (editing) setEditing(false);
		});
		// Click in the void: close the panel and leave edit mode
		document.addEventListener('pointerdown', function (e) {
			if (!editing) return;
			if (panel.contains(e.target)) return;
			if (e.target.closest && e.target.closest('.custhome-tile, .custhome-actions')) return;
			setEditing(false);
		});
	}

	syncRowHeight();
	if (placeUnpositioned() && canEdit) scheduleSave();
	render();
}
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', custhomeInit);
} else {
	custhomeInit();
}
