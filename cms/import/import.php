<?php
/**
 * Loads content.json (the spreadsheet, normalized to src/types/pins.ts)
 * into WordPress, plus any photos in images/<slug>/:
 *
 *   wp eval-file cms/import/import.php            # create what's missing, add new photos
 *   wp eval-file cms/import/import.php overwrite  # also reset existing entries' fields
 *
 * Safe to re-run. Entries are matched by slug (the app id) in any status,
 * so by default an entry already edited in WordPress is left alone and only
 * gains photos it doesn't have yet. Photos are added in filename order and
 * remembered by path, so each is uploaded once.
 */

require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

const MAYTABLE_IMAGE_SOURCE_META = '_maytable_import_source';

$overwrite = in_array( 'overwrite', $args ?? [], true );
$content   = json_decode( file_get_contents( __DIR__ . '/content.json' ), true, flags: JSON_THROW_ON_ERROR );

// ── Categories ───────────────────────────────────────────────────────────────
$category_term_ids = [];
foreach ( $content['categories'] as $order => $category ) {
	$term = get_term_by( 'slug', $category['id'], 'map_category' );
	$new  = ! $term;
	if ( $new ) {
		$inserted = wp_insert_term( $category['name'], 'map_category', [ 'slug' => $category['id'] ] );
		if ( is_wp_error( $inserted ) ) WP_CLI::error( "Category {$category['id']}: " . $inserted->get_error_message() );
		$term = get_term( $inserted['term_id'], 'map_category' );
	}
	$category_term_ids[ $category['id'] ] = $term->term_id;
	if ( $new || $overwrite ) {
		$acf_id = 'term_' . $term->term_id;
		update_field( 'field_map_category_label', $category['label'], $acf_id );
		update_field( 'field_map_category_color', $category['color'] ?? '', $acf_id );
		update_field( 'field_map_category_icon', $category['icon'] ?? '', $acf_id );
		update_field( 'field_map_category_order', $order, $acf_id );
	}
	maytable_report( 'category', $category['id'], $new, $overwrite );
}

// ── Builders ─────────────────────────────────────────────────────────────────
$builder_post_ids = [];
foreach ( $content['builders'] as $order => $builder ) {
	[ $id, $write ] = maytable_upsert( 'builder', $builder['id'], $builder['name'], $order, $overwrite );
	$builder_post_ids[ $builder['id'] ] = $id;
	if ( $write ) {
		update_field( 'field_builder_abbreviation', $builder['abbreviation'], $id );
		update_field( 'field_builder_description', $builder['description'] ?? '', $id );
	}
	if ( ! get_field( 'logo', $id ) ) {
		$logo = maytable_import_images( $builder['id'], $id )[0] ?? null;
		if ( $logo ) update_field( 'field_builder_logo', $logo, $id );
	}
}

// ── Model homes ──────────────────────────────────────────────────────────────
foreach ( $content['modelHomes'] as $order => $home ) {
	[ $id, $write ] = maytable_upsert( 'model_home', $home['id'], $home['name'], $order, $overwrite );
	if ( $write ) {
		maytable_write_pin( $id, $home );
		update_field( 'field_model_home_builder', $builder_post_ids[ $home['builderId'] ] ?? null, $id );
		update_field( 'field_model_home_collection', $home['collection'], $id );
		maytable_write_range( $id, 'square_footage', $home['squareFootage'] );
		maytable_write_range( $id, 'beds', $home['beds'] );
		maytable_write_range( $id, 'baths', $home['baths'] );
		maytable_write_range( $id, 'garage', $home['garage'] );
		update_field( 'field_model_home_stories', $home['stories'], $id );
		update_field( 'field_model_home_price_text', $home['priceText'], $id );
		update_field( 'field_model_home_price_value', $home['priceValue'], $id );
		update_field( 'field_model_home_hours', $home['hours'], $id );
	}
	maytable_add_gallery_images( $id, $home['id'] );
}

// ── Locations ────────────────────────────────────────────────────────────────
foreach ( $content['locations'] as $order => $location ) {
	[ $id, $write ] = maytable_upsert( 'location', $location['id'], $location['title'], $order, $overwrite );
	if ( $write ) {
		maytable_write_pin( $id, $location );
		$term_id = $category_term_ids[ $location['categoryId'] ];
		update_field( 'field_location_category', $term_id, $id );
		wp_set_object_terms( $id, [ $term_id ], 'map_category' );
		update_field( 'field_location_location', $location['location'], $id );
		update_field( 'field_location_description', $location['description'], $id );
	}
	maytable_add_gallery_images( $id, $location['id'] );
}

