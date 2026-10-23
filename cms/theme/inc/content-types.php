<?php
/**
 * Post types and taxonomy behind each type in src/types/pins.ts. Post slugs
 * are the app's ids, so links to a pin (and its route) survive renaming it.
 *
 * Classic edit screens (show_in_rest false) keep each entry to its title and
 * ACF fields; menu order sets the order in the app's drawer.
 */

/** Matches MODEL_HOMES_CATEGORY_ID in src/types/pins.ts. */
const MAYTABLE_MODEL_HOMES_CATEGORY = 'model-homes';

add_action( 'init', function () {
	$shared = [
		'public'       => false,
		'show_ui'      => true,
		'show_in_rest' => false,
		'supports'     => [ 'title', 'page-attributes' ],
	];

	register_post_type( 'model_home', $shared + [
		'labels'    => maytable_labels( 'Model Home', 'Model Homes' ),
		'menu_icon' => 'dashicons-admin-home',
	] );

	register_post_type( 'location', $shared + [
		'labels'    => maytable_labels( 'Location', 'Locations' ),
		'menu_icon' => 'dashicons-location',
	] );

	register_post_type( 'builder', $shared + [
		'labels'    => maytable_labels( 'Builder', 'Builders' ),
		'menu_icon' => 'dashicons-hammer',
	] );

	// Categories drive the welcome-screen buttons and the location filters.
	// "model-homes" is one of them for those buttons, but no location can be
	// in it — see the field query filter below.
	register_taxonomy( 'map_category', [ 'location' ], [
		'labels'            => maytable_labels( 'Category', 'Categories' ),
		'public'            => false,
		'show_ui'           => true,
		'show_in_rest'      => false,
		'show_admin_column' => true,
		'hierarchical'      => true,
		'meta_box_cb'       => false,
	] );
} );

/** Keeps "model-homes" out of a location's Category choices. */
add_filter( 'acf/fields/taxonomy/query/name=category', function ( $args ) {
	$model_homes = get_term_by( 'slug', MAYTABLE_MODEL_HOMES_CATEGORY, 'map_category' );
	if ( $model_homes ) $args['exclude'] = [ $model_homes->term_id ];
	return $args;
} );

function maytable_labels( string $singular, string $plural ): array {
	return [
		'name'          => $plural,
		'singular_name' => $singular,
		'add_new_item'  => "Add New $singular",
		'edit_item'     => "Edit $singular",
		'new_item'      => "New $singular",
		'view_item'     => "View $singular",
		'search_items'  => "Search $plural",
		'not_found'     => 'No ' . strtolower( $plural ) . ' found',
		'all_items'     => "All $plural",
		'menu_name'     => $plural,
	];
}
