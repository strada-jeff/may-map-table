<?php
/**
 * Points ACF's Local JSON sync at the theme's acf-json/ folder, so field
 * groups created in the ACF admin UI are auto-saved there and stay in git.
 */

add_filter( 'acf/settings/save_json', function () {
	return get_stylesheet_directory() . '/acf-json';
} );

add_filter( 'acf/settings/load_json', function ( $paths ) {
	$paths[] = get_stylesheet_directory() . '/acf-json';
	return $paths;
} );
