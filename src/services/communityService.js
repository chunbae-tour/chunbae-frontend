import { apiFormRequest, apiRequest, getPageContent } from "./apiClient.js";

function getCommunityPostTypePath(type) {
  return type === "동행" || type === "companions" || type === "COMPANION" ? "companions" : "free";
}

function normalizeComment(comment = {}) {
  return {
    id: comment.commentId ?? comment.id,
    parentCommentId: comment.parentCommentId ?? null,
    author: comment.writer?.nickname ?? comment.nickname ?? comment.author ?? "여행자",
    writerId: comment.writer?.userId ?? comment.writerId ?? comment.userId ?? null,
    profileImageUrl: comment.writer?.profileImageUrl ?? comment.profileImageUrl ?? "",
    text: comment.content ?? comment.text ?? "",
    time: comment.createdAt ?? comment.time ?? "",
    updatedAt: comment.updatedAt ?? "",
    replyCount: Number(comment.replyCount ?? 0),
    deleted: Boolean(comment.deleted),
  };
}

export async function fetchCommunityPosts({ size = 100 } = {}) {
  const listParams = new URLSearchParams({ size: String(size) });

  const [companions, freePosts] = await Promise.allSettled([
    apiRequest(`/community/posts/companions?${listParams.toString()}`),
    apiRequest(`/community/posts/free?${listParams.toString()}`),
  ]);

  const companionPosts = companions.status === "fulfilled" ? getPageContent(companions.value).map(normalizeCompanionPost) : [];
  const reviewPosts = freePosts.status === "fulfilled" ? getPageContent(freePosts.value).map(normalizeFreePost) : [];
  if (companions.status === "rejected" && freePosts.status === "rejected") {
    throw companions.reason;
  }
  return {
    posts: [...companionPosts, ...reviewPosts],
    companionPage: companions.status === "fulfilled" ? companions.value : null,
    freePage: freePosts.status === "fulfilled" ? freePosts.value : null,
  };
}

export async function fetchCompanionPostsByPlace(place, { size = 50 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  const data = await apiRequest(`/community/posts/companions?${params.toString()}`);
  const placeId = place?.placeId ?? place?.id;
  const placeName = String(place?.name ?? place?.placeName ?? "").trim();

  return getPageContent(data)
    .map(normalizeCompanionPost)
    .filter((post) => {
      const postPlaceId = post.placeId ?? post.place?.placeId;
      const postPlaceName = String(post.placeName ?? post.place ?? "").trim();

      if (placeId && postPlaceId) return String(postPlaceId) === String(placeId);
      if (placeName && postPlaceName) return postPlaceName === placeName;
      return false;
    });
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
  return getPageContent(data).map(normalizeComment);
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
        targetType: payload.targetType ?? (payload.placeId ? "PLACE" : undefined),
        targetId: payload.targetId ?? payload.placeId,
        targetName: payload.targetName ?? payload.place,
        // TODO: 구 백엔드 배포 종료 후 placeId/placeName 호환 필드를 제거합니다.
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

export async function uploadFreePostImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const data = await apiFormRequest("/community/posts/free/images", {
    method: "POST",
    auth: true,
    role: "USER",
    formData,
  });

  return {
    ...data,
    key: data.objectKey ?? data.imageKey ?? data.key ?? data.imageUrl ?? data.url ?? "",
    previewUrl: data.previewUrl ?? data.presignedUrl ?? data.imageUrl ?? data.url ?? "",
  };
}

export async function createCommunityComment({ postId, postType = "free", text, parentCommentId = null }) {
  const typePath = getCommunityPostTypePath(postType);
  const data = await apiRequest(`/community/posts/${typePath}/${postId}/comments`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { content: text, ...(parentCommentId ? { parentCommentId } : {}) },
  });
  return { ...normalizeComment(data), id: data.commentId ?? data.id ?? Date.now(), text: data.content ?? text, time: data.createdAt ?? "방금", postId };
}

