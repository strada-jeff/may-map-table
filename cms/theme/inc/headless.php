<?php
/**
 * No front end: visitors are sent to the admin, and the parts of the admin
 * the map doesn't use (posts, pages, comments) are hidden.
 */

add_action( 'template_redirect', function () {
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) return;
	wp_safe_redirect( admin_url() );
	exit;
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
