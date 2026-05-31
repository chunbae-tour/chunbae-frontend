import { MOCK_PAY_HISTORY } from "../constants/mockData.js";
import { apiRequest, getAccessToken, getPageContent } from "./apiClient.js";

const MOCK_BALANCE = 5000;
const MOCK_QR_MERCHANT = {
  id: "merchant_001",
  name: "영호네 포장마차",
  market: "광장시장",
  rating: 4.8,
  emoji: "🍳",
  verified: true,
};

const PAYMENT_METHOD_CODES = {
  "카카오페이": "KAKAO_PAY",
  "토스페이": "TOSS_PAY",
  "신용카드": "CARD",
  "해외카드": "FOREIGN_CARD",
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

export function normalizePaymentHistoryItem(item = {}) {
  const rawType = item.type ?? item.historyType ?? item.transactionType ?? "";
  const type = PAYMENT_TYPE_LABELS[rawType] ?? rawType;
  const historyId = item.paymentHistoryId ?? item.historyId ?? item.transactionId ?? item.id;
  const amountValue = item.amount ?? item.coinAmount ?? item.yeopjeonAmount ?? 0;
  const amountText = item.amountText
    ?? item.amountLabel
    ?? `${Number(amountValue) > 0 ? "+" : ""}${Number(amountValue).toLocaleString()}`;
  const paidAmountValue = item.paidAmount ?? item.paymentAmount ?? item.wonAmount ?? item.totalPrice;
  const reviewWritable = item.reviewWritable ?? item.canWriteReview ?? (type === "결제" && !item.reviewId);

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
    date: item.createdAt ?? item.paidAt ?? item.date ?? "",
    shopId: item.shopId ?? item.storeId ?? item.merchantShopId,
    shopName: item.shopName ?? item.storeName ?? item.merchantName,
    placeId: item.placeId ?? item.marketId,
    placeName: item.placeName ?? item.marketName,
    paidAmount: typeof paidAmountValue === "number" ? `${paidAmountValue.toLocaleString()}원` : paidAmountValue,
    reviewWritable,
    reviewId: item.reviewId ?? null,
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

  return data.balance ?? MOCK_BALANCE;
}

export async function requestCharge({ amount, paymentMethod, idempotencyKey }) {
  const token = getAccessToken("USER");

  if (!token) {
    throw new PaymentApiError("로그인이 필요한 기능입니다.", "AUTH_REQUIRED");
  }

  if (amount < 5000 || amount > 100000) {
    throw new PaymentApiError("충전 금액은 5,000~100,000원만 가능합니다.", "PAYMENT_AMOUNT_INVALID");
  }

  // TODO: amount는 원화 기준입니다. 백엔드가 엽전 수량 필드를 별도로 요구하면 coinAmount 매핑을 추가합니다.
  // TODO: 백엔드에 NAVER_PAY가 추가되면 네이버페이 매핑을 별도 enum으로 분리합니다.
  return apiRequest("/payments/charge", {
    method: "POST",
    auth: true,
    role: "USER",
    headers: {
      "Idempotency-Key": idempotencyKey || createIdempotencyKey(),
    },
    body: { amount, paymentMethod: normalizePaymentMethod(paymentMethod) },
  });
}

export function getMockBalance() {
  return MOCK_BALANCE;
}

export async function fetchPaymentHistory() {
  const data = await apiRequest("/yeopjeon/histories?size=20", { auth: true, role: "USER" });
  return getPageContent(data).map(normalizePaymentHistoryItem);
}

export async function fetchQrMerchant(shopId = 201) {
  const data = await apiRequest(`/shops/${shopId}`, { auth: true, role: "USER" });
  return {
    id: data.shopId ?? data.id ?? MOCK_QR_MERCHANT.id,
    name: data.shopName ?? data.name ?? MOCK_QR_MERCHANT.name,
    market: data.marketName ?? data.market ?? MOCK_QR_MERCHANT.market,
    rating: data.rating ?? MOCK_QR_MERCHANT.rating,
    emoji: data.emoji ?? MOCK_QR_MERCHANT.emoji,
    verified: Boolean(data.isCertified ?? data.verified ?? MOCK_QR_MERCHANT.verified),
  };
}

export async function requestQrPayment({ merchantId, amount, memo }) {
  if (!merchantId) {
    throw new PaymentApiError("결제할 가게 정보가 없습니다.", "QR_MERCHANT_MISSING");
  }

  if (amount <= 0) {
    throw new PaymentApiError("결제 금액을 입력해주세요.", "QR_AMOUNT_INVALID");
  }

  return apiRequest("/payments/qr", {
    method: "POST",
    auth: true,
    role: "USER",
    body: { shopId: merchantId, amount, memo },
  });
}

export function getMockPaymentHistory() {
  return MOCK_PAY_HISTORY.map(normalizePaymentHistoryItem);
}

export function getMockQrMerchant() {
  return MOCK_QR_MERCHANT;
}
