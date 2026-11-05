<?php
/**
 * Live monitor: lets staff out of sight of the table see when it's in use.
 *
 *   POST /wp-json/maytable/v1/activity  the kiosk reports (src/monitor/report.ts)
 *   GET  /wp-json/maytable/v1/activity  the admin views below poll it
 *   Table Monitor admin page            full-screen status, green while in use
 *   "Table in use" dashboard widget     the same status, smaller
 *
 * Viewing needs the view_table_monitor capability: administrators, editors,
 * and the "Table Monitor" role, which sees nothing else in the admin.
 *
 * Only the current visit is kept, in one option: no table, no history. A
 * visit's list is wiped when the table goes idle.
 *
 * The kiosk reports with MAYTABLE_KIOSK_KEY from wp-config.php, matching
 * the app's VITE_MONITOR_KEY. It ships in the app's JS, so it only keeps
 * out casual noise; the type whitelist, size caps and rate limit do the
 * rest. Unset, reporting is off.
 */

const MAYTABLE_MONITOR_CAP         = 'view_table_monitor';
const MAYTABLE_MONITOR_PAGE        = 'table-monitor';
const MAYTABLE_MONITOR_OPTION      = 'maytable_monitor_state';
const MAYTABLE_MONITOR_ROLES_VER   = '1';
const MAYTABLE_MONITOR_MAX_EVENTS  = 50;
const MAYTABLE_MONITOR_MAX_BATCH   = 20;
const MAYTABLE_MONITOR_MAX_LABEL   = 120;
const MAYTABLE_MONITOR_RATE_LIMIT  = 60; // requests a minute from one address; the kiosk sends a few
const MAYTABLE_MONITOR_MAX_BODY    = 16384; // bytes; a full kiosk batch is ~4 KB
const MAYTABLE_MONITOR_TYPES       = [
	'session_start', 'session_end', 'heartbeat',
	'details', 'directions', 'filter', 'drawer', 'help', 'signup', 'rotate',
];

/* --------------------------------------------------------------- roles */

// Roles live in the database, so set them up once (bump the version to redo).
add_action( 'init', function () {
	if ( get_option( 'maytable_monitor_roles' ) === MAYTABLE_MONITOR_ROLES_VER ) return;
	remove_role( 'table_monitor' );
	add_role( 'table_monitor', 'Table Monitor', [ 'read' => true, MAYTABLE_MONITOR_CAP => true ] );
	foreach ( [ 'administrator', 'editor' ] as $role ) get_role( $role )?->add_cap( MAYTABLE_MONITOR_CAP );
	update_option( 'maytable_monitor_roles', MAYTABLE_MONITOR_ROLES_VER );
} );

/** Monitor-only users: the role above, or anyone else who can't edit content. */
function maytable_monitor_only( ?WP_User $user = null ): bool {
	$user ??= wp_get_current_user();
	return $user->has_cap( MAYTABLE_MONITOR_CAP ) && ! $user->has_cap( 'edit_posts' );
}

// Straight to the monitor on login, and from the dashboard, which has
// nothing for them (headless.php sends front-end visits to the dashboard).
add_filter( 'login_redirect', function ( $redirect_to, $requested, $user ) {
	if ( $user instanceof WP_User && maytable_monitor_only( $user ) ) return maytable_monitor_page_url();
	return $redirect_to;
}, 10, 3 );

add_action( 'load-index.php', function () {
	if ( ! maytable_monitor_only() ) return;
	wp_safe_redirect( maytable_monitor_page_url() );
	exit;
} );

add_action( 'admin_menu', function () {
	if ( maytable_monitor_only() ) remove_menu_page( 'index.php' );
}, 99 );

function maytable_monitor_page_url(): string {
	return admin_url( 'admin.php?page=' . MAYTABLE_MONITOR_PAGE );
}

/* ---------------------------------------------------------------- REST */

