import { apiFormRequest } from "./apiClient.js";

export function normalizeAttachmentUpload(item = {}) {
  return {
    ...item,
    uploadId: item.attachmentId ?? item.fileId ?? item.uploadId ?? item.id,
    url: item.url ?? item.fileUrl ?? "",
    name: item.originalName ?? item.fileName ?? item.name ?? "",
    type: item.contentType ?? item.type ?? "",
  };
}

export async function uploadChatAttachment(file, { chatRoomId, type = "file" } = {}) {
  // TODO: 파일 업로드 API 최종 경로/필드명 확정 필요.
  // 현재 후보: POST /files/chat-attachments, multipart field: file, chatRoomId, type
  const formData = new FormData();
  formData.append("file", file);
  if (chatRoomId) formData.append("chatRoomId", String(chatRoomId));
  formData.append("type", type);

  const data = await apiFormRequest("/files/chat-attachments", {
    method: "POST",
    auth: true,
    role: "USER",
    formData,
  });

  return normalizeAttachmentUpload(data);
}

export async function uploadChatAttachments(files, options = {}) {
  const uploads = [];

  for (const item of files) {
    const upload = await uploadChatAttachment(item.file, {
      chatRoomId: options.chatRoomId,
      type: item.type,
    });

    uploads.push({
      ...item,
      ...upload,
      uploadId: upload.uploadId,
    });
  }

  return uploads;
}
