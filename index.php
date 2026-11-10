<?php
/* Copyright (C) 2026 Anatole Conseil — GPL-3.0-or-later */

/**
 * \file    index.php
 * \ingroup custhome
 * \brief   Tile home page
 */

$res = 0;
if (!$res && file_exists("../main.inc.php")) {
	$res = @include "../main.inc.php";
}
if (!$res && file_exists("../../main.inc.php")) {
	$res = @include "../../main.inc.php";
}
if (!$res) {
	die("Include of main fails");
}

dol_include_once('/custhome/class/custhome.class.php');

$langs->loadLangs(array('custhome@custhome', 'admin'));

if (!isModEnabled('custhome') || !$user->hasRight('custhome', 'read')) {
	accessforbidden();
}

$ch = new CustHome($db);
$tiles = $ch->loadTiles($user);
$canedit = $ch->canEdit($user);
$catalogue = $canedit ? $ch->linkCatalogue($user) : array();
$columns = max(2, min(12, (int) getDolGlobalString('CUSTHOME_COLUMNS', '6')));

$arrayofjs = array('/custhome/js/custhome.js');
$arrayofcss = array('/custhome/css/custhome.css');

llxHeader('', $langs->trans('CustHomeTitle'), '', '', 0, 0, $arrayofjs, $arrayofcss, '', 'custhome-page');

print '<div id="custhome" class="custhome-page'.($canedit ? ' custhome-editable' : '').(getDolGlobalString('CUSTHOME_LIGHT') ? ' custhome-light' : '').'" data-columns="'.$columns.'" data-canedit="'.($canedit ? 1 : 0).'"';
print ' data-ajax="'.dol_buildpath('/custhome/ajax/save.php', 1).'" data-token="'.newToken().'">';

print '<div class="custhome-toolbar">';
print '<h1 class="custhome-h1">'.dol_escape_htmltag(getDolGlobalString('CUSTHOME_HEADING', $langs->trans('CustHomeTitle'))).'</h1>';
if ($canedit) {
	print '<div class="custhome-actions">';
	print '<span class="custhome-status" id="custhome-status"></span>';
	print '<button type="button" class="butAction custhome-btn" id="custhome-add"><span class="fa fa-plus"></span> '.$langs->trans('CustHomeAddTile').'</button>';
	print '<button type="button" class="butAction custhome-btn" id="custhome-toggle-edit"><span class="fa fa-pen"></span> '.$langs->trans('CustHomeEditMode').'</button>';
	print '</div>';
}
print '</div>';

print '<div class="custhome-grid" id="custhome-grid" style="--ch-cols:'.$columns.'"></div>';

if ($canedit) {
	// Edit panel (hidden, filled by JS)
	print '<div class="custhome-panel" id="custhome-panel" hidden>';
	print '<div class="custhome-panel-inner">';
	print '<div class="custhome-panel-head"><strong>'.$langs->trans('CustHomeEditTile').'</strong><button type="button" class="custhome-close" id="custhome-panel-close" title="'.$langs->trans('Close').'">&times;</button></div>';
	print '<label>'.$langs->trans('Title').'<input type="text" data-field="title" class="flat"></label>';
	print '<label>'.$langs->trans('CustHomeSubtitle').'<input type="text" data-field="subtitle" class="flat"></label>';
	print '<label>'.$langs->trans('CustHomeLink').'<select data-field="urlpick" class="flat"><option value="">— '.$langs->trans('CustHomeCustomUrl').' —</option>';
	foreach ($catalogue as $g) {
		print '<optgroup label="'.dol_escape_htmltag($g['label']).'">';
		foreach ($g['items'] as $it) {
			print '<option value="'.dol_escape_htmltag($it['url']).'">'.dol_escape_htmltag($it['label']).'</option>';
		}
		print '</optgroup>';
	}
	print '</select></label>';
	print '<label>URL<input type="text" data-field="url" class="flat" placeholder="/societe/list.php ou https://…"></label>';
	print '<label class="custhome-inline"><input type="checkbox" data-field="target"> '.$langs->trans('CustHomeOpenNewTab').'</label>';
	print '<label>'.$langs->trans('CustHomeIcon').'<span class="custhome-iconrow"><span class="custhome-iconpreview" id="custhome-iconpreview"></span><input type="text" data-field="icon" class="flat" placeholder="fa-building"></span></label>';
print '<input type="text" class="flat custhome-iconsearch" id="custhome-iconsearch" placeholder="'.dol_escape_htmltag($langs->trans('CustHomeIconSearch')).'">';
print '<div class="custhome-icons" id="custhome-icons"></div>';
	print '<div class="custhome-row"><label>'.$langs->trans('CustHomeBgColor').'<input type="color" data-field="bg"></label>';
	print '<label>'.$langs->trans('CustHomeFgColor').'<input type="color" data-field="fg"></label></div>';
	print '<div class="custhome-presets" id="custhome-presets"></div>';
	print '<div class="custhome-panel-foot"><button type="button" class="butActionDelete" id="custhome-delete"><span class="fa fa-trash"></span> '.$langs->trans('Delete').'</button></div>';
	print '</div></div>';
}

print '</div>';

print '<script>window.CUSTHOME_TILES = '.json_encode($tiles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP).';';
print 'window.CUSTHOME_URLROOT = '.json_encode(DOL_URL_ROOT).';';
print 'window.CUSTHOME_HOSTS = '.json_encode(CustHome::ownHosts()).';';
print 'window.CUSTHOME_LANG = '.json_encode(array(
	'saved' => $langs->transnoentities('CustHomeSaved'),
	'saving' => $langs->transnoentities('CustHomeSaving'),
	'error' => $langs->transnoentities('CustHomeSaveError'),
	'newtile' => $langs->transnoentities('CustHomeNewTile'),
	'confirmdelete' => $langs->transnoentities('CustHomeConfirmDelete'),
)).';</script>';

llxFooter();
$db->close();