add_action( 'rest_api_init', function () {
	register_rest_route( 'maytable/v1', '/activity', [
		[
			'methods'             => 'POST',
			'permission_callback' => '__return_true', // checked in the callback: the key is in the body
			'callback'            => 'maytable_monitor_receive',
		],
		[
			'methods'             => 'GET',
			// Cookie login + the REST nonce the admin views send.
			'permission_callback' => fn () => current_user_can( MAYTABLE_MONITOR_CAP ),
			'callback'            => function () {
				$response = rest_ensure_response( maytable_monitor_public_state() );
				$response->header( 'Cache-Control', 'no-store, max-age=0' );
				return $response;
			},
		],
	] );
} );

function maytable_monitor_receive( WP_REST_Request $request ) {
	$kiosk_key = defined( 'MAYTABLE_KIOSK_KEY' ) ? (string) MAYTABLE_KIOSK_KEY : '';
	if ( $kiosk_key === '' ) {
		return new WP_Error( 'maytable_monitor_off', 'Monitor reporting is not configured.', [ 'status' => 503 ] );
	}

	// Sent as text/plain (no CORS preflight), so parse the body ourselves.
	// Size-checked first, so junk is turned away before any work.
	$raw = $request->get_body();
	if ( strlen( $raw ) > MAYTABLE_MONITOR_MAX_BODY ) {
		return new WP_Error( 'maytable_monitor_size', 'Too large.', [ 'status' => 413 ] );
	}
	$body = json_decode( $raw, true, 8 );
	if ( ! is_array( $body ) || ! is_string( $body['key'] ?? null ) || ! hash_equals( $kiosk_key, $body['key'] ) ) {
		return new WP_Error( 'maytable_monitor_key', 'Bad kiosk key.', [ 'status' => 403 ] );
	}

	// Per address, so whoever lifts the key from the app's JS can't use up
	// the kiosk's allowance and silence it.
	$ip     = (string) ( $_SERVER['REMOTE_ADDR'] ?? '' );
	$window = 'maytable_monitor_rate_' . md5( $ip ) . '_' . floor( time() / 60 );
	$count  = (int) get_transient( $window ) + 1;
	set_transient( $window, $count, 2 * MINUTE_IN_SECONDS );
	if ( $count > MAYTABLE_MONITOR_RATE_LIMIT ) {
		return new WP_Error( 'maytable_monitor_rate', 'Too many requests.', [ 'status' => 429 ] );
	}

	$events = is_array( $body['events'] ?? null ) ? array_slice( $body['events'], 0, MAYTABLE_MONITOR_MAX_BATCH ) : [];
	$now    = microtime( true );
	$state  = maytable_monitor_state();

	foreach ( $events as $event ) {
		if ( ! is_array( $event ) ) continue;
		// Fields of the wrong type are dropped, not cast: casting an array
		// to a string raises a warning that could leak into the response.
		$type = $event['type'] ?? null;
		if ( ! is_string( $type ) || ! in_array( $type, MAYTABLE_MONITOR_TYPES, true ) ) continue;
		$ago = is_numeric( $event['ago'] ?? null ) ? (float) $event['ago'] / 1000 : 0;
		$at  = $now - max( 0, min( DAY_IN_SECONDS, $ago ) );

		switch ( $type ) {
			case 'session_start':
				$state = [ 'active' => true, 'startedAt' => $at, 'events' => [] ] + $state;
				break;
			case 'session_end':
				$state['active']  = false;
				$state['endedAt'] = $at;
				$state['events']  = [];
				break;
			case 'heartbeat':
				break;
			default:
				// An interaction with no start on record (one lost to a
				// purge, say) still means someone's there.
				if ( ! $state['active'] ) $state = [ 'active' => true, 'startedAt' => $at, 'events' => [] ] + $state;
				$label             = is_string( $event['label'] ?? null ) ? sanitize_text_field( $event['label'] ) : '';
				$state['events'][] = [
					'id'    => ++$state['seq'],
					'type'  => $type,
					'label' => mb_substr( $label, 0, MAYTABLE_MONITOR_MAX_LABEL ),
					'at'    => $at,
				];
				$state['events'] = array_slice( $state['events'], -MAYTABLE_MONITOR_MAX_EVENTS );
		}
	}

	$state['kioskSeen'] = $now;
	if ( is_numeric( $body['touchAgo'] ?? null ) ) {
		$state['lastTouch'] = $now - max( 0, min( DAY_IN_SECONDS, (float) $body['touchAgo'] / 1000 ) );
	}
	update_option( MAYTABLE_MONITOR_OPTION, $state, false );

	return rest_ensure_response( [ 'ok' => true ] );
}

