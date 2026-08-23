<?php
/* Copyright (C) 2026 Anatole Conseil — GPL-3.0-or-later */

/**
 * \file    admin/setup.php
 * \ingroup custhome
 * \brief   CustHome setup page
 */

$res = 0;
if (!$res && file_exists("../../main.inc.php")) {
	$res = @include "../../main.inc.php";
}
if (!$res && file_exists("../../../main.inc.php")) {
	$res = @include "../../../main.inc.php";
}
if (!$res) {
	die("Include of main fails");
}

require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';

$langs->loadLangs(array('admin', 'custhome@custhome'));

if (!$user->admin) {
	accessforbidden();
}

$action = GETPOST('action', 'aZ09');

/*
 * Actions
 */
if ($action == 'update') {
	$error = 0;
	$scope = GETPOST('CUSTHOME_SCOPE', 'aZ09') === 'user' ? 'user' : 'global';
	$cols = max(2, min(8, GETPOSTINT('CUSTHOME_COLUMNS')));
	$heading = GETPOST('CUSTHOME_HEADING', 'alphanohtml');
	if (dolibarr_set_const($db, 'CUSTHOME_SCOPE', $scope, 'chaine', 0, '', $conf->entity) <= 0) $error++;
	if (dolibarr_set_const($db, 'CUSTHOME_COLUMNS', $cols, 'chaine', 0, '', $conf->entity) <= 0) $error++;
	if (dolibarr_set_const($db, 'CUSTHOME_HEADING', $heading, 'chaine', 0, '', $conf->entity) <= 0) $error++;
	if (GETPOST('CUSTHOME_LANDING')) {
		if (dolibarr_set_const($db, 'MAIN_LANDING_PAGE', '/custhome/index.php', 'chaine', 0, '', $conf->entity) <= 0) $error++;
	} elseif (getDolGlobalString('MAIN_LANDING_PAGE') == '/custhome/index.php') {
		dolibarr_del_const($db, 'MAIN_LANDING_PAGE', $conf->entity);
	}
	setEventMessages($error ? $langs->trans('Error') : $langs->trans('SetupSaved'), null, $error ? 'errors' : 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}
if ($action == 'reset' && GETPOST('token') ) {
	dolibarr_set_const($db, 'CUSTHOME_TILES', '', 'chaine', 0, '', $conf->entity);
	setEventMessages($langs->trans('CustHomeResetDone'), null, 'mesgs');
	header('Location: '.$_SERVER['PHP_SELF']);
	exit;
}

/*
 * View
 */
llxHeader('', $langs->trans('CustHomeSetup'));

$linkback = '<a href="'.DOL_URL_ROOT.'/admin/modules.php?restore_lastsearch_values=1">'.$langs->trans('BackToModuleList').'</a>';
print load_fiche_titre($langs->trans('CustHomeSetup'), $linkback, 'fa-th-large');

print '<form method="POST" action="'.$_SERVER['PHP_SELF'].'">';
print '<input type="hidden" name="token" value="'.newToken().'">';
print '<input type="hidden" name="action" value="update">';

print '<table class="noborder centpercent">';
print '<tr class="liste_titre"><td>'.$langs->trans('Parameter').'</td><td>'.$langs->trans('Value').'</td></tr>';

$scope = getDolGlobalString('CUSTHOME_SCOPE', 'global');
print '<tr class="oddeven"><td>'.$langs->trans('CustHomeScope').'<br><span class="opacitymedium small">'.$langs->trans('CustHomeScopeHelp').'</span></td><td>';
print '<select name="CUSTHOME_SCOPE" class="flat">';
print '<option value="global"'.($scope == 'global' ? ' selected' : '').'>'.$langs->trans('CustHomeScopeGlobal').'</option>';
print '<option value="user"'.($scope == 'user' ? ' selected' : '').'>'.$langs->trans('CustHomeScopeUser').'</option>';
print '</select></td></tr>';

print '<tr class="oddeven"><td>'.$langs->trans('CustHomeColumns').'</td><td>';
print '<input type="number" min="2" max="8" name="CUSTHOME_COLUMNS" class="flat width50" value="'.getDolGlobalString('CUSTHOME_COLUMNS', '4').'"></td></tr>';

print '<tr class="oddeven"><td>'.$langs->trans('CustHomeHeading').'</td><td>';
print '<input type="text" name="CUSTHOME_HEADING" class="flat minwidth300" value="'.dol_escape_htmltag(getDolGlobalString('CUSTHOME_HEADING')).'" placeholder="'.$langs->trans('CustHomeTitle').'"></td></tr>';

print '<tr class="oddeven"><td>'.$langs->trans('CustHomeLanding').'<br><span class="opacitymedium small">'.$langs->trans('CustHomeLandingHelp', 'MAIN_LANDING_PAGE').'</span></td><td>';
print '<input type="checkbox" name="CUSTHOME_LANDING" value="1"'.(getDolGlobalString('MAIN_LANDING_PAGE') == '/custhome/index.php' ? ' checked' : '').'></td></tr>';

print '</table>';

print '<div class="center"><input type="submit" class="button button-save" value="'.$langs->trans('Save').'"></div>';
print '</form>';

print '<br><div class="tabsAction">';
print '<a class="butAction" href="'.dol_buildpath('/custhome/index.php', 1).'">'.$langs->trans('CustHomeOpen').'</a>';
print '<a class="butActionDelete" href="'.$_SERVER['PHP_SELF'].'?action=reset&token='.newToken().'" onclick="return confirm(\''.dol_escape_js($langs->transnoentities('CustHomeResetConfirm')).'\')">'.$langs->trans('CustHomeReset').'</a>';
print '</div>';

llxFooter();
$db->close();
