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
  return place?.imageUrl || place?.imageUrls?.[0] || PLACE_IMAGES[place?.imageKey] || "";
}
