<?php
/* Copyright (C) 2026 Anatole Conseil
 * GPL-3.0-or-later
 */

/**
 * \file    class/custhome.class.php
 * \ingroup custhome
 * \brief   Tile storage and link catalogue for CustHome
 */

/**
 * Class CustHome
 */
class CustHome
{
	/** @var DoliDB */
	public $db;

	/** @var string[] */
	public $errors = array();

	const USER_PARAM = 'CUSTHOME_TILES';

	/**
	 * @param DoliDB $db Database handler
	 */
	public function __construct($db)
	{
		$this->db = $db;
	}

	/**
	 * Is config stored per user ?
	 *
	 * @return bool
	 */
	public function isUserScope()
	{
		return getDolGlobalString('CUSTHOME_SCOPE', 'global') === 'user';
	}

	/**
	 * Can the current user edit the grid he sees ?
	 *
	 * @param User $user User
	 * @return bool
	 */
	public function canEdit($user)
	{
		if ($this->isUserScope()) {
			return (bool) $user->hasRight('custhome', 'read');
		}
		return (bool) $user->hasRight('custhome', 'write');
	}

	/**
	 * Load tiles for a user (own grid in user scope, shared grid otherwise;
	 * falls back on the shared grid if the user never saved one).
	 *
	 * @param User $user User
	 * @return array Tiles
	 */
	public function loadTiles($user)
	{
		$json = '';
		if ($this->isUserScope()) {
			$json = getDolUserString(self::USER_PARAM, '', $user);
		}
		if ($json === '') {
			$json = getDolGlobalString('CUSTHOME_TILES');
		}
		$tiles = $json !== '' ? json_decode($json, true) : null;
		if (!is_array($tiles)) {
			$tiles = $this->defaultTiles();
		}
		return array_values(array_map(array($this, 'normalizeTile'), $tiles));
	}

	/**
	 * Save tiles
	 *
	 * @param array $tiles Tiles
	 * @param User  $user  User
	 * @return int <0 if KO, >0 if OK
	 */
	public function saveTiles($tiles, $user)
	{
		global $conf;

		$clean = array();
		foreach ((array) $tiles as $t) {
			if (!is_array($t)) {
				continue;
			}
			$clean[] = $this->normalizeTile($t);
		}
		$json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

		if ($this->isUserScope()) {
			require_once DOL_DOCUMENT_ROOT.'/core/lib/functions2.lib.php';
			$res = dol_set_user_param($this->db, $conf, $user, array(self::USER_PARAM => $json));
			return $res > 0 ? 1 : -1;
		}
		require_once DOL_DOCUMENT_ROOT.'/core/lib/admin.lib.php';
		$res = dolibarr_set_const($this->db, 'CUSTHOME_TILES', $json, 'chaine', 0, '', $conf->entity);
		return $res > 0 ? 1 : -1;
	}

	/**
	 * Sanitize one tile
	 *
	 * @param array $t Raw tile
	 * @return array Clean tile
	 */
	public function normalizeTile($t)
	{
		$url = trim((string) ($t['url'] ?? ''));
		// Only allow relative Dolibarr paths or http(s) URLs
		if (preg_match('#^[a-z][a-z0-9+.\-]*:#i', $url) && !preg_match('#^https?://#i', $url)) {
			$url = ''; // reject javascript:, data:, etc.
		}
		if ($url !== '' && !preg_match('#^(/|https?://)#i', $url)) {
			$url = '/'.ltrim($url, '/');
		}
		return array(
			'id' => preg_replace('/[^a-z0-9]/', '', (string) ($t['id'] ?? '')) ?: substr(md5(uniqid('', true)), 0, 10),
			'title' => dol_string_nohtmltag((string) ($t['title'] ?? '')),
			'subtitle' => dol_string_nohtmltag((string) ($t['subtitle'] ?? '')),
			'icon' => preg_replace('/[^a-z0-9\- ]/i', '', (string) ($t['icon'] ?? 'fa-link')) ?: 'fa-link',
			'bg' => preg_match('/^#[0-9a-f]{6}$/i', (string) ($t['bg'] ?? '')) ? strtolower($t['bg']) : '#2563eb',
			'fg' => preg_match('/^#[0-9a-f]{6}$/i', (string) ($t['fg'] ?? '')) ? strtolower($t['fg']) : '#ffffff',
			'x' => max(0, (int) ($t['x'] ?? 0)),
			'y' => max(0, (int) ($t['y'] ?? 0)),
			'size' => preg_match('/^([1-9]|1[0-2])x[1-4]$/', (string) ($t['size'] ?? '')) ? $t['size'] : '1x1',
			'url' => $url,
			'target' => (($t['target'] ?? '') === '_blank') ? '_blank' : '',
		);
	}

