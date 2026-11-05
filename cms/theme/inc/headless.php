<?php
/**
 * No front end: visitors are sent to the admin, and the parts of the admin
 * the map doesn't use (posts, pages, comments) are hidden.
 */

defined( 'ABSPATH' ) || exit; // Only ever loaded by WordPress.

// Priority 1: ahead of WordPress's own canonical redirects and sitemaps,
// which would otherwise answer first (/?author=1 → /author/<username>/).
add_action( 'template_redirect', function () {
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) return;
	wp_safe_redirect( admin_url() );
	exit;
}, 1 );

// ── Closing what a headless site doesn't use ──
// Each of these is a WordPress default that only helps someone guessing logins.

add_filter( 'wp_sitemaps_enabled', '__return_false' );

// XML-RPC: nothing here uses it, and its login methods allow password
// guessing many attempts per request.
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'xmlrpc_methods', fn () => [] );

// The users endpoints list every login name. Only logged-in screens need them.
add_filter( 'rest_endpoints', function ( $endpoints ) {
	if ( is_user_logged_in() ) return $endpoints;
	foreach ( array_keys( $endpoints ) as $route ) {
		if ( str_starts_with( $route, '/wp/v2/users' ) ) unset( $endpoints[ $route ] );
	}
	return $endpoints;
} );

add_action( 'admin_menu', function () {
	remove_menu_page( 'edit.php' );
	remove_menu_page( 'edit.php?post_type=page' );
	remove_menu_page( 'edit-comments.php' );
} );

add_action( 'init', function () {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
} );

// The details view's gallery is 1728 x 1222 on the 4K screen. Not cropped:
// the app covers the frame itself, so editors' framing survives.
add_action( 'after_setup_theme', function () {
	add_image_size( 'kiosk-gallery', 1728, 1728, false );
} );
