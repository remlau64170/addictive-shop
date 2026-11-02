import arrowLeft from "lucide-static/icons/arrow-left.svg?raw";
import bell from "lucide-static/icons/bell.svg?raw";
import bookmark from "lucide-static/icons/bookmark.svg?raw";
import calendarDays from "lucide-static/icons/calendar-days.svg?raw";
import check from "lucide-static/icons/check.svg?raw";
import chevronLeft from "lucide-static/icons/chevron-left.svg?raw";
import chevronRight from "lucide-static/icons/chevron-right.svg?raw";
import compass from "lucide-static/icons/compass.svg?raw";
import externalLink from "lucide-static/icons/external-link.svg?raw";
import eye from "lucide-static/icons/eye.svg?raw";
import flame from "lucide-static/icons/flame.svg?raw";
import gamepad from "lucide-static/icons/gamepad-2.svg?raw";
import handMetal from "lucide-static/icons/hand-metal.svg?raw";
import heartPulse from "lucide-static/icons/heart-pulse.svg?raw";
import lightbulb from "lucide-static/icons/lightbulb.svg?raw";
import lock from "lucide-static/icons/lock.svg?raw";
import mapPin from "lucide-static/icons/map-pin.svg?raw";
import messageCircle from "lucide-static/icons/message-circle.svg?raw";
import newspaper from "lucide-static/icons/newspaper.svg?raw";
import pause from "lucide-static/icons/pause.svg?raw";
import phone from "lucide-static/icons/phone.svg?raw";
import plus from "lucide-static/icons/plus.svg?raw";
import refresh from "lucide-static/icons/refresh-cw.svg?raw";
import search from "lucide-static/icons/search.svg?raw";
import settings from "lucide-static/icons/settings.svg?raw";
import share from "lucide-static/icons/share-2.svg?raw";
import sparkles from "lucide-static/icons/sparkles.svg?raw";
import thumbsUp from "lucide-static/icons/thumbs-up.svg?raw";
import trophy from "lucide-static/icons/trophy.svg?raw";
import userPlus from "lucide-static/icons/user-plus.svg?raw";
import userRound from "lucide-static/icons/user-round.svg?raw";
import volume from "lucide-static/icons/volume-2.svg?raw";
import x from "lucide-static/icons/x.svg?raw";

const ICONS = {
  arrowLeft,
  bell,
  bookmark,
  calendarDays,
  check,
  chevronLeft,
  chevronRight,
  compass,
  externalLink,
  eye,
  flame,
  gamepad,
  handMetal,
  heartPulse,
  lightbulb,
  lock,
  mapPin,
  messageCircle,
  newspaper,
  pause,
  phone,
  plus,
  refresh,
  search,
  settings,
  share,
  sparkles,
  thumbsUp,
  trophy,
  userPlus,
  userRound,
  volume,
  x,
};

export type IconName = keyof typeof ICONS;

/** Icône Lucide en texte (les écrans de la démo sont des chaînes HTML, partagées entre la construction et le navigateur). */
export function icon(name: IconName, size = 20, className = "") {
  return ICONS[name]
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s*\n\s*/g, " ")
    .trim()
    .replace(/class="[^"]*"/, "")
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`)
    .replace("<svg", `<svg aria-hidden="true" class="ic ${className}"`);
}