function maytable_monitor_state(): array {
	$state = get_option( MAYTABLE_MONITOR_OPTION );
	return ( is_array( $state ) ? $state : [] ) + [
		'active'    => false,
		'startedAt' => null,
		'endedAt'   => null,
		'kioskSeen' => null,
		'lastTouch' => null,
		'seq'       => 0,
		'events'    => [],
	];
}

/** What the admin views see. Times are Unix seconds; `now` lets them correct for the browser's clock. */
function maytable_monitor_public_state(): array {
	$state = maytable_monitor_state();
	return [
		'now'       => microtime( true ),
		'active'    => (bool) $state['active'],
		'startedAt' => $state['startedAt'],
		'endedAt'   => $state['endedAt'],
		'kioskSeen' => $state['kioskSeen'],
		'lastTouch' => $state['lastTouch'],
		'events'    => array_values( $state['events'] ),
	];
}

/* ------------------------------------------------------ admin views */

add_action( 'admin_menu', function () {
	add_menu_page( 'Table Monitor', 'Table Monitor', MAYTABLE_MONITOR_CAP, MAYTABLE_MONITOR_PAGE, function () {
		maytable_monitor_markup( 'page' );
	}, 'dashicons-visibility', 2 );
} );

add_action( 'wp_dashboard_setup', function () {
	if ( ! current_user_can( MAYTABLE_MONITOR_CAP ) ) return;
	wp_add_dashboard_widget( 'maytable_table_monitor', 'Table Monitor', function () {
		maytable_monitor_markup( 'widget' );
	} );
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( $hook !== 'index.php' && $hook !== 'toplevel_page_' . MAYTABLE_MONITOR_PAGE ) return;
	if ( ! current_user_can( MAYTABLE_MONITOR_CAP ) ) return;

	$asset = fn ( $file ) => get_stylesheet_directory_uri() . "/assets/$file?ver=" . filemtime( get_stylesheet_directory() . "/assets/$file" );
	wp_enqueue_style( 'maytable-monitor', $asset( 'monitor.css' ), [], null );
	wp_enqueue_script( 'maytable-monitor', $asset( 'monitor.js' ), [], null, true );
	wp_add_inline_script( 'maytable-monitor', 'window.maytableMonitor = ' . wp_json_encode( [
		'endpoint' => rest_url( 'maytable/v1/activity' ),
		'nonce'    => wp_create_nonce( 'wp_rest' ),
	] ) . ';', 'before' );
} );

/** @param 'page'|'widget' $variant */
function maytable_monitor_markup( string $variant ): void {
	?>
	<div class="table-monitor table-monitor--<?php echo esc_attr( $variant ); ?>" data-table-monitor="<?php echo esc_attr( $variant ); ?>">
		<section class="table-monitor__status" aria-live="polite">
			<span class="table-monitor__dot" aria-hidden="true"></span>
			<div class="table-monitor__text">
				<?php if ( $variant === 'page' ) : ?>
					<h1 class="table-monitor__headline" data-headline>Connecting…</h1>
				<?php else : ?>
					<p class="table-monitor__headline" data-headline>Connecting…</p>
				<?php endif; ?>
				<p class="table-monitor__detail" data-detail></p>
			</div>
		</section>
		<div class="table-monitor__warning" data-warning hidden></div>
		<ol class="table-monitor__events" data-events></ol>
		<div class="table-monitor__controls">
			<button type="button" class="button" data-sound aria-pressed="false" title="Chime when someone starts using the table, even with this tab in the background">Sound</button>
			<?php if ( $variant === 'page' ) : ?>
				<button type="button" class="button" data-wake aria-pressed="false" title="Stop this device’s screen dimming or locking while this page is open">Screen</button>
			<?php else : ?>
				<a class="table-monitor__more" href="<?php echo esc_url( maytable_monitor_page_url() ); ?>">Open full screen</a>
			<?php endif; ?>
		</div>
	</div>
	<?php
}
