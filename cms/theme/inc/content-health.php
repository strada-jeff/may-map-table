<?php
/**
 * Content health: what's wrong with the content as the kiosk will show it.
 *
 * One set of checks, run on every load (nothing to schedule or go stale),
 * shown in two places: the "Kiosk Content" dashboard panel, for everyone
 * who logs in, and a notice on an entry's own edit screen.
 *
 * Problems misbehave on the kiosk (a route ending at the wrong road, a
 * balloon with no builder). "To finish" items work but are incomplete: the
 * app leaves out what's missing (no QR without a directions link, no
 * address line without an address), so the visitor just gets less.
 */

/** Every issue type, in display order. */
function maytable_issue_types(): array {
	return [
		// Problems
		'bad-directions' => [ 'problem', "Directions link isn't a web address" ],
		'far'            => [ 'problem', 'Too far from a road' ],
		'unreachable'    => [ 'problem', 'On a road the routes never reach' ],
		'no-builder'     => [ 'problem', 'No builder' ],
		'no-category'    => [ 'problem', 'No category' ],
		'missing-text'   => [ 'problem', 'Missing kiosk text' ],
		// To finish
		'no-directions'  => [ 'warning', 'No directions link (no QR code shown)' ],
		'no-address'     => [ 'warning', 'No address' ],
		'placeholder'    => [ 'warning', 'Placeholder text' ],
		'no-photos'      => [ 'warning', 'No photos' ],
		'no-hours'       => [ 'warning', 'No hours' ],
		'no-collection'  => [ 'warning', 'No collection' ],
		'no-area'        => [ 'warning', 'No neighborhood / area' ],
		'overlap'        => [ 'warning', 'Icons overlap on the map' ],
	];
}

/**
 * Copy someone meant to come back to: "X-mile", "XX", TBD, and filler
 * Latin (not always "lorem ipsum" — the Figma help copy isn't).
 */
const MAYTABLE_PLACEHOLDER = '/\bX{1,3}\b|\bTBD\b|\b(lorem|ipsum|pellentesque|consectetur|adipiscing)\b/i';

/**
 * Pin icons' on-screen size in px (bottom-anchored), from LottieFlag.tsx
 * (FLAG_BODY_*, LocationMarker's ANCHOR_X) and LottieBalloon.tsx
 * (BALLOON_BODY_*). Checked for overlap at the map's opening zoom
 * (CONFIG.map.initialZoom 1.4 => 2^1.4 screen px per map unit), where
 * icons are full size. A pair counts as overlapping when they share at
 * least MAYTABLE_OVERLAP_SHARE of the smaller icon, not just a grazed corner.
 */
const MAYTABLE_ICON_BOX = [
	'location'   => [ 'width' => 173, 'height' => 215, 'anchor_x' => 14 ],
	'model-home' => [ 'width' => 48, 'height' => 222, 'anchor_x' => 24 ],
];
const MAYTABLE_OPENING_SCALE = 2.639; // 2 ** 1.4
const MAYTABLE_OVERLAP_SHARE  = 0.2;

/**
 * Every issue across the content, as the kiosk sees it (published entries
 * only), plus $include_post_id's own whatever its status — so a draft's
 * edit screen still gets checked.
 *
 * @return array<int, array{type: string, name: string, edit: string, detail: string, post_id: int, other_id?: int}>
 */
