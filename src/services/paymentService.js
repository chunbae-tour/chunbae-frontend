import { apiRequest, getAccessToken, getPageContent } from "./apiClient.js";

const PAYMENT_METHOD_CODES = {
  카카오페이: "KAKAO_PAY",
  토스페이: "TOSS_PAY",
  신용카드: "CARD",
  해외카드: "FOREIGN_CARD",
  KakaoPay: "KAKAO_PAY",
  TossPay: "TOSS_PAY",
  Card: "CARD",
  Eximbay: "FOREIGN_CARD",
};

const PAYMENT_TYPE_LABELS = {
  CHARGE: "충전",
  RECHARGE: "충전",
  TOP_UP: "충전",
  PAYMENT: "결제",
  PAY: "결제",
  USE: "결제",
  QR_PAYMENT: "결제",
  REWARD: "적립",
  EARN: "적립",
  REFUND: "환불",
};

const PAYMENT_METHOD_LABELS = {
  CARD: "신용카드",
  KAKAO_PAY: "카카오페이",
  TOSS_PAY: "토스페이",
  FOREIGN_CARD: "해외카드",
};

const PAYMENT_ORDER_STATUS_LABELS = {
  PENDING: "결제 대기",
  COMPLETED: "결제 완료",
  FAILED: "결제 실패",
  CANCELLED: "결제 취소",
  REFUNDED: "환불 완료",
};

function formatDateTime(value) {
  if (!value) return "";

  const source = String(value);
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return source;

  const [, year, month, day, hourText, minute] = match;
  const hour = Number(hourText);
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 || 12;

  return `${year}.${month}.${day} ${period} ${hour12}:${minute}`;
}

