<?php
/* Copyright (C) 2026 Anatole Conseil — GPL-3.0-or-later */

/**
 * \file    ajax/save.php
 * \ingroup custhome
 * \brief   Auto-save endpoint for the tile grid (POST JSON)
 */

if (!defined('NOTOKENRENEWAL')) {
	define('NOTOKENRENEWAL', '1');
}
if (!defined('NOREQUIREMENU')) {
	define('NOREQUIREMENU', '1');
}
if (!defined('NOREQUIREHTML')) {
	define('NOREQUIREHTML', '1');
}
if (!defined('NOREQUIREAJAX')) {
	define('NOREQUIREAJAX', '1');
}

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

dol_include_once('/custhome/class/custhome.class.php');

top_httphead('application/json');

$ch = new CustHome($db);

if (!isModEnabled('custhome') || !$ch->canEdit($user)) {
	http_response_code(403);
	print json_encode(array('ok' => false, 'error' => 'forbidden'));
	exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	http_response_code(405);
	print json_encode(array('ok' => false, 'error' => 'method'));
	exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['tiles']) || !is_array($data['tiles'])) {
	http_response_code(400);
	print json_encode(array('ok' => false, 'error' => 'bad payload'));
	exit;
}

// CSRF: token is passed as ?token= on the URL so main.inc.php validates it (POST without token is refused there)
if (!GETPOST('token', 'alpha')) {
	http_response_code(403);
	print json_encode(array('ok' => false, 'error' => 'token'));
	exit;
}

$res = $ch->saveTiles($data['tiles'], $user);
print json_encode(array('ok' => $res > 0, 'tiles' => $ch->loadTiles($user)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