// ── Kiosk settings ───────────────────────────────────────────────────────────
$copy = [
	'field_kiosk_settings_help_heading'    => $content['copy']['help']['heading'],
	'field_kiosk_settings_help_body'       => $content['copy']['help']['body'],
	'field_kiosk_settings_signup_heading'  => $content['copy']['signup']['heading'],
	'field_kiosk_settings_signup_qr_value' => $content['copy']['signup']['qrValue'],
];
foreach ( $copy as $key => $value ) {
	if ( $overwrite || ! get_field( $key, 'option' ) ) update_field( $key, $value, 'option' );
}

WP_CLI::success( 'Import done.' );

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds the post with this slug (any status) or creates it published.
 *
 * @return array{0: int, 1: bool} post id, and whether its fields should be written
 */
function maytable_upsert( string $post_type, string $slug, string $title, int $order, bool $overwrite ): array {
	$existing = get_posts( [
		'post_type'      => $post_type,
		'name'           => $slug,
		'post_status'    => 'any',
		'posts_per_page' => 1,
		'fields'         => 'ids',
	] );
	if ( $existing && ! $overwrite ) {
		maytable_report( $post_type, $slug, false, false );
		return [ $existing[0], false ];
	}

	$post = [
		'post_type'   => $post_type,
		'post_name'   => $slug,
		'post_title'  => $title,
		'post_status' => 'publish',
		'menu_order'  => $order,
	];
	if ( $existing ) $post['ID'] = $existing[0];
	$id = wp_insert_post( $post, true );
	if ( is_wp_error( $id ) ) WP_CLI::error( "$post_type $slug: " . $id->get_error_message() );

	maytable_report( $post_type, $slug, ! $existing, $overwrite );
	return [ $id, true ];
}

/** The BasePin fields both pin types share (ACF group "Pin"). */
function maytable_write_pin( int $id, array $pin ): void {
	update_field( 'field_pin_anchor', [
		'field_pin_anchor_x' => $pin['anchor'][0],
		'field_pin_anchor_y' => $pin['anchor'][1],
	], $id );
	update_field( 'field_pin_icon_offset', [
		'field_pin_icon_offset_x' => $pin['iconOffset']['x'] ?? '',
		'field_pin_icon_offset_y' => $pin['iconOffset']['y'] ?? '',
	], $id );
	update_field( 'field_pin_address', $pin['address'], $id );
	update_field( 'field_pin_directions_url', $pin['directionsUrl'], $id );
}

/** A NumberRange: a number, or [min, max]. */
function maytable_write_range( int $id, string $name, $value ): void {
	[ $min, $max ] = is_array( $value ) ? $value : [ $value, '' ];
	update_field( "field_model_home_$name", [
		"field_model_home_{$name}_min" => $min,
		"field_model_home_{$name}_max" => $max,
	], $id );
}

/** Appends photos from images/<slug>/ that this gallery doesn't have yet. */
function maytable_add_gallery_images( int $id, string $slug ): void {
	$added = maytable_import_images( $slug, $id );
	if ( ! $added ) return;
	$gallery = array_map( 'intval', get_field( 'images', $id, false ) ?: [] );
	update_field( 'field_pin_images', array_values( array_unique( [ ...$gallery, ...$added ] ) ), $id );
}

/**
 * Uploads each file in images/<slug>/ not uploaded before, in filename
 * order, attached to $parent.
 *
 * @return int[] the new attachment ids
 */
function maytable_import_images( string $slug, int $parent ): array {
	$dir = __DIR__ . "/images/$slug";
	if ( ! is_dir( $dir ) ) return [];

	$files = array_values( array_filter(
		scandir( $dir ),
		fn ( $file ) => preg_match( '/\.(jpe?g|png|webp|gif)$/i', $file )
	) );
	natcasesort( $files );

	$added = [];
	foreach ( $files as $file ) {
		$source = "$slug/$file";
		$seen   = get_posts( [
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'meta_key'       => MAYTABLE_IMAGE_SOURCE_META,
			'meta_value'     => $source,
			'posts_per_page' => 1,
			'fields'         => 'ids',
		] );
		if ( $seen ) continue;

		// Sideloading moves the file it's given, so hand it a copy.
		$tmp = wp_tempnam( $file );
		copy( "$dir/$file", $tmp );
		$attachment = media_handle_sideload( [ 'name' => $file, 'tmp_name' => $tmp ], $parent );
		if ( is_wp_error( $attachment ) ) {
			WP_CLI::warning( "$source: " . $attachment->get_error_message() );
			continue;
		}
		update_post_meta( $attachment, MAYTABLE_IMAGE_SOURCE_META, $source );
		$added[] = $attachment;
		WP_CLI::log( "  + $source" );
	}
	return $added;
}

function maytable_report( string $type, string $slug, bool $created, bool $overwrite ): void {
	$status = $created ? 'created' : ( $overwrite ? 'overwritten' : 'exists, skipped' );
	WP_CLI::log( str_pad( $type, 12 ) . str_pad( $slug, 40 ) . $status );
}
