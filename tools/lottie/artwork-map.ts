/**
 * Which base.svg group each scenery animation replaces. build-artwork drops
 * these groups before cutting tiles; build-lottie fits each animation over
 * the hole its group leaves (see register.ts).
 *
 * Figma's frame names and Illustrator's layer names don't line up — match by
 * looking, not by name (Figma's car_1 is base's "Car dark blue"; Figma's
 * car_3 is "Car red").
 *
 * A list places the same animation over several copies of the art (the map
 * has three playgrounds). A recolored copy gets its own recipe that reuses
 * the original's export (see recipes/playground_blue.ts).
 *
 * Some ids are a nested child, not the obvious group: the swim club's
 * animation replaces only "Swim club pool", not the clubhouse beside it in
 * PIN_Swim_club, and the Hello Friends sign is part of PIN_Cafe_and_Friends
 * (stacked behind the building). The "Mini ..." layers (Mini_celebration_hall,
 * Mini_swim_club...) are miniature duplicates with no Figma counterpart and
 * stay static.
 *
 * Ids are base.svg's layer names, spaces as underscores (see the README's
 * "Artwork naming"); a renamed layer has to be renamed here too.
 *
 * The interactive piece (cta_viewmap) isn't here: it's app UI, not base
 * art.
 */
export const ARTWORK_MAP: Record<string, string | string[]> = {
  bike_kid: "Kid_on_bike",
  bike_man: "PIN_Man_on_bike",
  bird: "Bird",
  car_1: "Car_dark_blue",
  car_2: "Car_light_blue",
  car_3: "Car_red",
  car_packing: "Person_packing_car",
  celebrationhall: "PIN_Celebration_Hall",
  concert: "PIN_Concert",
  deer: "Deer",
  dog: "PIN_Dog",
  food_beverage: "PIN_Food_and_beverage",
  forklift: "PIN_Forklift",
  hello_sign: "Hello_Friends_sign",
  hotairballoon_midtown: "Balloon",
  kite_child: "PIN_Girl_with_kite",
  lions_megaphone: "PIN_Go_Lions_megaphone",
  mayfair_sign: "Mayfair_sign",
  playground: ["PIN_Playground_green_east", "PIN_Fairway_Park_playground"],
  playground_blue: "PIN_Playground_blue",
  schoolbus: "School_bus",
  scooter_child: "Child_on_scooter",
  stroller_1: "Woman_with_stroller_red",
  stroller_2: "Woman_with_stroller_blue",
  swimclub: "Swim_club_pool",
  woman_shopping: "Woman_with_shopping_bags",
  woman_walking_dog: "Woman_walking_dog",
};

/**
 * Extra base.svg groups an animation replaces beyond the one it's placed
 * over — art Illustrator keeps as a sibling. The balloon's banner lettering
 * is its own group there; the Figma balloon animates its own.
 */
export const ALSO_HIDDEN: Record<string, string[]> = {
  hotairballoon_midtown: ["Midtown_balloon_banner"],
};

/**
 * base.svg groups baked into an animation, drawn on top of its own art —
 * for art Illustrator stacks in front of the scenery. The animations sit
 * above the tiles, so without this they'd paint over it (the Hello Friends
 * sign's pole and shrub over the Cafe's roof). build-lottie converts each
 * group to Lottie shapes exactly where it sits on the map, and the group
 * leaves the tiles and map pieces like the art the animation replaces.
 * List groups bottom to top, and bring along anything stacked above them
 * that they overlap — it'd end up beneath them otherwise (the Cafe's label
 * sits on the building's ground plate). Only for animations placed once.
 */
export const FOREGROUND: Record<string, string[]> = {
  hello_sign: ["Cafe_and_Friends_building", "Cafe_and_Friends_label"],
};