function formatYeopjeonHistoryAmount(value) {
  const amount = Number(value) || 0;
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toLocaleString()}냥`;
}

class PaymentApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "PaymentApiError";
    this.code = code;
    this.status = status;
  }
}

function createIdempotencyKey() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createPaymentRequestKey() {
  return createIdempotencyKey();
}

export function normalizePaymentMethod(paymentMethod) {
  return PAYMENT_METHOD_CODES[paymentMethod] ?? paymentMethod;
}

function normalizeChargeResponse(data = {}, requestedPaymentMethod) {
  return {
    ...data,
    paymentMethodCode: normalizePaymentMethod(requestedPaymentMethod),
    easyPayProvider: data.payMethod === "EASY_PAY" ? data.easyPayProvider : undefined,
  };
}

function createPortOnePaymentRequest(payment = {}) {
  const isTossPay = payment.paymentMethodCode === "TOSS_PAY";
  const request = {
    storeId: payment.storeId,
    channelKey: payment.channelKey,
    paymentId: payment.paymentId ?? payment.orderUid,
    orderName: payment.orderName,
    totalAmount: payment.totalAmount,
    currency: payment.currency ?? "CURRENCY_KRW",
    payMethod: payment.payMethod,
  };

  if (!isTossPay) {
    request.products = [
      {
        id: payment.paymentId ?? payment.orderUid,
        name: payment.orderName,
        amount: payment.totalAmount,
        quantity: 1,
      },
    ];
    request.redirectUrl = payment.redirectUrl ?? window.location.href;
  } else {
    request.redirectUrl = payment.redirectUrl ?? window.location.href;
  }

  if (payment.easyPayProvider) {
    request.easyPay = { easyPayProvider: payment.easyPayProvider };
  }

  return request;
}

function validatePortOnePayment(payment = {}) {
  const requiredFields = [
    "storeId",
    "channelKey",
    "paymentId",
    "orderName",
    "totalAmount",
    "currency",
    "payMethod",
  ];
  const missingFields = requiredFields.filter(
    (field) => payment[field] == null || payment[field] === "",
  );

  if (missingFields.length > 0) {
    throw new PaymentApiError(
      `결제창 호출에 필요한 값이 없습니다: ${missingFields.join(", ")}`,
      "PORTONE_PAYMENT_PARAM_MISSING",
    );
  }
}

export function normalizePaymentHistoryItem(item = {}) {
  const rawType = item.type ?? item.historyType ?? item.transactionType ?? "";
  const type = PAYMENT_TYPE_LABELS[rawType] ?? rawType;
  const historyId = item.paymentHistoryId ?? item.historyId ?? item.transactionId ?? item.id;
  const amountValue = item.amount ?? item.coinAmount ?? item.yeopjeonAmount ?? 0;
  const amountText =
    item.amountText ?? item.amountLabel ?? formatYeopjeonHistoryAmount(amountValue);
  const paidAmountValue =
    item.paidAmount ?? item.paymentAmount ?? item.wonAmount ?? item.totalPrice;
  const reviewWritable =
    item.reviewWritable ?? item.canWriteReview ?? (type === "결제" && !item.reviewId);

  return {
    ...item,
    id: historyId,
    historyId,
    paymentHistoryId: historyId,
    type,
    rawType,
    desc: item.description ?? item.desc ?? item.reason ?? item.shopName ?? "엽전 내역",
    amount: amountText,
    rawAmount: amountValue,
    shopId: item.shopId ?? item.storeId ?? item.merchantShopId,
    shopName: item.shopName ?? item.storeName ?? item.merchantName,
    placeId: item.placeId ?? item.marketId,
    placeName: item.placeName ?? item.marketName,
    rawDate: item.createdAt ?? item.paidAt ?? item.date ?? "",
    date: formatDateTime(item.createdAt ?? item.paidAt ?? item.date ?? ""),
    paidAmount:
      typeof paidAmountValue === "number"
        ? `${paidAmountValue.toLocaleString()}원`
        : paidAmountValue,
    reviewWritable,
    reviewId: item.reviewId ?? null,
  };
}

export function normalizeChargeRefundHistoryItem(item = {}) {
  const amountValue = item.amount ?? item.totalAmount ?? item.paymentAmount ?? 0;
  const status = item.status ?? "";
  const paymentMethod = item.paymentMethod ?? item.payMethod ?? "";
  const orderUid = item.orderUid ?? item.paymentId ?? item.id;

  return {
    ...item,
    id: item.id ?? orderUid,
    orderUid,
    title: PAYMENT_ORDER_STATUS_LABELS[status] ?? status ?? "충전/환불 내역",
    amount: `${Number(amountValue || 0).toLocaleString()}원`,
    rawAmount: amountValue,
    paymentMethodLabel: PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod ?? "결제수단",
    status,
    statusLabel: PAYMENT_ORDER_STATUS_LABELS[status] ?? status,
    rawDate: item.createdAt ?? item.paidAt ?? item.updatedAt ?? "",
    date: formatDateTime(item.createdAt ?? item.paidAt ?? item.updatedAt ?? ""),
    updatedAt: item.updatedAt ?? "",
  };
}

export function isPaymentHistoryPayment(item = {}) {
  return item.type === "결제" || ["PAYMENT", "PAY", "USE", "QR_PAYMENT"].includes(item.rawType);
}

export async function fetchYeopjeonBalance() {
  const token = getAccessToken("USER");

  if (!token) {
    throw new PaymentApiError("로그인이 필요한 기능입니다.", "AUTH_REQUIRED");
  }

  const data = await apiRequest("/yeopjeon/balance", { auth: true, role: "USER" });

  return Number(data.balance ?? 0);
}

export async function requestCharge({ amount, paymentMethod, idempotencyKey }) {
  const token = getAccessToken("USER");

  if (!token) {
    throw new PaymentApiError("로그인이 필요한 기능입니다.", "AUTH_REQUIRED");
  }

  if (amount < 5000 || amount > 100000) {
    throw new PaymentApiError(
      "충전 금액은 5,000~100,000원만 가능합니다.",
      "PAYMENT_AMOUNT_INVALID",
    );
  }

  // TODO: amount는 원화 기준입니다. 백엔드가 엽전 수량 필드를 별도로 요구하면 coinAmount 매핑을 추가합니다.
  // TODO: 백엔드에 NAVER_PAY가 추가되면 네이버페이 매핑을 별도 enum으로 분리합니다.
  const data = await apiRequest("/payments/charge", {
    method: "POST",
    auth: true,
    role: "USER",
    headers: {
      "Idempotency-Key": idempotencyKey || createIdempotencyKey(),
    },
    body: { amount, paymentMethod: normalizePaymentMethod(paymentMethod) },
  });

  return normalizeChargeResponse(data, paymentMethod);
}

const PORTONE_PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

export async function requestPortOnePayment(payment) {
  const paymentRequest = createPortOnePaymentRequest(payment);
  validatePortOnePayment(paymentRequest);

  const PortOne = await import(/* @vite-ignore */ "https://cdn.portone.io/v2/browser-sdk.esm.js");
  console.info("PortOne payment request", paymentRequest);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new PaymentApiError("결제 시간이 초과되었습니다. 다시 시도해주세요.", "PAYMENT_TIMEOUT")),
      PORTONE_PAYMENT_TIMEOUT_MS,
    ),
  );

  const result = await Promise.race([PortOne.requestPayment(paymentRequest), timeoutPromise]);

  if (result?.code) {
    throw new PaymentApiError(result.message || "결제창 요청에 실패했습니다.", result.code);
  }

  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPaymentHistory() {
  const data = await apiRequest("/yeopjeon/histories?size=20", { auth: true, role: "USER" });
  return getPageContent(data).map(normalizePaymentHistoryItem);
}

export async function fetchChargeRefundHistory({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/payments/history?${params.toString()}`, {
    auth: true,
    role: "USER",
  });
  return getPageContent(data).map(normalizeChargeRefundHistoryItem);
}