function normalizeCompanionPost(post = {}) {
  const meetingDate = post.meetingDate ?? post.date ?? "";
  const createdAt = post.createdAt ?? post.createdDate ?? "";
  const legacyPlaceId = post.placeId ?? post.place?.placeId ?? null;
  const rawTargetType = post.targetType ?? (legacyPlaceId != null ? "PLACE" : null);
  const targetType = rawTargetType === "TRADITIONAL_MARKET" ? "MARKET" : rawTargetType;
  const targetId = post.targetId ?? legacyPlaceId;
  const targetName = post.targetName ?? post.placeName ?? (typeof post.place === "string" ? post.place : post.place?.name) ?? "";
  return {
    ...post,
    id: post.postId ?? post.companionPostId ?? post.id,
    chatRoomId: post.chatRoomId ?? post.roomId ?? post.chatRoom?.chatRoomId ?? null,
    type: "동행",
    title: post.title ?? "",
    author: post.writerNickname ?? post.writer?.nickname ?? post.author ?? "여행자",
    writerId: post.writerId ?? post.writer?.userId ?? post.userId ?? post.authorId ?? null,
    profileImageUrl: post.writer?.profileImageUrl ?? post.profileImageUrl ?? "",
    date: meetingDate || createdAt,
    meetingDate,
    createdAt,
    current: post.currentMembers ?? post.current ?? 1,
    max: post.maxMembers ?? post.max ?? 4,
    comments: post.commentCount ?? post.comments ?? 0,
    views: post.viewCount ?? post.views ?? 0,
    targetType,
    targetId,
    targetName,
    placeId: legacyPlaceId ?? (targetType === "PLACE" ? targetId : null),
    placeName: targetName,
    place: targetName,
    content: post.content ?? "",
  };
}

function normalizeFreePost(post = {}) {
  const createdAt = post.createdAt ?? post.createdDate ?? post.date ?? "";
  const imageUrls = Array.isArray(post.imageUrls) ? post.imageUrls : [];
  return {
    ...post,
    id: post.postId ?? post.freePostId ?? post.id,
    type: "자유",
    title: post.title ?? "",
    author: post.writerNickname ?? post.writer?.nickname ?? post.author ?? "여행자",
    writerId: post.writerId ?? post.writer?.userId ?? post.userId ?? post.authorId ?? null,
    profileImageUrl: post.writer?.profileImageUrl ?? post.profileImageUrl ?? "",
    date: createdAt,
    createdAt,
    current: null,
    max: null,
    comments: post.commentCount ?? post.comments ?? 0,
    views: post.viewCount ?? post.views ?? 0,
    place: post.placeName ?? post.place ?? "자유게시판",
    content: post.content ?? "",
    imageUrls,
  };
}

export async function updateCommunityPost(postId, postType, payload) {
  const typePath = getCommunityPostTypePath(postType);
  const body = typePath === "companions"
    ? {
        title: payload.title,
        content: payload.content,
        targetType: payload.targetType ?? (payload.placeId ? "PLACE" : undefined),
        targetId: payload.targetId ?? payload.placeId,
        targetName: payload.targetName ?? payload.place ?? payload.placeName,
        // TODO: 구 백엔드 배포 종료 후 placeId/placeName 호환 필드를 제거합니다.
        placeId: payload.placeId,
        placeName: payload.place ?? payload.placeName,
        region: payload.region ?? "",
        meetingDate: payload.date ?? payload.meetingDate,
        maxMembers: Number(payload.maxPeople ?? payload.maxMembers ?? 4),
      }
    : {
        title: payload.title,
        content: payload.content,
        imageUrls: payload.imageUrls ?? [],
      };
  const data = await apiRequest(`/community/posts/${typePath}/${postId}`, {
    method: typePath === "companions" ? "PUT" : "PATCH",
    auth: true,
    role: "USER",
    body,
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
  await apiRequest(`/community/posts/${typePath}/${postId}/comments/${commentId}`, {
    method: "PATCH",
    auth: true,
    role: "USER",
    body: { content: text },
  });
  return { id: commentId, text };
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
  const data = await apiRequest(`/community/posts/${typePath}/${postId}/comments/${commentId}/replies`);
  return getPageContent(data).map(normalizeComment);
}
