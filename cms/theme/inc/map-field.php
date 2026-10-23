<?php
/**
 * Puts a clickable map on the Pin group's "Map position" field: click to
 * place the pin, see its distance to the nearest road, snap it on. The
 * X / Y inputs stay the stored values; the map just fills them in.
 *
 * assets/map.webp and assets/map-data.json come from the app's builds
 * (npm run build:cms-map, npm run build:network), so the admin places pins
 * on the same artwork and roads the table shows and routes along.
 */

add_action( 'acf/input/admin_enqueue_scripts', function () {
	$screen = get_current_screen();
	if ( ! $screen || ! in_array( $screen->post_type, [ 'model_home', 'location' ], true ) ) return;

	$asset = fn ( $file ) => get_stylesheet_directory_uri() . "/assets/$file?ver=" . filemtime( get_stylesheet_directory() . "/assets/$file" );

	wp_enqueue_style( 'maytable-map-field', $asset( 'map-field.css' ), [], null );
	wp_enqueue_script( 'maytable-map-field', $asset( 'map-field.js' ), [ 'acf-input' ], null, true );
	wp_localize_script( 'maytable-map-field', 'maytableMapField', [
		'mapImage' => $asset( 'map.webp' ),
		'mapData'  => $asset( 'map-data.json' ),
		// Other pins are drawn faintly for reference; this one is left out.
		'content'  => rest_url( 'maytable/v1/content' ),
		'pinId'    => $GLOBALS['post']->post_name ?? '',
	] );
} );
