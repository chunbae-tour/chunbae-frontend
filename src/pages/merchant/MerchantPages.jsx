import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import {
  addMerchantMenu,
  addMerchantShopNotice,
  approveMerchantPaymentRequest,
  deleteMerchantShopNotice,
  deleteMerchantMenu,
  deleteMerchantShopImage,
  fetchMerchantHome,
  fetchMerchantMenus,
  fetchMerchantPaymentRequests,
  fetchMerchantSettlements,
  fetchMerchantShop,
  fetchMerchantShopImages,
  fetchMerchantShopNotices,
  fetchMerchantShops,
  fetchMerchantWallet,
  rejectMerchantPaymentRequest,
  reissueShopQrCode,
  requestMerchantSettlement,
  updateMerchantMenu,
  updateMerchantShop,
  updateMerchantShopStatus,
  uploadMerchantShopImage,
  useCustomerItemByToken,
} from "../../services/merchantService.js";

const MIN_SETTLEMENT_AMOUNT = 5000;
const EMPTY_SHOP = {
  id: "",
  name: "",
  category: "",
  market: "",
  address: "",
  phone: "",
  description: "",
  operatingHours: "",
  holiday: "",
  rating: 0,
  reviewCount: 0,
  verified: false,
  status: "",
  imageUrls: [],
};
const EMPTY_WALLET = {
  balance: 0,
  pendingSettlement: 0,
  totalEarned: 0,
};
const EMPTY_MERCHANT_HOME = {
  todaySalesAmount: 0,
  todaySalesDate: "",
  recentPayments: [],
};
const SHOP_STATUS_LABELS = {
  ACTIVE: "영업중",
  CLOSED: "영업종료",
  SUSPENDED: "운영정지",
};

