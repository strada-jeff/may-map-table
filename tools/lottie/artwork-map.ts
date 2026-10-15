/**
 * Which base.svg group each scenery animation replaces. build-artwork drops
 * these groups before cutting tiles; build-lottie fits each animation over
 * the hole its group leaves (see register.ts).
 *
 * Figma's frame names and Illustrator's layer names don't line up — match by
 * looking, not by name (Figma's car_1 is the dark blue car, which is base's
 * Car-3; base's "Car" is the red one, Figma's car_3).
 *
 * A list places the same animation over several copies of the art (the map
 * has three playgrounds). A recolored copy gets its own recipe that reuses
 * the original's export (see recipes/playground_blue.ts).
 *
 * Some ids are a nested child, not the obvious group: "pool" is the swim
 * club scene (Swim_club is the clubhouse building beside it). The small
 * *_copy / *-2 groups (Celebration_Hall_copy, Swim_club-2...) are miniature
 * duplicates with no Figma counterpart and stay static.
 *
 * The interactive pieces (flag_red, balloon_coventry, cta_viewmap) aren't
 * here: they replace app UI, not base art.
 */
export const ARTWORK_MAP: Record<string, string | string[]> = {
  bike_kid: "Kid_on_bike",
  bike_man: "Man_on_bike",
  bird: "bird",
  car_1: "Car-3",
  car_2: "Car-2",
  car_3: "Car",
  car_packing: "Person_packing_car",
  celebrationhall: "Celebration_Hall",
  concert: "Concert_icon",
  deer: "deer",
  dog: "dog",
  food_beverage: "Food_beverage",
  forklift: "industrial_icon",
  hello_sign: "Hello_Friends",
  hotairballoon_midtown: "Balloon",
  kite_child: "girl_with_kite",
  lions_megaphone: "Megaphone",
  mayfair_sign: "Mayfair_sign",
  playground: ["Layer_197", "Layer_196"],
  playground_blue: "Layer_199",
  schoolbus: "school_bus",
  scooter_child: "Child_on_scooter",
  stroller_1: "lady_with_stroll",
  stroller_2: "lady_with_stroll_2",
  swimclub: "pool",
  woman_shopping: "lady_with_shopping_bags",
  woman_walking_dog: "Lady_with_dof",
};

/**
 * Extra base.svg groups an animation replaces beyond the one it's placed
 * over — art Illustrator keeps as a sibling. The balloon's banner lettering
 * is its own group there; the Figma balloon animates its own.
 */
export const ALSO_HIDDEN: Record<string, string[]> = {
  hotairballoon_midtown: ["Midtown_Label"],
};
