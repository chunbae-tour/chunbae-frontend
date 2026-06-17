import { apiFormRequest } from "./apiClient.js";

export function normalizeAttachmentUpload(item = {}) {
  const fileUrl = item.fileUrl ?? item.url ?? "";
  const fileName = item.fileName ?? item.originalName ?? item.name ?? "";
  const contentType = item.contentType ?? "";
  const fileSize = item.fileSize ?? item.size ?? 0;
  const messageType = item.messageType ?? (contentType.startsWith("image/") ? "IMAGE" : "FILE");

  return {
    ...item,
    uploadId: item.attachmentId ?? item.fileId ?? item.uploadId ?? item.id,
    url: fileUrl,
    fileUrl,
    name: fileName,
    fileName,
    fileSize,
    contentType,
    messageType,
    previewType: messageType === "IMAGE" ? "image" : "file",
  };
}

export async function uploadChatAttachment(file, { chatRoomId, type = "file" } = {}) {
  if (!chatRoomId) {
    throw new Error("채팅방 ID가 없어 파일을 업로드할 수 없습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const data = await apiFormRequest(`/chat/rooms/${chatRoomId}/files`, {
    method: "POST",
    auth: true,
    role: "USER",
    formData,
  });

  return normalizeAttachmentUpload({
    ...data,
    type,
    name: data?.fileName ?? file.name,
    size: data?.fileSize ?? file.size,
    contentType: data?.contentType ?? file.type,
  });
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