	/**
	 * Default starter grid
	 *
	 * @return array
	 */
	public function defaultTiles()
	{
		$def = array(
			array('title' => 'Tiers', 'icon' => 'fa-building', 'bg' => '#2563eb', 'url' => '/societe/list.php', 'size' => '2x1', 'subtitle' => 'Clients, prospects, fournisseurs'),
			array('title' => 'Devis', 'icon' => 'fa-file-signature', 'bg' => '#7c3aed', 'url' => '/comm/propal/list.php'),
			array('title' => 'Commandes', 'icon' => 'fa-shopping-cart', 'bg' => '#ea580c', 'url' => '/commande/list.php'),
			array('title' => 'Factures', 'icon' => 'fa-file-invoice-dollar', 'bg' => '#059669', 'url' => '/compta/facture/list.php'),
			array('title' => 'Produits', 'icon' => 'fa-cube', 'bg' => '#0891b2', 'url' => '/product/list.php'),
			array('title' => 'Agenda', 'icon' => 'fa-calendar-alt', 'bg' => '#db2777', 'url' => '/comm/action/index.php'),
			array('title' => 'Configuration', 'icon' => 'fa-cogs', 'bg' => '#475569', 'url' => '/admin/index.php'),
		);
		return $def;
	}

	/**
	 * Build the catalogue of pickable links: Dolibarr menu entries + custom module pages
	 *
	 * @param User $user User
	 * @return array Groups array('label'=>..., 'items'=>array(array('label','url')))
	 */
	public function linkCatalogue($user)
	{
		global $conf, $langs;

		$groups = array();

		// 1. Menu entries (top + left) readable by the user. Core menus are hardcoded
		// in eldy.lib.php (not in llx_menu), so we use the eldy builders in noout mode.
		require_once DOL_DOCUMENT_ROOT.'/core/class/menubase.class.php';
		require_once DOL_DOCUMENT_ROOT.'/core/class/menu.class.php';
		require_once DOL_DOCUMENT_ROOT.'/core/menus/standard/eldy.lib.php';
		$type_user = empty($user->socid) ? 0 : 1;
		$tabMenu = array();
		$menubase = new Menubase($this->db, 'eldy');
		$menubase->menuLoad('all', 'all', $type_user, 'eldy', $tabMenu);

		$top = new Menu();
		print_eldy_menu($this->db, '', $type_user, $tabMenu, $top, 1);
		foreach ($top->liste as $t) {
			if (empty($t['enabled']) || empty($t['mainmenu']) || $t['mainmenu'] == 'xxx') {
				continue;
			}
			$items = array();
			if (!empty($t['url']) && $t['url'] != '#') {
				$items[] = array('label' => dol_string_nohtmltag($t['titre']), 'url' => $this->cleanMenuUrl($t['url']));
			}
			$left = new Menu();
			$nothing = array();
			print_left_eldy_menu($this->db, $nothing, $nothing, $tabMenu, $left, 1, $t['mainmenu'], 'all', null, $type_user);
			foreach ($left->liste as $m) {
				if (empty($m['enabled']) || empty($m['url']) || $m['url'] == '#') {
					continue;
				}
				$label = dol_string_nohtmltag($m['titre']);
				if ($label === '') {
					continue;
				}
				$items[] = array('label' => str_repeat('— ', (int) $m['level']).$label, 'url' => $this->cleanMenuUrl($m['url']));
			}
			$seen = array();
			$items = array_values(array_filter($items, function ($it) use (&$seen) {
				if (isset($seen[$it['url']])) {
					return false;
				}
				$seen[$it['url']] = 1;
				return true;
			}));
			if ($items) {
				$groups[] = array('label' => $langs->trans('Menu').' : '.dol_string_nohtmltag($t['titre']), 'items' => $items);
			}
		}

		// 2. Pages of enabled custom modules
		$custitems = array();
		foreach ($conf->file->dol_document_root as $type => $root) {
			if ($type == 'main') {
				continue;
			}
			$dirs = glob(rtrim($root, '/').'/*', GLOB_ONLYDIR);
			foreach ((array) $dirs as $d) {
				$mod = basename($d);
				if (!isModEnabled($mod) && !isModEnabled(strtolower($mod))) {
					continue;
				}
				foreach (glob($d.'/*.php') as $f) {
					$base = basename($f);
					if (preg_match('/^(ajax|lib|class|setup|about)|\.lib\.php$|\.class\.php$/i', $base)) {
						continue;
					}
					$custitems[] = array('label' => $mod.' / '.$base, 'url' => '/'.$mod.'/'.$base, 'icon' => 'fa-puzzle-piece');
				}
				foreach (glob($d.'/admin/*.php') as $f) {
					$custitems[] = array('label' => $mod.' / admin / '.basename($f), 'url' => '/'.$mod.'/admin/'.basename($f), 'icon' => 'fa-cog');
				}
			}
		}
		if ($custitems) {
			$groups[] = array('label' => $langs->trans('CustHomeCustomModules'), 'items' => $custitems);
		}

		return $groups;
	}

	/**
	 * Strip the idmenu param added by menuLoad
	 *
	 * @param string $url Url
	 * @return string
	 */
	private function cleanMenuUrl($url)
	{
		$url = html_entity_decode($url, ENT_QUOTES);
		if (DOL_URL_ROOT !== '' && strpos($url, DOL_URL_ROOT) === 0) {
			$url = substr($url, strlen(DOL_URL_ROOT));
		}
		$parts = explode('?', $url, 2);
		if (count($parts) == 2) {
			parse_str($parts[1], $q);
			unset($q['idmenu'], $q['mainmenu'], $q['leftmenu']);
			$url = $parts[0].($q ? '?'.http_build_query($q) : '');
		}
		return $url;
	}
}
