/* CustHome — tile grid editor with auto-save */
function custhomeInit() {
	'use strict';

	var root = document.getElementById('custhome');
	if (!root) return;

	var grid = document.getElementById('custhome-grid');
	var canEdit = root.getAttribute('data-canedit') === '1';
	var ajaxUrl = root.getAttribute('data-ajax');
	var token = root.getAttribute('data-token');
	var L = window.CUSTHOME_LANG || {};
	var tiles = Array.isArray(window.CUSTHOME_TILES) ? window.CUSTHOME_TILES : [];
	var urlroot = window.CUSTHOME_URLROOT || '';
	var editing = false;
	var current = null; // tile being edited
	var saveTimer = null;
	var PRESETS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#d97706', '#059669', '#0891b2', '#475569', '#1f2937', '#dc2626', '#65a30d', '#0ea5e9'];

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

	function render() {
		grid.innerHTML = '';
		tiles.forEach(function (t, i) {
			var a = document.createElement('a');
			a.className = 'custhome-tile s-' + (t.size || '1x1');
			a.style.background = t.bg || '#2563eb';
			a.style.color = t.fg || '#fff';
			a.href = href(t.url);
			if (t.target === '_blank') { a.target = '_blank'; a.rel = 'noopener'; }
			a.setAttribute('data-idx', i);
			a.innerHTML =
				'<span class="custhome-ico ' + esc(iconClass(t.icon)) + '"></span>' +
				'<span class="custhome-ico-bg ' + esc(iconClass(t.icon)) + '"></span>' +
				(canEdit ? '<button type="button" class="custhome-edit" title="Edit"><span class="fa fa-pen"></span></button>' : '') +
				'<span class="custhome-title">' + esc(t.title || L.newtile || 'Tile') + '</span>' +
				(t.subtitle ? '<span class="custhome-sub">' + esc(t.subtitle) + '</span>' : '');
			if (canEdit) {
				a.draggable = false;
				a.addEventListener('click', function (e) {
					if (!editing) return;
					e.preventDefault();
					openPanel(i);
				});
				a.querySelector('.custhome-edit').addEventListener('click', function (e) {
					e.preventDefault(); e.stopPropagation();
					openPanel(i);
				});
				setupDrag(a);
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

	/* ---------- drag & drop reorder ---------- */
	var dragIdx = null;
	function setupDrag(el) {
		el.addEventListener('dragstart', function (e) {
			if (!editing) { e.preventDefault(); return; }
			dragIdx = +el.getAttribute('data-idx');
			el.classList.add('dragging');
			e.dataTransfer.effectAllowed = 'move';
			try { e.dataTransfer.setData('text/plain', String(dragIdx)); } catch (x) {}
		});
		el.addEventListener('dragend', function () { el.classList.remove('dragging'); clearOver(); });
		el.addEventListener('dragover', function (e) { if (!editing || dragIdx === null) return; e.preventDefault(); el.classList.add('dragover'); });
		el.addEventListener('dragleave', function () { el.classList.remove('dragover'); });
		el.addEventListener('drop', function (e) {
			if (!editing || dragIdx === null) return;
			e.preventDefault();
			var to = +el.getAttribute('data-idx');
			if (to !== dragIdx) {
				var moved = tiles.splice(dragIdx, 1)[0];
				tiles.splice(to, 0, moved);
				render(); applyEditing(); scheduleSave();
			}
			dragIdx = null; clearOver();
		});
	}
	function clearOver() {
		grid.querySelectorAll('.dragover').forEach(function (n) { n.classList.remove('dragover'); });
	}

	/* ---------- edit mode ---------- */
	function applyEditing() {
		root.classList.toggle('editing', editing);
		grid.querySelectorAll('.custhome-tile').forEach(function (n) { n.draggable = editing; });
		var b = document.getElementById('custhome-toggle-edit');
		if (b) b.classList.toggle('butActionRefused', false);
		if (b) b.innerHTML = '<span class="fa ' + (editing ? 'fa-check' : 'fa-pen') + '"></span> ' + (editing ? (L.done || 'OK') : b.getAttribute('data-label'));
		if (!editing) closePanel();
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
		field('size').value = t.size || '1x1';
		panel.hidden = false;
		field('title').focus();
	}
	function closePanel() { if (panel) panel.hidden = true; current = null; }

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
		t.size = field('size').value;
		render(); applyEditing(); scheduleSave();
	}

	if (canEdit && panel) {
		var tb = document.getElementById('custhome-toggle-edit');
		tb.setAttribute('data-label', tb.textContent.trim());
		tb.addEventListener('click', function () { editing = !editing; applyEditing(); });

		document.getElementById('custhome-add').addEventListener('click', function () {
			editing = true;
			tiles.push({ id: Math.random().toString(36).slice(2, 12), title: L.newtile || 'New tile', subtitle: '', icon: 'fa-star', bg: PRESETS[tiles.length % PRESETS.length], fg: '#ffffff', size: '1x1', url: '', target: '' });
			render(); applyEditing(); scheduleSave();
			openPanel(tiles.length - 1);
		});

		document.getElementById('custhome-panel-close').addEventListener('click', closePanel);
		document.getElementById('custhome-delete').addEventListener('click', function () {
			if (current === null) return;
			if (!confirm(L.confirmdelete || 'Delete this tile?')) return;
			tiles.splice(current, 1);
			closePanel(); render(); applyEditing(); scheduleSave();
		});

		['title', 'subtitle', 'url', 'icon', 'bg', 'fg', 'size', 'target'].forEach(function (n) {
			var f = field(n);
			f.addEventListener('input', readPanel);
			f.addEventListener('change', readPanel);
		});
		field('urlpick').addEventListener('change', function () {
			if (this.value) {
				field('url').value = this.value;
				// auto title if empty or default
				var opt = this.options[this.selectedIndex];
				var tt = field('title');
				if (!tt.value || tt.value === (L.newtile || 'New tile')) tt.value = opt.textContent.replace(/^—\s*/, '').replace(/^.*\/\s*/, '').replace(/\.php$/, '');
				readPanel();
			}
		});

		var pr = document.getElementById('custhome-presets');
		PRESETS.forEach(function (c) {
			var s = document.createElement('span');
			s.style.background = c; s.title = c;
			s.addEventListener('click', function () { field('bg').value = c; readPanel(); });
			pr.appendChild(s);
		});

		document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
	}

	render();
}
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', custhomeInit);
} else {
	custhomeInit();
}
