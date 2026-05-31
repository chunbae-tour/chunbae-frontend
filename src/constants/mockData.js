export const MOCK_PLACES = [
  { id: 1, name: "경복궁", type: "관광지", dist: "500m", rating: 4.8, reviews: 312, emoji: "🏯", imageKey: "gyeongbokgung", lat: 37.5796, lng: 126.977, addr: "서울 종로구 사직로 161", hours: "09:00 ~ 18:00", desc: "조선 왕조의 법궁으로 1395년에 창건되었습니다. 서울 중심부에 위치한 대표적인 역사 명소입니다." },
  { id: 2, name: "광장시장", type: "전통시장", dist: "320m", rating: 4.5, reviews: 128, emoji: "🛍️", imageKey: "gwangjang-market", lat: 37.5704, lng: 126.9996, addr: "서울 종로구 창경궁로 88", hours: "09:00 ~ 23:00", desc: "서울 종로구에 위치한 100년 전통의 재래시장. 빈대떡, 마약김밥 등 먹거리로 유명합니다." },
  { id: 5, name: "전주한옥마을", type: "관광지", dist: "2.4km", rating: 4.6, reviews: 246, emoji: "🏘️", imageKey: "jeonju-hanok", lat: 35.815, lng: 127.153, addr: "전북 전주시 완산구 기린대로 99", hours: "상시 개방", desc: "한옥 골목과 전통 먹거리를 함께 즐길 수 있는 전주의 대표 로컬 여행지입니다." },
  { id: 4, name: "통인시장", type: "전통시장", dist: "800m", rating: 4.3, reviews: 87, emoji: "🐟", imageKey: "tongin-market", lat: 37.5792, lng: 126.9707, addr: "서울 종로구 자하문로15길 18", hours: "08:00 ~ 20:00", desc: "엽전을 사용해 도시락을 꾸밀 수 있는 체험형 전통시장입니다." },
  { id: 3, name: "창덕궁", type: "관광지", dist: "1.2km", rating: 4.7, reviews: 203, emoji: "🌸", imageKey: "changdeokgung", lat: 37.5794, lng: 126.991, addr: "서울 종로구 율곡로 99", hours: "09:00 ~ 17:30", desc: "유네스코 세계문화유산으로 등재된 조선시대 궁궐. 아름다운 후원이 유명합니다." },
];

export const MOCK_FESTIVALS = [
  { id: 1, name: "서울 빛초롱 축제", location: "청계천", date: "6.1 ~ 6.15", dday: "D-15", month: "JUN", day: "01", color: "#1A1A2E", accentColor: "#FFB41E" },
  { id: 2, name: "종로 한복 페스티벌", location: "종로 일대", date: "6.14 ~ 6.16", dday: "D-28", month: "JUN", day: "14", color: "#0F6E56", accentColor: "#9FE1CB" },
  { id: 3, name: "인사동 공예 마켓", location: "인사동", date: "6.20 ~ 6.22", dday: "D-34", month: "JUN", day: "20", color: "#D85A30", accentColor: "#F0997B" },
];

export const MOCK_CHATS = [
  { id: 1, title: "광장시장 같이 가요 🛍️", members: 4, maxMembers: 6, date: "오늘", lastMsg: "내일 오전 10시에 만나요!", unread: 2, tags: ["전통시장", "종로"] },
  { id: 2, title: "경복궁 야간 투어", members: 3, maxMembers: 4, date: "어제", lastMsg: "사진 찍기 좋은 포인트 알려드릴게요", unread: 0, tags: ["관광지", "야간"] },
  { id: 3, title: "외국인 친구와 함께하는 서울 투어", members: 2, maxMembers: 5, date: "2일전", lastMsg: "영어 가능하신 분 환영합니다", unread: 0, tags: ["외국인", "영어"] },
  { id: 4, title: "망원시장 야식 산책방", members: 2, maxMembers: 4, date: "방금", lastMsg: "호떡집 앞에서 만나요!", unread: 1, tags: ["야시장", "먹거리"] },
];

export const MOCK_NOTIFICATIONS = [
  { id: 1, text: "Emma님이 '광장시장 같이 가요' 채팅방 참여를 신청했습니다.", time: "방금", read: false, icon: "🔔" },
  { id: 2, text: "참여 신청이 수락되었습니다. '경복궁 야간 투어'에 참여하세요!", time: "어제", read: true, icon: "✅" },
  { id: 3, text: "여행자지수님이 남긴 리뷰에 좋아요가 10개 달렸습니다.", time: "2일전", read: true, icon: "❤️" },
];

export const MOCK_PAY_HISTORY = [
  { id: 1, type: "충전", desc: "엽전 충전", amount: "+5,000", date: "2025.05.15" },
  { id: 2, type: "결제", desc: "광장시장 영호네 포장마차", shopId: 201, shopName: "영호네 포장마차", placeName: "광장시장", paidAmount: "12,000원", amount: "-1,200", date: "2025.05.14", reviewWritable: true },
  { id: 3, type: "충전", desc: "엽전 충전", amount: "+10,000", date: "2025.05.10" },
  { id: 4, type: "결제", desc: "통인시장 도시락 카페", shopId: 204, shopName: "도시락 카페", placeName: "통인시장", paidAmount: "8,000원", amount: "-800", date: "2025.05.08", reviewWritable: false, reviewId: "shop_review_204_001" },
  { id: 5, type: "적립", desc: "리뷰 작성 보상", amount: "+500", date: "2025.05.05" },
  { id: 6, type: "결제", desc: "광장시장 순희네 빈대떡", shopId: 205, shopName: "순희네 빈대떡", placeName: "광장시장", paidAmount: "15,000원", amount: "-1,500", date: "2025.05.22", reviewWritable: true },
];