function maytable_content_issues( int $include_post_id = 0 ): array {
	$map    = json_decode( file_get_contents( get_stylesheet_directory() . '/assets/map-data.json' ), true );
	$issues = [];
	$add    = function ( string $type, string $name, string $edit, string $detail = '', int $post_id = 0, array $extra = [] ) use ( &$issues ) {
		$issues[] = compact( 'type', 'name', 'edit', 'detail', 'post_id' ) + $extra;
	};

	// ── Pins ──
	$pins = [];
	foreach ( [ 'model_home' => 'maytable_model_home', 'location' => 'maytable_location' ] as $post_type => $shape ) {
		$posts = maytable_posts( $post_type );
		$extra = $include_post_id ? get_post( $include_post_id ) : null;
		if ( $extra && $extra->post_type === $post_type && $extra->post_status !== 'publish' ) $posts[] = $extra;
		foreach ( $posts as $post ) $pins[] = [ 'post' => $post, 'pin' => $shape( $post ) ];
	}

	foreach ( $pins as [ 'post' => $post, 'pin' => $pin ] ) {
		$name = $pin['name'] ?? $pin['title'];
		$edit = maytable_edit_link( $post->ID );
		$flag = fn ( $type, $detail = '' ) => $add( $type, $name, $edit, $detail, $post->ID );

		if ( $pin['directionsUrl'] === '' ) $flag( 'no-directions' );
		elseif ( ! preg_match( '#^https?://#i', $pin['directionsUrl'] ) || ! filter_var( $pin['directionsUrl'], FILTER_VALIDATE_URL ) ) $flag( 'bad-directions' );
		if ( $pin['address'] === '' ) $flag( 'no-address' );

		$near = maytable_nearest_road( $pin['anchor'], $map['roads'] );
		if ( $near['distance'] > $map['maxSnapDistance'] ) $flag( 'far', (string) round( $near['distance'] ) );
		if ( in_array( $near['road'], $map['unreachableRoads'], true ) ) $flag( 'unreachable' );

		if ( ! $pin['images'] ) $flag( 'no-photos' );

		if ( $pin['kind'] === 'model-home' ) {
			if ( $pin['builderId'] === '' ) $flag( 'no-builder' );
			if ( $pin['hours'] === '' ) $flag( 'no-hours' );
			if ( $pin['collection'] === '' ) $flag( 'no-collection' );
			$text = [ $pin['name'], $pin['collection'], $pin['hours'], $pin['priceText'], $pin['address'] ];
		} else {
			if ( $pin['categoryId'] === '' ) $flag( 'no-category' );
			if ( $pin['location'] === '' ) $flag( 'no-area' );
			$text = [ $pin['title'], $pin['location'], $pin['description'], $pin['address'] ];
		}
		if ( preg_match( MAYTABLE_PLACEHOLDER, implode( "\n", $text ) ) ) $flag( 'placeholder' );
	}

	// Recorded under both pins of a pair, for each one's edit screen; the
	// dashboard lists each pair once (see `other_id`).
	$boxes = array_map( fn ( $entry ) => maytable_icon_box( $entry['pin'] ), $pins );
	foreach ( $pins as $i => $a ) {
		foreach ( $pins as $j => $b ) {
			if ( $i === $j || ! maytable_boxes_overlap( $boxes[ $i ], $boxes[ $j ] ) ) continue;
			$add( 'overlap', $a['pin']['name'] ?? $a['pin']['title'], maytable_edit_link( $a['post']->ID ),
				'with ' . ( $b['pin']['name'] ?? $b['pin']['title'] ), $a['post']->ID, [ 'other_id' => $b['post']->ID ] );
		}
	}

	// ── Builders, categories, kiosk text ──
	foreach ( maytable_posts( 'builder' ) as $post ) {
		if ( ! get_field( 'abbreviation', $post ) ) {
			$add( 'missing-text', $post->post_title, maytable_edit_link( $post->ID ), 'balloon abbreviation', $post->ID );
		}
	}
	foreach ( get_terms( [ 'taxonomy' => 'map_category', 'hide_empty' => false ] ) ?: [] as $term ) {
		$edit = admin_url( "term.php?taxonomy=map_category&tag_ID={$term->term_id}" );
		if ( ! get_field( 'label', $term ) ) $add( 'missing-text', $term->name, $edit, 'button label' );
		if ( ! get_field( 'color', $term ) && ! get_field( 'icon', $term ) ) $add( 'missing-text', $term->name, $edit, 'flag color' );
	}
	$settings = admin_url( 'admin.php?page=kiosk-settings' );
	$copy     = [
		'help_heading'    => 'help heading',
		'help_body'       => 'help text',
		'signup_heading'  => 'sign-up heading',
		'signup_qr_value' => 'sign-up link',
	];
	foreach ( $copy as $field => $label ) {
		$value = (string) get_field( $field, 'option' );
		if ( $value === '' ) $add( 'missing-text', 'Kiosk Settings', $settings, $label );
		elseif ( preg_match( MAYTABLE_PLACEHOLDER, $value ) ) $add( 'placeholder', 'Kiosk Settings', $settings, $label );
	}

	$order = array_flip( array_keys( maytable_issue_types() ) );
	usort( $issues, fn ( $a, $b ) => $order[ $a['type'] ] <=> $order[ $b['type'] ] );
	return $issues;
}

