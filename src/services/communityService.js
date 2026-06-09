import { apiRequest, getPageContent } from "./apiClient.js";

function getCommunityPostTypePath(type) {
  return type === "동행" || type === "companions" || type === "COMPANION" ? "companions" : "free";
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

export async function fetchCommunityPostDetail(postId, postType = "free") {
  if (!postId) return null;

  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}`);
  return typePath === "companions" ? normalizeCompanionPost(data) : normalizeFreePost(data);
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
        placeId: payload.placeId,
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
    chatRoomId: post.chatRoomId ?? post.roomId ?? post.chatRoom?.chatRoomId ?? null,
    type: "동행",
    title: post.title ?? "",
    author: post.writerNickname ?? post.writer?.nickname ?? post.author ?? "여행자",
    writerId: post.writerId ?? post.writer?.userId ?? post.userId ?? post.authorId ?? null,
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

export async function updateCommunityPost(postId, postType, payload) {
  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}`, {
    method: "PATCH",
    auth: true,
    role: "USER",
    body: payload,
  });
  return typePath === "companions" ? normalizeCompanionPost(data) : normalizeFreePost(data);
}

export async function deleteCommunityPost(postId, postType) {
  const typePath = getCommunityPostTypePath(postType);
  return apiRequest(`/community/posts/${typePath}/${postId}`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
}

export async function updateComment(postId, postType, commentId, text) {
  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}/comments/${commentId}`, {
    method: "PATCH",
    auth: true,
    role: "USER",
    body: { content: text },
  });
  return {
    id: data.commentId ?? data.id,
    text: data.content ?? text,
    time: data.createdAt ?? "방금",
  };
}

export async function deleteComment(postId, postType, commentId) {
  const typePath = getCommunityPostTypePath(postType);
  return apiRequest(`/community/posts/${typePath}/${postId}/comments/${commentId}`, {
    method: "DELETE",
    auth: true,
    role: "USER",
  });
}

export async function fetchReplies(postId, postType, commentId) {
  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}/comments/${commentId}/replies`, {
    auth: true,
    role: "USER",
  });
  return getPageContent(data).map(comment => ({
    id: comment.commentId ?? comment.id,
    author: comment.writer?.nickname ?? comment.nickname ?? "여행자",
    text: comment.content ?? comment.text ?? "",
    time: comment.createdAt ?? comment.time ?? "",
  }));
}
