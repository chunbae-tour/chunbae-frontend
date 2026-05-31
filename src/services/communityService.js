import { MOCK_PLACES } from "../constants/mockData.js";
import { apiRequest, getPageContent } from "./apiClient.js";

const MOCK_POSTS = [
  { id: 1, type: "동행", title: "광장시장 같이 가실 분!", author: "여행자지수", date: "5.25(토)", current: 2, max: 4, comments: 3, views: 45, place: "광장시장", content: "이번 주말에 광장시장 가려고 해요. 빈대떡이랑 마약김밥 먹고 싶은 분 같이 가요! 오전 10시 만남 예정입니다." },
  { id: 2, type: "동행", title: "경복궁 야간 투어 동행 구해요", author: "Emma", date: "5.26(일)", current: 1, max: 3, comments: 1, views: 28, place: "경복궁", content: "경복궁 야간 개장 같이 가실 분 구합니다. 영어/한국어 모두 가능합니다!" },
  {
    id: 5,
    type: "동행",
    title: "통인시장 엽전 도시락 함께 체험해요",
    author: "춘배초보",
    date: "6.02(일)",
    current: 2,
    max: 5,
    comments: 4,
    views: 76,
    place: "통인시장",
    content: "처음 통인시장에 가보는 여행자입니다. 엽전 도시락 체험하고 근처 카페까지 천천히 둘러볼 분을 찾고 있어요. 사진 찍는 걸 좋아해서 여유롭게 다니는 일정이면 좋겠습니다.",
    meetingTime: "오전 11:00",
    meetingPoint: "통인시장 고객만족센터 앞",
    route: ["통인시장 입구", "엽전 도시락 체험", "서촌 골목 산책", "카페 휴식"],
    tags: ["전통시장", "엽전도시락", "초보환영"],
    language: "한국어 / 영어 간단 가능",
    status: "모집중",
  },
  { id: 3, type: "자유", title: "통인시장 엽전 도시락 체험 팁", author: "김민준", date: "5.20", current: null, max: null, comments: 5, views: 120, place: "통인시장", content: "엽전으로 도시락 꾸미는 체험을 하려면 점심 전 도착을 추천해요. 외국인 친구들과 같이 가기에도 설명이 쉬웠습니다." },
  { id: 4, type: "자유", title: "창덕궁 후원 예약 꿀팁 공유", author: "박서연", date: "5.18", current: null, max: null, comments: 8, views: 203, place: "창덕궁", content: "후원 예약은 최소 2주 전에 해야 해요. 오전 타임이 훨씬 쾌적하고 좋습니다." },
  {
    id: 6,
    type: "자유",
    title: "경복궁 반나절 코스 공유",
    author: "Mina",
    date: "5.27",
    current: null,
    max: null,
    comments: 6,
    views: 188,
    place: "경복궁",
    content: "오전 시간에 방문하니 입장 줄이 짧고 근정전 주변도 여유로웠어요. 한복 대여 후 사진을 찍고, 점심에는 근처 전통시장으로 이동하는 코스가 좋았습니다.",
    rating: 5,
    visitDate: "2025.05.25",
    travelWith: "친구와 함께",
    goodPoints: ["동선이 단순해 처음 방문해도 편함", "사진 찍기 좋은 포인트가 많음", "시장/카페 코스로 이어가기 좋음"],
    tip: "주말에는 10시 이전 입장을 추천해요. 햇빛이 강한 날은 그늘이 적어서 물을 챙기면 좋습니다.",
    images: ["🏯", "📸", "🍵"],
  },
];

const MOCK_COMMENTS = [
  { id: 1, author: "Emma", text: "저도 가고 싶어요!", time: "10:02" },
  { id: 2, author: "여행자지수", text: "환영해요! ✌️", time: "10:05" },
];

function getCommunityPostTypePath(type) {
  return type === "동행" || type === "companions" || type === "COMPANION" ? "companions" : "free";
}

function getPlaceIdByName(placeName) {
  return MOCK_PLACES.find(place => place.name === placeName)?.id;
}

export async function fetchCommunityPosts() {
  const [companions, freePosts] = await Promise.allSettled([
    apiRequest("/community/posts/companions?size=20"),
    apiRequest("/community/posts/free?size=20"),
  ]);

  const companionPosts = companions.status === "fulfilled" ? getPageContent(companions.value).map(normalizeCompanionPost) : [];
  const reviewPosts = freePosts.status === "fulfilled" ? getPageContent(freePosts.value).map(normalizeFreePost) : [];
  if (companions.status === "rejected" && freePosts.status === "rejected") {
    throw companions.reason;
  }
  return [...companionPosts, ...reviewPosts];
}

export async function fetchCommunityComments(postId, postType = "free") {
  if (!postId) return [];

  const params = new URLSearchParams({ size: "20" });
  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}/comments?${params.toString()}`);
  return getPageContent(data).map(comment => ({
    id: comment.commentId ?? comment.id,
    author: comment.writer?.nickname ?? comment.nickname ?? comment.author ?? "여행자",
    text: comment.content ?? comment.text ?? "",
    time: comment.createdAt ?? comment.time ?? "",
  }));
}

export async function createCommunityPost(payload) {
  if (payload.type === "동행") {
    const data = await apiRequest("/community/posts/companions", {
      method: "POST",
      auth: true,
      role: "USER",
      body: {
        title: payload.title,
        content: payload.content,
        placeId: payload.placeId ?? getPlaceIdByName(payload.place),
        placeName: payload.place,
        region: payload.region ?? "",
        meetingDate: payload.date,
        maxMembers: Number(payload.maxPeople ?? payload.maxMembers ?? 4),
      },
    });
    return normalizeCompanionPost(data);
  }

  const data = await apiRequest("/community/posts/free", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { title: payload.title, content: payload.content, imageUrls: payload.imageUrls ?? [] },
  });
  return normalizeFreePost(data);
}

export async function createCommunityComment({ postId, postType = "free", text }) {
  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}/comments`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { content: text },
  });
  return {
    id: data.commentId ?? data.id ?? Date.now(),
    author: data.writer?.nickname ?? data.nickname ?? "여행자지수",
    text: data.content ?? text,
    time: data.createdAt ?? "방금",
    postId,
  };
}

function normalizeCompanionPost(post = {}) {
  return {
    ...post,
    id: post.postId ?? post.companionPostId ?? post.id,
    type: "동행",
    title: post.title ?? "",
    author: post.writerNickname ?? post.author ?? "여행자",
    date: post.meetingDate ?? post.createdAt ?? post.date ?? "",
    current: post.currentMembers ?? post.current ?? 1,
    max: post.maxMembers ?? post.max ?? 4,
    comments: post.commentCount ?? post.comments ?? 0,
    views: post.viewCount ?? post.views ?? 0,
    place: post.placeName ?? post.place ?? "",
    content: post.content ?? "",
  };
}

function normalizeFreePost(post = {}) {
  return {
    ...post,
    id: post.postId ?? post.freePostId ?? post.id,
    type: "자유",
    title: post.title ?? "",
    author: post.writerNickname ?? post.author ?? "여행자",
    date: post.createdAt ?? post.date ?? "",
    current: null,
    max: null,
    comments: post.commentCount ?? post.comments ?? 0,
    views: post.viewCount ?? post.views ?? 0,
    place: post.placeName ?? post.place ?? "자유게시판",
    content: post.content ?? "",
  };
}

export function getMockCommunityPosts() {
  return MOCK_POSTS;
}

export function getMockCommunityComments() {
  return MOCK_COMMENTS;
}