/** Built directly: get_edit_post_link() is null without a logged-in user (WP-CLI). */
function maytable_edit_link( int $post_id ): string {
	return admin_url( "post.php?post=$post_id&action=edit" );
}

/** Same measure as the app's route planner: distance to the nearest road segment. */
function maytable_nearest_road( array $p, array $roads ): array {
	$best = [ 'distance' => INF, 'road' => -1 ];
	foreach ( $roads as $index => $road ) {
		for ( $i = 1, $n = count( $road ); $i < $n; $i++ ) {
			[ $ax, $ay ] = $road[ $i - 1 ];
			[ $bx, $by ] = $road[ $i ];
			$dx = $bx - $ax;
			$dy = $by - $ay;
			$length_squared = $dx * $dx + $dy * $dy;
			$t = $length_squared ? max( 0, min( 1, ( ( $p[0] - $ax ) * $dx + ( $p[1] - $ay ) * $dy ) / $length_squared ) ) : 0;
			$distance = hypot( $ax + $t * $dx - $p[0], $ay + $t * $dy - $p[1] );
			if ( $distance < $best['distance'] ) $best = [ 'distance' => $distance, 'road' => $index ];
		}
	}
	return $best;
}

/** The pin's icon footprint in map units at the opening zoom: [left, top, right, bottom]. */
function maytable_icon_box( array $pin ): array {
	$size = MAYTABLE_ICON_BOX[ $pin['kind'] ];
	$x    = $pin['anchor'][0] + ( $pin['iconOffset']['x'] ?? 0 );
	$y    = $pin['anchor'][1] + ( $pin['iconOffset']['y'] ?? 0 );
	$left = $x - $size['anchor_x'] / MAYTABLE_OPENING_SCALE;
	return [ $left, $y - $size['height'] / MAYTABLE_OPENING_SCALE, $left + $size['width'] / MAYTABLE_OPENING_SCALE, $y ];
}

function maytable_boxes_overlap( array $a, array $b ): bool {
	$shared  = max( 0, min( $a[2], $b[2] ) - max( $a[0], $b[0] ) ) * max( 0, min( $a[3], $b[3] ) - max( $a[1], $b[1] ) );
	$smaller = min( ( $a[2] - $a[0] ) * ( $a[3] - $a[1] ), ( $b[2] - $b[0] ) * ( $b[3] - $b[1] ) );
	return $shared >= MAYTABLE_OVERLAP_SHARE * $smaller;
}

// ── Dashboard panel ──────────────────────────────────────────────────────────

add_action( 'wp_dashboard_setup', function () {
	// A headless CMS's dashboard is about the kiosk: WordPress's own news,
	// drafts and post counts mean nothing here.
	remove_meta_box( 'dashboard_quick_press', 'dashboard', 'side' );
	remove_meta_box( 'dashboard_primary', 'dashboard', 'side' );
	remove_meta_box( 'dashboard_right_now', 'dashboard', 'normal' );
	remove_meta_box( 'dashboard_activity', 'dashboard', 'normal' );
	remove_action( 'welcome_panel', 'wp_welcome_panel' );

	wp_add_dashboard_widget( 'maytable_content_health', 'Kiosk Content', 'maytable_render_dashboard_panel' );

	// First in the first column for everyone; the styles below make that
	// column full width.
	global $wp_meta_boxes;
	$normal = &$wp_meta_boxes['dashboard']['normal']['core'];
	$normal = [ 'maytable_content_health' => $normal['maytable_content_health'] ] + $normal;
} );

