<?php
/**
 * GET /wp-json/maytable/v1/content — everything the app loads, in one
 * response so the kiosk always holds a consistent snapshot. Each list is
 * shaped exactly like its type in src/types/pins.ts (ACF's snake_case
 * fields mapped to the app's camelCase); src/data/api.ts validates it.
 *
 * Published entries only, so drafts are a safe place to work.
 */

add_action( 'rest_api_init', function () {
	register_rest_route( 'maytable/v1', '/content', [
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			$response = rest_ensure_response( maytable_content() );
			// The kiosk refetches on boot and on each idle reset; a short
			// cache keeps a run of them from each hitting PHP.
			$response->header( 'Cache-Control', 'public, max-age=60' );
			return $response;
		},
	] );
} );

function maytable_content(): array {
	$builders    = maytable_posts( 'builder' );
	$model_homes = maytable_posts( 'model_home' );
	$locations   = maytable_posts( 'location' );

	$content = [
		'categories' => maytable_categories(),
		'builders'   => array_map( 'maytable_builder', $builders ),
		'modelHomes' => array_map( 'maytable_model_home', $model_homes ),
		'locations'  => array_map( 'maytable_location', $locations ),
		'copy'       => [
			'help'   => [
				'heading' => (string) get_field( 'help_heading', 'option' ),
				'body'    => (string) get_field( 'help_body', 'option' ),
			],
			'signup' => [
				'heading' => (string) get_field( 'signup_heading', 'option' ),
				'qrValue' => (string) get_field( 'signup_qr_value', 'option' ),
			],
		],
	];

	// A hash of everything else, so any edit (a category or the kiosk copy
	// too, not just posts) tells the app to reload.
	return [ 'version' => md5( wp_json_encode( $content ) ) ] + $content;
}

/** @return WP_Post[] */
function maytable_posts( string $post_type ): array {
	return get_posts( [
		'post_type'      => $post_type,
		'post_status'    => 'publish',
		'posts_per_page' => -1,
		'orderby'        => [ 'menu_order' => 'ASC', 'title' => 'ASC' ],
	] );
}

function maytable_categories(): array {
	$terms = get_terms( [ 'taxonomy' => 'map_category', 'hide_empty' => false ] );
	if ( is_wp_error( $terms ) ) return [];

	$categories = array_map( function ( WP_Term $term ) {
		$category = [
			'id'    => $term->slug,
			'label' => (string) get_field( 'label', $term ),
		];
		$icon  = get_field( 'icon', $term );
		$color = get_field( 'color', $term );
		if ( $icon ) $category['icon'] = $icon;
		if ( $color ) $category['color'] = $color;
		return [ 'order' => (int) get_field( 'order', $term ), 'category' => $category ];
	}, $terms );

	usort( $categories, fn ( $a, $b ) => $a['order'] <=> $b['order'] );
	return array_column( $categories, 'category' );
}

function maytable_builder( WP_Post $post ): array {
	$builder = [
		'id'           => $post->post_name,
		'name'         => $post->post_title,
		'abbreviation' => (string) get_field( 'abbreviation', $post ),
	];
	$logo        = get_field( 'logo', $post );
	$description = get_field( 'description', $post );
	if ( $logo ) $builder['logo'] = wp_get_attachment_url( $logo );
	if ( $description ) $builder['description'] = $description;
	return $builder;
}

function maytable_model_home( WP_Post $post ): array {
	$builder = get_field( 'builder', $post );
	return maytable_pin( $post ) + [
		'kind'          => 'model-home',
		'builderId'     => $builder ? get_post_field( 'post_name', $builder ) : '',
		'name'          => $post->post_title,
		'collection'    => (string) get_field( 'collection', $post ),
		'squareFootage' => maytable_range( get_field( 'square_footage', $post ) ),
		'beds'          => maytable_range( get_field( 'beds', $post ) ),
		'baths'         => maytable_range( get_field( 'baths', $post ) ),
		'garage'        => maytable_range( get_field( 'garage', $post ) ),
		'stories'       => (float) get_field( 'stories', $post ),
		'priceText'     => (string) get_field( 'price_text', $post ),
		'priceValue'    => (float) get_field( 'price_value', $post ),
		'hours'         => (string) get_field( 'hours', $post ),
	];
}

function maytable_location( WP_Post $post ): array {
	$category = get_field( 'category', $post );
	return maytable_pin( $post ) + [
		'kind'        => 'location',
		'categoryId'  => $category ? $category->slug : '',
		'title'       => $post->post_title,
		'location'    => (string) get_field( 'location', $post ),
		'description' => (string) get_field( 'description', $post ),
	];
}

/** The fields every pin shares (BasePin in pins.ts). */
function maytable_pin( WP_Post $post ): array {
	$anchor = get_field( 'anchor', $post ) ?: [];
	$images = get_field( 'images', $post ) ?: [];

	$pin = [
		'id'            => $post->post_name,
		'anchor'        => [ (float) ( $anchor['x'] ?? 0 ), (float) ( $anchor['y'] ?? 0 ) ],
		'images'        => array_values( array_filter( array_map(
			fn ( $id ) => wp_get_attachment_image_url( $id, 'kiosk-gallery' ),
			$images
		) ) ),
		'address'       => (string) get_field( 'address', $post ),
		'directionsUrl' => (string) get_field( 'directions_url', $post ),
	];

	$offset = get_field( 'icon_offset', $post ) ?: [];
	$x      = (float) ( $offset['x'] ?? 0 );
	$y      = (float) ( $offset['y'] ?? 0 );
	if ( $x || $y ) $pin['iconOffset'] = [ 'x' => $x, 'y' => $y ];

	$artwork = (string) get_field( 'artwork', $post );
	if ( $artwork !== '' ) $pin['artwork'] = $artwork;

	return $pin;
}

/**
 * NumberRange in pins.ts: a number, or [min, max] when the field's optional
 * max is set and differs.
 *
 * @return float|float[]
 */
function maytable_range( $field ) {
	$min = (float) ( $field['min'] ?? 0 );
	$max = $field['max'] ?? '';
	if ( $max === '' || $max === null || (float) $max === $min ) return $min;
	return [ $min, (float) $max ];
}
