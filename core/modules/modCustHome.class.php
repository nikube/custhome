<?php
/* Copyright (C) 2026 Anatole Conseil
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * \file    core/modules/modCustHome.class.php
 * \ingroup custhome
 * \brief   Module descriptor for CustHome — modern editable tile home page
 */

require_once DOL_DOCUMENT_ROOT.'/core/modules/DolibarrModules.class.php';

/**
 * Class modCustHome
 */
class modCustHome extends DolibarrModules
{
	/**
	 * @param DoliDB $db Database handler
	 */
	public function __construct($db)
	{
		global $langs, $conf;

		$this->db = $db;

		// Reserved range 185150–185169 (Anatole Conseil) — next free after brevosync (185167)
		$this->numero = 185168;
		$this->rights_class = 'custhome';
		$this->family = 'interface';
		$this->module_position = '90';
		$this->name = preg_replace('/^mod/i', '', get_class($this));
		$this->description = "CustHome - Modern editable tile home page";
		$this->descriptionlong = "Replaces (or complements) the Dolibarr home page with a modern grid of tiles. Tiles are edited in place (title, subtitle, icon, colors, size, link) with drag & drop ordering and automatic saving. Links can be picked from the Dolibarr menus, the pages of installed custom modules, or typed freely.";
		$this->editor_name = 'Anatole Conseil';
		$this->editor_url = '';
		$this->version = '1.0.1';
		$this->const_name = 'MAIN_MODULE_'.strtoupper($this->name);
		$this->picto = 'fa-th-large';

		$this->module_parts = array(
			'css' => array('/custhome/css/topmenu.css'),
		);

		$this->dirs = array();
		$this->config_page_url = array('setup.php@custhome');

		$this->hidden = false;
		$this->depends = array();
		$this->requiredby = array();
		$this->conflictwith = array();
		$this->langfiles = array('custhome@custhome');
		$this->phpmin = array(7, 4);
		$this->need_dolibarr_version = array(19, 0);

		$this->const = array(
			1 => array('CUSTHOME_TILES', 'chaine', '', 'JSON configuration of the home tiles', 0, 'current', 0),
			2 => array('CUSTHOME_SCOPE', 'chaine', 'global', 'Tile config scope: global (shared) or user (each user has his own grid)', 0, 'current', 0),
			3 => array('CUSTHOME_COLUMNS', 'chaine', '6', 'Number of grid columns', 0, 'current', 0),
			4 => array('CUSTHOME_TOPMENU', 'chaine', '1', 'Show a top menu button (square) before Home', 0, 'current', 0),
		);

		if (!isset($conf->custhome)) {
			$conf->custhome = new stdClass();
		}
		if (!isset($conf->custhome->enabled)) {
			$conf->custhome->enabled = 0;
		}
		$this->tabs = array();
		$this->dictionaries = array();
		$this->boxes = array();
		$this->cronjobs = array();

		$this->rights = array();
		$r = 0;
		$this->rights[$r][0] = $this->numero + 1;
		$this->rights[$r][1] = 'View the tile home page';
		$this->rights[$r][4] = 'read';
		$this->rights[$r][5] = '';
		$r++;
		$this->rights[$r][0] = $this->numero + 2;
		$this->rights[$r][1] = 'Edit the tiles';
		$this->rights[$r][4] = 'write';
		$this->rights[$r][5] = '';

		$this->menu = array();
		$r = 0;
		// Top menu button placed before "Home" (home position = 10)
		$this->menu[$r++] = array(
			'fk_menu' => '',
			'type' => 'top',
			'titre' => 'CustHomeTopMenu',
			'prefix' => '<span class="fas fa-th-large fa-fw"></span>',
			'mainmenu' => 'custhome',
			'leftmenu' => '',
			'url' => '/custhome/index.php',
			'langs' => 'custhome@custhome',
			'position' => 5,
			'enabled' => 'isModEnabled("custhome") && getDolGlobalString("CUSTHOME_TOPMENU")',
			'perms' => '$user->hasRight("custhome", "read")',
			'target' => '',
			'user' => 2,
		);
		// Left menu under the top button (avoids an empty left column)
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=custhome',
			'type' => 'left',
			'titre' => 'CustHomeMenu',
			'mainmenu' => 'custhome',
			'leftmenu' => 'custhometiles',
			'url' => '/custhome/index.php',
			'langs' => 'custhome@custhome',
			'position' => 1,
			'enabled' => 'isModEnabled("custhome") && getDolGlobalString("CUSTHOME_TOPMENU")',
			'perms' => '$user->hasRight("custhome", "read")',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=custhome',
			'type' => 'left',
			'titre' => 'CustHomeSetup',
			'mainmenu' => 'custhome',
			'leftmenu' => 'custhomesetup',
			'url' => '/custhome/admin/setup.php',
			'langs' => 'custhome@custhome',
			'position' => 2,
			'enabled' => 'isModEnabled("custhome") && getDolGlobalString("CUSTHOME_TOPMENU")',
			'perms' => '$user->admin',
			'target' => '',
			'user' => 2,
		);
		$this->menu[$r++] = array(
			'fk_menu' => 'fk_mainmenu=home',
			'type' => 'left',
			'titre' => 'CustHomeMenu',
			'mainmenu' => 'home',
			'leftmenu' => 'custhome',
			'url' => '/custhome/index.php',
			'langs' => 'custhome@custhome',
			'position' => 100,
			'enabled' => 'isModEnabled("custhome")',
			'perms' => '$user->hasRight("custhome", "read")',
			'target' => '',
			'user' => 2,
		);
	}

	/**
	 * @param string $options Options when enabling module ('', 'noboxes')
	 * @return int 1 if OK, 0 if KO
	 */
	public function init($options = '')
	{
		$sql = array();
		return $this->_init($sql, $options);
	}

	/**
	 * @param string $options Options when disabling module ('', 'noboxes')
	 * @return int 1 if OK, 0 if KO
	 */
	public function remove($options = '')
	{
		global $conf;
		// Do not leave users redirected to a page of a disabled module
		if (getDolGlobalString('MAIN_LANDING_PAGE') == '/custhome/index.php') {
			dolibarr_del_const($this->db, 'MAIN_LANDING_PAGE', $conf->entity);
		}
		$sql = array();
		return $this->_remove($sql, $options);
	}
}