function maytable_render_dashboard_panel(): void {
	$issues = maytable_content_issues();
	$types  = maytable_issue_types();

	$pin_count = count( maytable_posts( 'model_home' ) ) + count( maytable_posts( 'location' ) );
	$flagged   = count( array_unique( array_filter( array_column( $issues, 'post_id' ) ) ) );

	$by_type = [];
	$counts  = [ 'problem' => 0, 'warning' => 0 ];
	foreach ( $issues as $issue ) {
		if ( isset( $issue['other_id'] ) && $issue['post_id'] > $issue['other_id'] ) continue; // the pair's other half
		$by_type[ $issue['type'] ][] = $issue;
		$counts[ $types[ $issue['type'] ][0] ]++;
	}

	echo '<div class="maytable-health">';
	if ( ! $issues ) {
		printf( '<p class="maytable-health__ok">All %d pins are ready.</p></div>', $pin_count );
		return;
	}
	printf(
		'<p class="maytable-health__summary"><span class="is-problem">%d %s</span><span class="is-warning">%d to finish</span><span class="is-ok">%d of %d pins ready</span></p>',
		$counts['problem'],
		_n( 'problem', 'problems', $counts['problem'] ),
		$counts['warning'],
		$pin_count - $flagged,
		$pin_count
	);

	foreach ( [ 'problem' => 'Problems — these misbehave on the kiosk', 'warning' => 'To finish — works, but incomplete' ] as $severity => $heading ) {
		$sections = array_filter( $by_type, fn ( $type ) => $types[ $type ][0] === $severity, ARRAY_FILTER_USE_KEY );
		if ( ! $sections ) continue;
		printf( '<h3 class="maytable-health__heading is-%s">%s</h3>', esc_attr( $severity ), esc_html( $heading ) );
		foreach ( $sections as $type => $items ) {
			$links = array_map( function ( $item ) {
				$detail = $item['detail'] !== '' ? ' <span class="maytable-health__detail">' . esc_html( $item['detail'] ) . '</span>' : '';
				return sprintf( '<a href="%s">%s</a>%s', esc_url( $item['edit'] ), esc_html( $item['name'] ), $detail );
			}, $items );
			printf(
				'<details class="maytable-health__type" %s><summary>%s <span class="count">(%d)</span></summary><p>%s</p></details>',
				$severity === 'problem' ? 'open' : '',
				esc_html( $types[ $type ][1] ),
				count( $items ),
				implode( ' · ', $links )
			);
		}
	}
	echo '</div>';
}

add_action( 'admin_head-index.php', function () {
	?>
	<style>
		/* One full-width column: the dashboard sizes its columns from screen
		   width in CSS, and with WordPress's own widgets removed the rest
		   would only be empty drop zones. */
		#dashboard-widgets #postbox-container-1 { width: 100%; }
		#dashboard-widgets #postbox-container-2,
		#dashboard-widgets #postbox-container-3,
		#dashboard-widgets #postbox-container-4 { display: none; }
		.maytable-health__summary { display: flex; gap: 20px; font-size: 14px; font-weight: 600; margin: 4px 0 12px; }
		.maytable-health .is-problem { color: #d63638; }
		.maytable-health .is-warning { color: #996800; }
		.maytable-health .is-ok, .maytable-health__ok { color: #00a32a; }
		.maytable-health__ok { font-size: 14px; font-weight: 600; }
		.maytable-health__heading { margin: 16px 0 6px !important; font-size: 12px !important; text-transform: uppercase; letter-spacing: .05em; }
		.maytable-health__type { margin: 0 0 6px 4px; }
		.maytable-health__type summary { cursor: pointer; font-weight: 600; }
		.maytable-health__type summary .count { font-weight: 400; color: #646970; }
		.maytable-health__type p { margin: 4px 0 10px 16px; line-height: 1.8; }
		.maytable-health__detail { color: #646970; }
	</style>
	<?php
} );

// ── Edit-screen notice ───────────────────────────────────────────────────────

add_action( 'admin_notices', function () {
	$screen = get_current_screen();
	if ( ! $screen || $screen->base !== 'post' || ! in_array( $screen->post_type, [ 'model_home', 'location', 'builder' ], true ) ) return;
	$post_id = (int) ( $_GET['post'] ?? 0 );
	if ( ! $post_id ) return;

	$own = array_filter( maytable_content_issues( $post_id ), fn ( $issue ) => $issue['post_id'] === $post_id );
	if ( ! $own ) return;

	$types    = maytable_issue_types();
	$problems = array_filter( $own, fn ( $issue ) => $types[ $issue['type'] ][0] === 'problem' );
	$items    = array_map( function ( $issue ) use ( $types ) {
		$detail = $issue['detail'] !== '' ? ' (' . esc_html( $issue['detail'] ) . ')' : '';
		return '<li>' . esc_html( $types[ $issue['type'] ][1] ) . $detail . '</li>';
	}, $own );

	printf(
		'<div class="notice notice-%s"><p><strong>%s</strong></p><ul style="list-style:disc;margin-left:20px">%s</ul></div>',
		$problems ? 'error' : 'warning',
		$problems ? "This entry won't work properly on the kiosk until these are fixed:" : 'This entry works on the kiosk, but is incomplete:',
		implode( '', $items )
	);
} );