export async function waitForChargeSettlement({
  orderUid,
  previousBalance,
  attempts = 8,
  intervalMs = 1500,
} = {}) {
  let latestBalance = null;
  let matchedOrder = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(intervalMs);

    const [historyResult, balanceResult] = await Promise.allSettled([
      fetchChargeRefundHistory({ size: 20 }),
      fetchYeopjeonBalance(),
    ]);

    if (historyResult.status === "fulfilled") {
      matchedOrder =
        historyResult.value.find((item) => {
          const identifiers = [item.orderUid, item.paymentId, item.id].filter(Boolean).map(String);
          return orderUid ? identifiers.includes(String(orderUid)) : false;
        }) ?? matchedOrder;
    }

    if (balanceResult.status === "fulfilled") {
      latestBalance = balanceResult.value;
    }

    if (matchedOrder?.status === "COMPLETED") {
      return { status: "completed", order: matchedOrder, balance: latestBalance };
    }

    if (latestBalance != null && previousBalance != null && latestBalance > previousBalance) {
      return { status: "balance-updated", order: matchedOrder, balance: latestBalance };
    }
  }

  return { status: "pending", order: matchedOrder, balance: latestBalance };
}

export async function requestRefund(orderId, reason = "사용자 환불 요청") {
  return apiRequest(`/payments/${orderId}/refund`, {
    method: "POST",
    auth: true,
    role: "USER",
    body: { reason },
  });
}

export async function cancelChargeOrder(orderId) {
  await apiRequest(`/payments/${orderId}/cancel`, {
    method: "POST",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function cancelRefund(refundId) {
  await apiRequest(`/payments/refund/${refundId}/cancel`, {
    method: "PATCH",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function fetchRefundHistory({ cursor, size = 20 } = {}) {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", cursor);
  const data = await apiRequest(`/payments/refunds?${params.toString()}`, {
    auth: true,
    role: "USER",
  });
  return getPageContent(data);
}

export async function fetchQrPaymentStatus(payRequestId) {
  return apiRequest(`/payments/qr/${payRequestId}/status`, { auth: true, role: "USER" });
}

export async function cancelQrPaymentRequest(payRequestId) {
  await apiRequest(`/payments/qr/${payRequestId}/cancel`, {
    method: "POST",
    auth: true,
    role: "USER",
  });
  return true;
}

export async function fetchQrMerchant(shopId = 201) {
  const data = await apiRequest(`/shops/${shopId}`, { auth: true, role: "USER" });
  return {
    id: data.shopId ?? data.id,
    name: data.shopName ?? data.name ?? "",
    market: data.marketName ?? data.market ?? "",
    rating: data.rating ?? 0,
    emoji: data.emoji ?? "",
    verified: Boolean(data.isCertified ?? data.verified),
  };
}

export async function requestQrPayment({ merchantId, amount, memo }) {
  if (!merchantId) {
    throw new PaymentApiError("결제할 가게 정보가 없습니다.", "QR_MERCHANT_MISSING");
  }

  if (amount <= 0) {
    throw new PaymentApiError("결제 금액을 입력해주세요.", "QR_AMOUNT_INVALID");
  }

  const data = await apiRequest("/payments/qr", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { shopId: merchantId, amount, memo },
  });

  return {
    ...data,
    payRequestId: data.payRequestId ?? data.paymentRequestId ?? data.requestId ?? data.id,
  };
}