// ─── 상인 가게 관리 ───────────────────────────────────────────────────
export function MerchantShopPage({ onBack, showToast, onMenuManage, onSettlement, selectedShopId, onShopChange }) {
  const [shop, setShop] = useState(EMPTY_SHOP);
  const [shops, setShops] = useState([]);
  const [wallet, setWallet] = useState(EMPTY_WALLET);
  const [merchantHome, setMerchantHome] = useState(EMPTY_MERCHANT_HOME);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [notices, setNotices] = useState([]);
  const [shopImages, setShopImages] = useState([]);
  const [status, setStatus] = useState("loading");
  const [requestStatus, setRequestStatus] = useState("loading");
  const [noticeStatus, setNoticeStatus] = useState("loading");
  const [imageStatus, setImageStatus] = useState("loading");
  const [isShopEditorOpen, setIsShopEditorOpen] = useState(false);
  const [shopForm, setShopForm] = useState({
    name: "",
    category: "",
    address: "",
    phone: "",
    description: "",
    operatingHours: "",
    holiday: "",
  });
  const [isSavingShop, setIsSavingShop] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "" });
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [isUploadingShopImage, setIsUploadingShopImage] = useState(false);
  const [deletingShopImageId, setDeletingShopImageId] = useState("");
  const [itemUseToken, setItemUseToken] = useState("");
  const [itemUseStatus, setItemUseStatus] = useState("idle");
  const [itemUseResult, setItemUseResult] = useState(null);
  const [qrReissuing, setQrReissuing] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadMerchantDashboard() {
      setStatus("loading");
      setRequestStatus("loading");
      setNoticeStatus("loading");
      setImageStatus("loading");

      const shopList = await fetchMerchantShops();
      if (ignore) return;

      if (shopList.length === 0) {
        setShops([]);
        setShop(EMPTY_SHOP);
        setWallet(EMPTY_WALLET);
        setMerchantHome(EMPTY_MERCHANT_HOME);
        setPaymentRequests([]);
        setNotices([]);
        setShopImages([]);
        setStatus("empty");
        setRequestStatus("empty");
        setNoticeStatus("empty");
        setImageStatus("empty");
        return;
      }

      const nextShops = shopList;
      const effectiveShopId = selectedShopId ?? nextShops[0]?.id;
      setShops(nextShops);
      if (!selectedShopId && effectiveShopId) {
        onShopChange?.(effectiveShopId);
      }

      const [shopResult, walletResult, requestResult, homeResult] = await Promise.allSettled([
        fetchMerchantShop(effectiveShopId),
        fetchMerchantWallet(effectiveShopId),
        fetchMerchantPaymentRequests(effectiveShopId),
        fetchMerchantHome(),
      ]);
      const noticeResult = await fetchMerchantShopNotices(effectiveShopId)
        .then(value => ({ status: "fulfilled", value }))
        .catch(error => ({ status: "rejected", reason: error }));
      const imageResult = await fetchMerchantShopImages(effectiveShopId)
        .then(value => ({ status: "fulfilled", value }))
        .catch(error => ({ status: "rejected", reason: error }));

      if (ignore) return;
      setShop(shopResult.status === "fulfilled" ? shopResult.value : (nextShops.find(item => String(item.id) === String(effectiveShopId)) ?? EMPTY_SHOP));
      setWallet(walletResult.status === "fulfilled" ? walletResult.value : EMPTY_WALLET);
      setMerchantHome(homeResult.status === "fulfilled" ? homeResult.value : EMPTY_MERCHANT_HOME);
      setPaymentRequests(requestResult.status === "fulfilled" ? requestResult.value : []);
      setNotices(noticeResult.status === "fulfilled" ? noticeResult.value : []);
      setShopImages(imageResult.status === "fulfilled" ? imageResult.value : []);
      setStatus(shopResult.status === "fulfilled" ? "success" : "error");
      setRequestStatus(requestResult.status === "fulfilled" ? (requestResult.value.length > 0 ? "success" : "empty") : "error");
      setNoticeStatus(noticeResult.status === "fulfilled" ? (noticeResult.value.length > 0 ? "success" : "empty") : "error");
      setImageStatus(imageResult.status === "fulfilled" ? (imageResult.value.length > 0 ? "success" : "empty") : "error");
    }

    loadMerchantDashboard()
      .catch(() => {
        if (ignore) return;
        setShops([]);
        setShop(EMPTY_SHOP);
        setWallet(EMPTY_WALLET);
        setMerchantHome(EMPTY_MERCHANT_HOME);
        setPaymentRequests([]);
        setNotices([]);
        setShopImages([]);
        setStatus("error");
        setRequestStatus("error");
        setNoticeStatus("error");
        setImageStatus("error");
      });

    return () => { ignore = true; };
  }, [selectedShopId, onShopChange]);

  const handlePaymentRequest = async (requestId, action) => {
    const nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const apiCall = action === "approve" ? approveMerchantPaymentRequest : rejectMerchantPaymentRequest;
    try {
      await apiCall(requestId);
      setPaymentRequests(prev => prev.map(item => item.id === requestId ? { ...item, status: nextStatus } : item));
      showToast(action === "approve" ? "결제 요청을 승인했습니다." : "결제 요청을 거절했습니다.");
    } catch {
      showToast(action === "approve" ? "결제 요청 승인에 실패했습니다." : "결제 요청 거절에 실패했습니다.");
    }
  };

  const currentShopId = selectedShopId ?? shop.id ?? "";
  const sortedShopImages = [...shopImages].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.type !== b.type) return a.type === "PROFILE" ? -1 : 1;
    return Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
  });
  const profileShopImage = sortedShopImages.find(item => item.type === "PROFILE" || item.isPrimary);
  const shopImagePreview = [
    profileShopImage?.url || profileShopImage?.imageUrl,
    shop.thumbnailUrl,
    ...(Array.isArray(shop.imageUrls) ? shop.imageUrls : []),
    ...sortedShopImages.map(item => item.url || item.imageUrl),
  ]
    .find(value => typeof value === "string" && (/^https?:\/\//.test(value) || value.startsWith("/")));
  const handleShopSelect = (event) => {
    onShopChange?.(event.target.value);
  };

  const openShopEditor = () => {
    setShopForm({
      name: shop.name ?? "",
      category: shop.category ?? "",
      address: shop.address ?? "",
      phone: shop.phone ?? "",
      description: shop.description ?? "",
      operatingHours: shop.operatingHours ?? "",
      holiday: shop.holiday ?? "",
    });
    setIsShopEditorOpen(true);
  };

  const handleShopFormChange = (key, value) => {
    setShopForm(prev => ({ ...prev, [key]: value }));
  };

  const handleShopSave = async () => {
    if (!shopForm.name.trim() || !shopForm.address.trim()) {
      showToast("가게명과 주소를 입력해주세요.");
      return;
    }

    setIsSavingShop(true);
    try {
      const updatedShop = await updateMerchantShop(currentShopId, shopForm);
      setShop(updatedShop);
      setShops(prev => prev.map(item => String(item.id) === String(updatedShop.id) ? { ...item, ...updatedShop } : item));
      setIsShopEditorOpen(false);
      showToast("가게 정보가 수정되었습니다.");
    } catch {
      showToast("가게 정보 수정에 실패했습니다. 백엔드 연결 상태를 확인해주세요.");
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleQrReissue = async () => {
    const targetShopId = shop?.id ?? selectedShopId;
    if (!targetShopId) {
      showToast("QR을 재발급할 가게를 먼저 선택해주세요.");
      return;
    }
    if (!window.confirm("기존 QR은 더 이상 사용할 수 없게 됩니다. 새 QR로 재발급할까요?")) return;

    setQrReissuing(true);
    try {
      await reissueShopQrCode(targetShopId);
      showToast("가게 QR을 재발급했습니다.");
    } catch (error) {
      showToast(getApiErrorHint(error));
    } finally {
      setQrReissuing(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!currentShopId || shop.status === nextStatus || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updatedShop = await updateMerchantShopStatus(currentShopId, nextStatus);
      const nextShop = { ...updatedShop, status: nextStatus };
      setShop(nextShop);
      setShops(prev => prev.map(item => String(item.id) === String(nextShop.id) ? { ...item, ...nextShop } : item));
      showToast(`${SHOP_STATUS_LABELS[nextStatus] ?? nextStatus} 상태로 변경했습니다.`);
    } catch {
      showToast("가게 상태 변경에 실패했습니다. 백엔드 연결 상태를 확인해주세요.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleShopImageUpload = async (event, type = "GALLERY") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isUploadingShopImage) return;
    if (!currentShopId) {
      showToast("사진을 업로드할 가게를 먼저 선택해주세요.");
      return;
    }

    setIsUploadingShopImage(true);
    try {
      await uploadMerchantShopImage(currentShopId, file, type);
      const [refreshedShop, refreshedImages] = await Promise.all([
        fetchMerchantShop(currentShopId),
        fetchMerchantShopImages(currentShopId),
      ]);
      setShop(refreshedShop);
      setShops(prev => prev.map(item => String(item.id) === String(refreshedShop.id) ? { ...item, ...refreshedShop } : item));
      setShopImages(refreshedImages);
      setImageStatus(refreshedImages.length > 0 ? "success" : "empty");
      showToast(type === "PROFILE" ? "대표 사진을 변경했습니다." : "소개 사진을 추가했습니다.");
    } catch (error) {
      showToast(getApiErrorHint(error));
    } finally {
      setIsUploadingShopImage(false);
    }
  };

  const handleShopImageDelete = async (imageId) => {
    if (!currentShopId || !imageId || deletingShopImageId) return;
    if (!window.confirm("이 가게 사진을 삭제할까요?")) return;

    setDeletingShopImageId(String(imageId));
    try {
      await deleteMerchantShopImage(currentShopId, imageId);
      const nextImages = shopImages.filter(item => String(item.imageId ?? item.id) !== String(imageId));
      setShopImages(nextImages);
      setImageStatus(nextImages.length > 0 ? "success" : "empty");
      showToast("가게 사진을 삭제했습니다.");
    } catch (error) {
      showToast(getApiErrorHint(error));
    } finally {
      setDeletingShopImageId("");
    }
  };

  const handleNoticeSave = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      showToast("공지 제목과 내용을 입력해주세요.");
      return;
    }
    setIsSavingNotice(true);
    try {
      const createdNotice = await addMerchantShopNotice(currentShopId, {
        title: noticeForm.title.trim(),
        content: noticeForm.content.trim(),
      });
      setNotices(prev => [createdNotice, ...prev]);
      setNoticeForm({ title: "", content: "" });
      setNoticeStatus("success");
      showToast("가게 공지를 등록했습니다.");
    } catch {
      showToast("가게 공지 등록에 실패했습니다. 백엔드 연결 상태를 확인해주세요.");
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleNoticeDelete = async (noticeId) => {
    try {
      await deleteMerchantShopNotice(currentShopId, noticeId);
      setNotices(prev => prev.filter(item => item.id !== noticeId));
      showToast("가게 공지를 삭제했습니다.");
    } catch {
      showToast("가게 공지 삭제에 실패했습니다.");
    }
  };

  const handleUseCustomerItem = async () => {
    const token = itemUseToken.trim();
    if (!token) {
      showToast("사용자 아이템 코드를 입력해주세요.");
      return;
    }

    setItemUseStatus("loading");
    setItemUseResult(null);
    try {
      const result = await useCustomerItemByToken({ shopId: currentShopId, token });
      setItemUseResult(result);
      setItemUseStatus("success");
      setItemUseToken("");
      showToast("사용자 아이템을 사용 처리했습니다.");
    } catch {
      setItemUseStatus("error");
      showToast("아이템 사용 처리에 실패했습니다. 코드와 가게 정보를 확인해주세요.");
    }
  };

  return (
    <div style={S.screen} className="merchant-dashboard-page">
      <div style={{ background: COLORS.primary, padding: "44px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>상인 대시보드</div>
      </div>
      <div className="merchant-workspace-tabs" role="tablist" aria-label="상인 업무">
        <button type="button" className="active" role="tab" aria-selected="true">가게 홈</button>
        <button type="button" role="tab" onClick={() => document.getElementById("merchant-qr-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>QR 승인</button>
        <button type="button" role="tab" onClick={onMenuManage}>메뉴</button>
        <button type="button" role="tab" onClick={onSettlement}>정산</button>
      </div>
      <div style={S.scrollArea}>
        <div className="merchant-shop-selector">
          <label htmlFor="merchant-shop-select">가게 선택</label>
          <select
            id="merchant-shop-select"
            value={currentShopId}
            onChange={handleShopSelect}
            disabled={shops.length <= 1}
          >
            {shops.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <span>{shops.length.toLocaleString()}개 가게</span>
        </div>
        {status === "error" && (
          <div style={{ margin: "0 16px 12px" }}>
            <ErrorState
              title="가게 정보를 불러오지 못했습니다."
              description="상인 계정의 가게 등록 상태와 백엔드 연결 상태를 확인해주세요."
            />
          </div>
        )}
        {status === "empty" && (
          <div style={{ margin: "0 16px 12px" }}>
            <EmptyState
              icon="가게"
              title="등록된 가게가 없습니다."
              description="상인 신청 승인 후 가게가 생성되면 이 화면에서 관리할 수 있습니다."
            />
          </div>
        )}
        <div className="merchant-dashboard-summary">
          <div>
            <span>오늘 매출</span>
            <strong>{merchantHome.todaySalesAmount.toLocaleString()}원</strong>
          </div>
          <div>
            <span>대기 승인</span>
            <strong>{paymentRequests.filter(item => item.status === "PENDING_CONFIRM").length}건</strong>
          </div>
          <div>
            <span>수익 잔액</span>
            <strong>{wallet.balance.toLocaleString()}전</strong>
          </div>
          <div className="merchant-summary-action" onClick={onSettlement}>
            <span>정산 가능</span>
            <strong>{(wallet.pendingSettlement || wallet.balance).toLocaleString()}전</strong>
          </div>
        </div>
        <div className="merchant-info-panel">
          <div className="merchant-info-head">
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>
                {shop.name}
                {shop.verified && <span style={{ fontSize: 14, background: COLORS.greenBg, color: COLORS.green, borderRadius: 6, padding: "2px 8px", marginLeft: 8 }}>✅ 인증</span>}
                {shop.status && <span className={`merchant-shop-status ${String(shop.status).toLowerCase()}`}>{SHOP_STATUS_LABELS[shop.status] ?? shop.status}</span>}
              </div>
              <div style={{ color: "#E8A020", fontSize: 14 }}>★ {shop.rating} · 리뷰 {shop.reviewCount}개</div>
            </div>
            <button type="button" onClick={openShopEditor}>수정</button>
          </div>
          <div className="merchant-info-grid">
            {[
              ["🏷️ 카테고리", shop.category],
              ["📍 주소", shop.address],
              ["☎️ 전화번호", shop.phone],
              ["🕐 영업시간", shop.operatingHours],
              ["📅 휴무", shop.holiday],
              ["📝 설명", shop.description],
            ].filter(([, value]) => value).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: COLORS.textMuted, minWidth: 74 }}>{k}</span>
                <span style={{ color: COLORS.primary }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="merchant-ops-panel">
          <div className="merchant-section-head">
            <div>
              <span>가게 운영 설정</span>
              <small>사진, 영업 상태, 사용자 공지를 관리합니다.</small>
            </div>
          </div>
          <div className="merchant-ops-grid">
            <div className="merchant-status-card">
              <strong>영업 상태</strong>
              <small>사용자에게 노출되는 가게 상태입니다.</small>
              {shop.status === "SUSPENDED" ? (
                <em>관리자 조치로 운영정지 상태입니다.</em>
              ) : (
                <div>
                  {["ACTIVE", "CLOSED"].map(nextStatus => (
                    <button
                      key={nextStatus}
                      type="button"
                      className={shop.status === nextStatus ? "active" : ""}
                      aria-pressed={shop.status === nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      disabled={isUpdatingStatus}
                    >
                      {shop.status === nextStatus ? "✓ " : ""}{SHOP_STATUS_LABELS[nextStatus]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="merchant-image-card">
              <strong>가게 사진</strong>
              <small>S3에 사진을 업로드하고 사용자 화면의 가게 이미지로 반영합니다.</small>
              {shopImagePreview && (
                <img src={shopImagePreview} alt={`${shop.name || "가게"} 대표 사진`} />
              )}
              <div className="merchant-image-actions">
                <label className={isUploadingShopImage || !currentShopId ? "disabled" : ""}>
                  {isUploadingShopImage ? "업로드 중" : "대표 사진 등록"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handleShopImageUpload(event, "PROFILE")}
                    disabled={isUploadingShopImage || !currentShopId}
                  />
                </label>
                <label className={isUploadingShopImage || !currentShopId ? "disabled secondary" : "secondary"}>
                  {isUploadingShopImage ? "업로드 중" : "소개 사진 추가"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handleShopImageUpload(event, "GALLERY")}
                    disabled={isUploadingShopImage || !currentShopId}
                  />
                </label>
              </div>
              {imageStatus === "loading" && <small className="merchant-image-empty">사진 목록을 불러오는 중입니다.</small>}
              {imageStatus === "error" && <small className="merchant-image-empty">사진 목록을 불러오지 못했습니다.</small>}
              {imageStatus !== "loading" && imageStatus !== "error" && shopImages.length === 0 && (
                <small className="merchant-image-empty">등록된 가게 사진이 없습니다.</small>
              )}
              {shopImages.length > 0 && (
                <div className="merchant-image-list">
                  {sortedShopImages.map(image => {
                    const imageId = image.imageId ?? image.id;
                    const imageUrl = image.url || image.imageUrl;
                    return (
                      <figure key={imageId || imageUrl}>
                        {imageUrl ? <img src={imageUrl} alt={`${shop.name || "가게"} 사진`} /> : <span>이미지 URL 없음</span>}
                        <figcaption>
                          <span className={image.type === "PROFILE" || image.isPrimary ? "merchant-image-type-badge" : "merchant-image-type-badge gallery"}>
                            {image.type === "PROFILE" || image.isPrimary ? "대표" : "소개"}
                          </span>
                        </figcaption>
                        <button
                          type="button"
                          onClick={() => handleShopImageDelete(imageId)}
                          disabled={!imageId || deletingShopImageId === String(imageId)}
                        >
                          {deletingShopImageId === String(imageId) ? "삭제 중" : "삭제"}
                        </button>
                      </figure>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="merchant-notice-panel">
          <div className="merchant-section-head">
            <div>
              <span>가게 공지</span>
              <small>휴무, 재료 소진, 이벤트 안내를 사용자에게 보여줍니다.</small>
            </div>
            <strong>{notices.length}건</strong>
          </div>
          {noticeStatus === "error" && <div className="merchant-api-note">공지 목록을 불러오지 못했습니다. 백엔드 연결 상태를 확인해주세요.</div>}
          <div className="merchant-notice-form">
            <input
              value={noticeForm.title}
              onChange={event => setNoticeForm(prev => ({ ...prev, title: event.target.value }))}
              placeholder="공지 제목"
            />
            <textarea
              value={noticeForm.content}
              onChange={event => setNoticeForm(prev => ({ ...prev, content: event.target.value }))}
              placeholder="공지 내용을 입력하세요."
              rows={3}
            />
            <button type="button" onClick={handleNoticeSave} disabled={isSavingNotice}>
              {isSavingNotice ? "등록 중" : "공지 등록"}
            </button>
          </div>
          {noticeStatus === "loading" && <SkeletonList count={2} />}
          {noticeStatus !== "loading" && notices.length === 0 && (
            <EmptyState
              icon="공지"
              title="등록된 공지가 없습니다."
              description="오늘의 영업 안내나 임시 휴무를 공지로 남겨보세요."
            />
          )}
          {notices.map(notice => (
            <div key={notice.id} className="merchant-notice-item">
              <div>
                <strong>{notice.title}</strong>
                {(notice.createdAtLabel || notice.createdAt) && <span>{notice.createdAtLabel || notice.createdAt}</span>}
                <p>{notice.content}</p>
              </div>
              <button type="button" onClick={() => handleNoticeDelete(notice.id)}>삭제</button>
            </div>
          ))}
        </div>

        {isShopEditorOpen && (
          <div className="merchant-shop-editor" role="dialog" aria-modal="true" aria-labelledby="merchant-shop-editor-title">
            <div className="merchant-shop-editor-card">
              <div className="merchant-shop-editor-head">
                <div>
                  <strong id="merchant-shop-editor-title">가게 정보 수정</strong>
                  <span>상태, 인증, 평점은 관리자 기준 정보라 여기서 수정하지 않습니다.</span>
                </div>
                <button type="button" onClick={() => setIsShopEditorOpen(false)} aria-label="닫기">×</button>
              </div>
              <div className="merchant-shop-form-grid">
                {[
                  ["name", "가게명 *", "예) 우리 가게"],
                  ["category", "카테고리", "예) 한식"],
                  ["address", "주소 *", "예) 도로명 주소"],
                  ["phone", "전화번호", "예) 02-123-4567"],
                  ["operatingHours", "영업시간", "예) 09:00 ~ 22:00"],
                  ["holiday", "휴무일", "예) 매주 일요일"],
                ].map(([key, label, placeholder]) => (
                  <label key={key}>
                    <span>{label}</span>
                    <input
                      value={shopForm[key]}
                      onChange={event => handleShopFormChange(key, event.target.value)}
                      placeholder={placeholder}
                    />
                  </label>
                ))}
                <label className="wide">
                  <span>가게 설명</span>
                  <textarea
                    value={shopForm.description}
                    onChange={event => handleShopFormChange("description", event.target.value)}
                    placeholder="사용자에게 보여줄 가게 소개를 입력하세요."
                    rows={4}
                  />
                </label>
              </div>
              <div className="merchant-shop-editor-actions">
                <button type="button" onClick={() => setIsShopEditorOpen(false)} disabled={isSavingShop}>취소</button>
                <button type="button" onClick={handleShopSave} disabled={isSavingShop}>
                  {isSavingShop ? "저장 중" : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div id="merchant-qr-panel" className="merchant-payment-panel">
          <div className="merchant-section-head">
            <div>
              <span>QR 결제 승인</span>
              <small>상인이 승인하면 사용자 결제가 완료됩니다.</small>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" className="merchant-small-action" onClick={handleQrReissue} disabled={qrReissuing}>
                {qrReissuing ? "재발급 중" : "QR 재발급"}
              </button>
              <strong>{paymentRequests.filter(item => item.status === "PENDING_CONFIRM").length}건 대기</strong>
            </div>
          </div>
          {requestStatus === "error" && <div className="merchant-api-note">QR 승인 요청을 불러오지 못했습니다. 백엔드 연결 상태를 확인해주세요.</div>}
          {paymentRequests.length === 0 ? (
            <EmptyState
              icon="QR"
              title="대기 중인 결제 요청이 없습니다."
              description="사용자가 현장에서 QR을 스캔하고 금액을 입력하면 승인 요청이 이곳에 표시됩니다."
            />
          ) : paymentRequests.map(request => (
            <div key={request.id} className={`merchant-payment-request ${request.status !== "PENDING_CONFIRM" ? "done" : ""}`}>
              <div>
                <strong>{request.menuName || "QR 결제 요청"}</strong>
                <span>{request.customerName} · {request.requestedAt}</span>
                {request.memo && <small>{request.memo}</small>}
              </div>
              <em>🪙 {request.amount.toLocaleString()}</em>
              {request.status === "PENDING_CONFIRM" ? (
                <div className="merchant-payment-actions">
                  <button type="button" onClick={() => handlePaymentRequest(request.id, "reject")}>거절</button>
                  <button type="button" onClick={() => handlePaymentRequest(request.id, "approve")}>승인</button>
                </div>
              ) : (
                <span className="merchant-payment-status">{request.status === "APPROVED" ? "승인 완료" : "거절됨"}</span>
              )}
            </div>
          ))}
        </div>

        <div className="merchant-payment-panel merchant-item-use-panel">
          <div className="merchant-section-head">
            <div>
              <span>아이템 사용 처리</span>
              <small>사용자가 보유 아이템 화면에서 발급한 코드를 입력합니다.</small>
            </div>
          </div>
          <div className="merchant-item-use-form">
            <input
              value={itemUseToken}
              onChange={(event) => {
                setItemUseToken(event.target.value);
                setItemUseStatus("idle");
              }}
              onKeyDown={(event) => event.key === "Enter" && handleUseCustomerItem()}
              placeholder="사용자 아이템 코드"
            />
            <button type="button" onClick={handleUseCustomerItem} disabled={itemUseStatus === "loading"}>
              {itemUseStatus === "loading" ? "처리 중" : "사용 처리"}
            </button>
          </div>
          {itemUseStatus === "error" && (
            <div className="merchant-api-note">아이템 사용 처리에 실패했습니다. 만료되었거나 이미 사용한 코드일 수 있습니다.</div>
          )}
          {itemUseResult && (
            <div className="merchant-item-use-result">
              <strong>{itemUseResult.productName || "아이템"}</strong>
              <span>{itemUseResult.status} · {itemUseResult.usedAt || "방금 처리됨"}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── 메뉴 관리 (별도 화면) ────────────────────────────────────────────
export function MerchantMenuPage({ onBack, showToast, selectedShopId }) {
  const [menus, setMenus] = useState([]);
  const [status, setStatus] = useState("loading");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", nameEn: "", price: "", desc: "" });

  useEffect(() => {
    let ignore = false;

    fetchMerchantMenus(selectedShopId)
      .then((nextMenus) => {
        if (ignore) return;
        setMenus(nextMenus);
        setStatus(nextMenus.length > 0 ? "success" : "empty");
      })
      .catch(() => {
        if (ignore) return;
        setMenus([]);
        setStatus("error");
      });

    return () => { ignore = true; };
  }, [selectedShopId]);

  const toggleMenu = async (id) => {
    const menu = menus.find((item) => item.id === id);
    setMenus(prev => prev.map(m => m.id === id ? { ...m, available: !m.available } : m));
    if (!menu) return;
    await updateMerchantMenu(id, { available: !menu.available }, selectedShopId).catch(() => {});
  };

  const resetMenuForm = () => {
    setEditingId(null);
    setForm({ name: "", nameEn: "", price: "", desc: "" });
    setShowAddForm(false);
  };

  const startEditMenu = (menu) => {
    setEditingId(menu.id);
    setForm({
      name: menu.name ?? "",
      nameEn: menu.nameEn ?? "",
      price: menu.price == null ? "" : String(menu.price),
      desc: menu.desc ?? "",
    });
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { showToast("메뉴명과 가격을 입력해주세요."); return; }
    const draft = {
      id: editingId ?? Date.now(),
      name: form.name,
      nameEn: form.nameEn,
      price: Number(form.price),
      desc: form.desc,
      available: menus.find((item) => item.id === editingId)?.available ?? true,
    };

    if (editingId) {
      try {
        const updated = await updateMerchantMenu(editingId, draft, selectedShopId);
        setMenus(prev => prev.map(menu => menu.id === editingId ? updated : menu));
        resetMenuForm();
        showToast("메뉴가 수정되었습니다.");
      } catch {
        showToast("메뉴 수정에 실패했습니다. 백엔드 연결 상태를 확인해주세요.");
      }
      return;
    }

    try {
      const created = await addMerchantMenu(draft, selectedShopId);
      setMenus(prev => [...prev, created]);
      setStatus("success");
      resetMenuForm();
      showToast("메뉴가 추가되었습니다!");
    } catch {
      showToast("메뉴 추가에 실패했습니다. 백엔드 연결 상태를 확인해주세요.");
    }
  };

  const handleDelete = async (id) => {
    await deleteMerchantMenu(id, selectedShopId).catch(() => {});
    setMenus(prev => prev.filter(m => m.id !== id));
    showToast("메뉴가 삭제되었습니다.");
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>🍽️ 메뉴 관리</span>
        </div>
        <div onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ name: "", nameEn: "", price: "", desc: "" }); }}
          style={{ background: COLORS.accent, color: COLORS.primary, fontSize: 14, fontWeight: 700, borderRadius: 20, padding: "6px 16px", cursor: "pointer" }}>
          + 메뉴 추가
        </div>
      </div>

      <div style={S.scrollArea}>
        {/* 메뉴 추가 폼 */}
        {showAddForm && (
          <div style={{ background: "#fff", margin: 16, borderRadius: 16, padding: 20, border: `2px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 14 }}>{editingId ? "메뉴 수정" : "새 메뉴 추가"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "name", label: "메뉴명 *", placeholder: "예) 빈대떡" },
                { key: "nameEn", label: "영문명", placeholder: "예) Bindaetteok" },
                { key: "price", label: "가격 (엽전) *", placeholder: "예) 5000", type: "number" },
                { key: "desc", label: "설명", placeholder: "메뉴 설명을 입력하세요" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>{f.label}</div>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    style={{ width: "100%", background: COLORS.bg, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <div onClick={resetMenuForm} style={{ flex: 1, background: COLORS.bg, borderRadius: 10, padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: "pointer", color: COLORS.textMuted }}>취소</div>
                <div onClick={handleSave} style={{ flex: 2, background: COLORS.accent, color: COLORS.primary, borderRadius: 10, padding: "10px 0", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{editingId ? "수정하기" : "추가하기"}</div>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 목록 */}
        <div style={{ padding: "8px 16px 16px" }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 10 }}>총 {menus.length}개 메뉴</div>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "error" && (
            <ErrorState
              title="메뉴 목록을 불러오지 못했습니다."
              description="상인 메뉴 목록 API 연결 상태를 확인해주세요."
            />
          )}
          {status !== "loading" && status !== "error" && menus.length === 0 && (
            <EmptyState
              icon="메뉴"
              title="등록된 메뉴가 없습니다."
              description="대표 메뉴를 추가하면 사용자 QR 결제 화면에서 선택할 수 있습니다."
              actionLabel="메뉴 추가"
              onAction={() => setShowAddForm(true)}
            />
          )}
          {menus.map(m => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary }}>{m.name}</span>
                    {m.nameEn && <span style={{ fontSize: 14, color: COLORS.textMuted }}>{m.nameEn}</span>}
                  </div>
                  {m.desc && <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 6 }}>{m.desc}</div>}
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.accent }}>🪙 {m.price.toLocaleString()} 엽전</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div onClick={() => toggleMenu(m.id)} style={{ width: 48, height: 26, borderRadius: 13, background: m.available ? COLORS.green : "#ccc", position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: m.available ? 25 : 3, transition: "left 0.2s" }} />
                  </div>
                  <span style={{ fontSize: 14, color: m.available ? COLORS.green : COLORS.textMuted, fontWeight: 600 }}>{m.available ? "판매중" : "판매중지"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, borderTop: "0.5px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
                <div onClick={() => startEditMenu(m)} style={{ flex: 1, background: COLORS.bg, borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 14, fontWeight: 600, cursor: "pointer", color: COLORS.primary }}>✏️ 수정</div>
                <div onClick={() => handleDelete(m.id)} style={{ flex: 1, background: "#FEE8E8", borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#A32D2D" }}>🗑️ 삭제</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 정산 내역 ────────────────────────────────────────────────────────
export function MerchantSettlementPage({ onBack, showToast, selectedShopId }) {
  const [settlements, setSettlements] = useState([]);
  const [wallet, setWallet] = useState(EMPTY_WALLET);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.allSettled([fetchMerchantSettlements(selectedShopId), fetchMerchantWallet(selectedShopId)])
      .then(([settlementResult, walletResult]) => {
        if (ignore) return;

        if (walletResult.status === "fulfilled") {
          setWallet(walletResult.value);
        }

        if (settlementResult.status === "fulfilled") {
          setSettlements(settlementResult.value);
          setStatus(settlementResult.value.length > 0 ? "success" : "empty");
        } else {
          setSettlements([]);
          setErrorMessage("정산 내역 API 응답을 불러오지 못했습니다.");
          setStatus("error");
        }
      });

    return () => { ignore = true; };
  }, [selectedShopId]);

  const totalAmount = settlements.reduce((sum, item) => sum + item.amount, 0);
  const settlementAvailable = wallet.pendingSettlement || wallet.balance;
  const canRequestSettlement = settlementAvailable >= MIN_SETTLEMENT_AMOUNT;

  const handleSettlementRequest = async () => {
    if (!canRequestSettlement) {
      showToast("정산은 5,000엽전부터 신청할 수 있습니다.");
      return;
    }

    try {
      await requestMerchantSettlement(settlementAvailable, selectedShopId);
      showToast("정산 신청이 완료되었습니다!");
    } catch {
      showToast("정산 신청을 완료하지 못했습니다. 백엔드 연결 상태를 확인해주세요.");
    }
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>정산 내역</span>
      </div>
      <div style={{ background: COLORS.primary, padding: "0 16px 20px", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>총 정산액</div>
        <div style={{ color: COLORS.accent, fontSize: 28, fontWeight: 700 }}>🪙 {totalAmount.toLocaleString()} 엽전</div>
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          <div className="merchant-settlement-request">
            <div>
              <span>정산 가능 금액</span>
              <strong>🪙 {settlementAvailable.toLocaleString()} 엽전</strong>
              <small>정산은 5,000엽전부터 신청할 수 있습니다. 현금 기준 50,000원 상당입니다.</small>
              {!canRequestSettlement && (
                <em>현재 기준까지 {(MIN_SETTLEMENT_AMOUNT - settlementAvailable).toLocaleString()}엽전이 더 필요합니다.</em>
              )}
            </div>
            <button type="button" onClick={handleSettlementRequest} disabled={!canRequestSettlement}>
              {canRequestSettlement ? "정산 신청하기" : "정산 기준 미달"}
            </button>
          </div>
          {status === "loading" && <SkeletonList count={3} />}
          {status === "error" && (
            <ErrorState
              title="정산 내역을 불러오지 못했습니다."
              description={errorMessage}
            />
          )}
          {status === "empty" && (
            <EmptyState
              icon="정산"
              title="정산 내역이 없습니다."
              description="QR 결제 매출이 쌓이면 정산 요청과 처리 내역이 이곳에 표시됩니다."
            />
          )}
          {settlements.map(s => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{s.date} 정산</div>
                <span style={{ background: COLORS.greenBg, color: COLORS.green, fontSize: 14, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>{s.status}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.green }}>+{s.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
