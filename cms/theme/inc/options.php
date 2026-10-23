<?php
/**
 * One-off copy the app shows outside any pin, served as `copy` in the
 * content bundle. Replaces the help and signup entries in src/config.ts.
 */

add_action( 'acf/init', function () {
	acf_add_options_page( [
		'page_title' => 'Kiosk Settings',
		'menu_slug'  => 'kiosk-settings',
		'icon_url'   => 'dashicons-desktop',
		'position'   => 30,
	] );
} );
