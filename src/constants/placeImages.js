import GyeongbokgungImg from "../assets/kyeongbokgung.png";
import GwangjangMarketImg from "../assets/gwangjangsijang-optimized.jpg";
import JeonjuHanokImg from "../assets/junjuhanokmaeul.png";
import TonginMarketImg from "../assets/tonginsijang-optimized.jpg";
import ChangdeokgungImg from "../assets/changduckgung.png";

export const PLACE_IMAGES = {
  gyeongbokgung: GyeongbokgungImg,
  "gwangjang-market": GwangjangMarketImg,
  "jeonju-hanok": JeonjuHanokImg,
  "tongin-market": TonginMarketImg,
  changdeokgung: ChangdeokgungImg,
};

export function getPlaceImageUrl(place) {
  if (!place) return "";

  if (place.imageUrl) return place.imageUrl;
  if (place.thumbnailUrl) return place.thumbnailUrl;
  if (Array.isArray(place.imageUrls)) return place.imageUrls.find(Boolean) || PLACE_IMAGES[place.imageKey] || "";

  if (typeof place.imageUrls === "string" && place.imageUrls.trim()) {
    const trimmed = place.imageUrls.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.find(Boolean) || PLACE_IMAGES[place.imageKey] || "";
    } catch {
      return trimmed.split(",").map((url) => url.trim()).find(Boolean) || PLACE_IMAGES[place.imageKey] || "";
    }
  }

  return PLACE_IMAGES[place.imageKey] || "";
}
