<?php
/**
 * May Map Table CMS — functions.php
 *
 * Content for the map table app (the repo root). Pins, builders and
 * categories are edited here as posts and ACF fields, and served to the app
 * as one bundle shaped exactly like src/types/pins.ts.
 */

require_once __DIR__ . '/inc/acf-json.php';
require_once __DIR__ . '/inc/headless.php';
require_once __DIR__ . '/inc/content-types.php';
require_once __DIR__ . '/inc/map-field.php';
require_once __DIR__ . '/inc/options.php';
require_once __DIR__ . '/inc/rest.php';
require_once __DIR__ . '/inc/content-health.php';
