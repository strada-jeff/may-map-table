import balloonCoventry from "./balloon_coventry.json";
import bikeKid from "./bike_kid.json";
import bikeMan from "./bike_man.json";
import bird from "./bird.json";
import car1 from "./car_1.json";
import car2 from "./car_2.json";
import car3 from "./car_3.json";
import carPacking from "./car_packing.json";
import celebrationhall from "./celebrationhall.json";
import concert from "./concert.json";
import ctaViewmap from "./cta_viewmap.json";
import deer from "./deer.json";
import dog from "./dog.json";
import flagRed from "./flag_red.json";
import foodBeverage from "./food_beverage.json";
import forklift from "./forklift.json";
import helloSign from "./hello_sign.json";
import hotairballoonMidtown from "./hotairballoon_midtown.json";
import kiteChild from "./kite_child.json";
import lionsMegaphone from "./lions_megaphone.json";
import mayfairSign from "./mayfair_sign.json";
import playground from "./playground.json";
import playgroundBlue from "./playground_blue.json";
import schoolbus from "./schoolbus.json";
import scooterChild from "./scooter_child.json";
import stroller1 from "./stroller_1.json";
import stroller2 from "./stroller_2.json";
import swimclub from "./swimclub.json";
import womanShopping from "./woman_shopping.json";
import womanWalkingDog from "./woman_walking_dog.json";

/**
 * Static imports, not import.meta.glob — a hand-maintained map is more
 * debuggable than a dynamic loader for something a kiosk can't surface
 * load errors for. Add a line here when a new animation file shows up in
 * this folder. The JSON is generated: edit tools/lottie/recipes/<name>.ts
 * and run `npm run build:lottie`, don't hand-edit it.
 */
export const LOTTIE_ANIMATIONS = {
  balloon_coventry: balloonCoventry,
  bike_kid: bikeKid,
  bike_man: bikeMan,
  bird: bird,
  car_1: car1,
  car_2: car2,
  car_3: car3,
  car_packing: carPacking,
  celebrationhall: celebrationhall,
  concert: concert,
  cta_viewmap: ctaViewmap,
  deer: deer,
  dog: dog,
  flag_red: flagRed,
  food_beverage: foodBeverage,
  forklift: forklift,
  hello_sign: helloSign,
  hotairballoon_midtown: hotairballoonMidtown,
  kite_child: kiteChild,
  lions_megaphone: lionsMegaphone,
  mayfair_sign: mayfairSign,
  playground: playground,
  playground_blue: playgroundBlue,
  schoolbus: schoolbus,
  scooter_child: scooterChild,
  stroller_1: stroller1,
  stroller_2: stroller2,
  swimclub: swimclub,
  woman_shopping: womanShopping,
  woman_walking_dog: womanWalkingDog,
} as const;

export type LottieAnimationId = keyof typeof LOTTIE_ANIMATIONS;
