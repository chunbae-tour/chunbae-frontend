import { useEffect, useState } from "react";
import { COLORS, S } from "../../constants/colors.js";
import { EmptyState, ErrorState, SkeletonList } from "../../components/common";
import CertifiedMark from "../../assets/brand/chunbae-certified-mark.svg";
import { getApiErrorHint } from "../../services/apiClient.js";
import { fetchYeopjeonBalance } from "../../services/paymentService.js";
import { createShopReview, fetchShopDetail, fetchShopReviews } from "../../services/shopService.js";
import { fetchStoreOrders, fetchStoreProduct, fetchStoreProducts, purchaseStoreProduct } from "../../services/storeService.js";
import { PRODUCT_CATEGORIES } from "../../constants/productCategories.js";

function formatStoreDate(value) {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
}

// ─── 스토어 목록 ──────────────────────────────────────────────────────
export function StorePage({ onProduct }) {
  const [tab, setTab] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const categories = [
    { value: "", label: "전체" },
    ...PRODUCT_CATEGORIES,
    { value: "MY_ORDERS", label: "내 주문" },
  ];

  const loadStoreContent = () => {
    setStatus("loading");
    setErrorMessage("");
    if (tab === "MY_ORDERS") {
      fetchStoreOrders()
        .then((data) => {
          setOrders(data);
          setStatus(data.length > 0 ? "success" : "empty");
        })
        .catch((error) => {
          setOrders([]);
          setErrorMessage(getApiErrorHint(error));
          setStatus("error");
        });
      return;
    }

    fetchStoreProducts({ category: tab })
      .then((data) => {
        setProducts(data);
        setStatus(data.length > 0 ? "success" : "empty");
      })
      .catch((error) => {
        setProducts([]);
        setErrorMessage(getApiErrorHint(error));
        setStatus("error");
      });
  };

  useEffect(() => {
    let ignore = false;
    if (!ignore) loadStoreContent();
    return () => { ignore = true; };
  }, [tab]);

  return (
    <div style={S.screen} className="web-store-page">
      <div className="web-page-hero" style={{ background: COLORS.primary, padding: "44px 20px 20px" }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>🏪 스토어</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 4 }}>엽전으로 투어권과 쿠폰을 구매하세요</div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "#fff", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        {categories.map(category => (
          <div key={category.value || "ALL"} onClick={() => setTab(category.value)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer", background: tab === category.value ? COLORS.primary : COLORS.bg, color: tab === category.value ? "#fff" : COLORS.textMuted }}>{category.label}</div>
        ))}
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, padding: 16 }}>
          {status === "loading" && <div style={{ gridColumn: "1 / -1" }}><SkeletonList count={4} variant="card" /></div>}
          {status === "error" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <ErrorState
                title="스토어 상품을 불러오지 못했습니다."
                description={errorMessage || "백엔드 연결 상태를 확인한 뒤 다시 시도해주세요."}
                onRetry={loadStoreContent}
              />
            </div>
          )}
          {status === "empty" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState
                icon="상품"
                title="표시할 상품이 없습니다."
                description="카테고리를 바꾸거나 상품 API 데이터를 확인해주세요."
              />
            </div>
          )}
          {tab === "MY_ORDERS" && orders.map(order => (
            <div key={order.id} style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: 16, padding: 16, border: "0.5px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ color: COLORS.primary, fontSize: 15 }}>{order.productName}</strong>
                <span style={{ color: COLORS.green, fontSize: 13, fontWeight: 700 }}>{order.status || "주문"}</span>
              </div>
              <div style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 14 }}>
                수량 {order.quantity}개 · 🪙 {order.totalPrice.toLocaleString()} 엽전
              </div>
              {order.orderedAt && <div style={{ marginTop: 4, color: COLORS.textMuted, fontSize: 13 }}>{formatStoreDate(order.orderedAt)}</div>}
            </div>
          ))}
          {tab !== "MY_ORDERS" && products.map(p => (
            <div key={p.id} className="web-product-card" onClick={() => p.stock > 0 && onProduct(p)} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "0.5px solid rgba(0,0,0,0.06)", cursor: p.stock > 0 ? "pointer" : "default", opacity: p.stock === 0 ? 0.6 : 1, position: "relative" }}>
              {p.stock === 0 && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, zIndex: 1 }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>SOLD OUT</span>
                </div>
              )}
              <div style={{ height: 100, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{p.emoji}</div>
              <div style={{ padding: "12px 12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent }}>🪙 {p.price.toLocaleString()}</div>
                <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>재고 {p.stock}개</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 상품 상세 ────────────────────────────────────────────────────────
export function StoreProductPage({ product, onBack, showToast }) {
  const [qty, setQty] = useState(1);
  const [detail, setDetail] = useState(product);
  const [buying, setBuying] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const total = detail.price * qty;

  useEffect(() => {
    let ignore = false;
    fetchStoreProduct(product?.productId ?? product?.id)
      .then((data) => {
        if (!ignore) setDetail(data);
      })
      .catch(() => {});

    fetchYeopjeonBalance()
      .then((amount) => {
        if (ignore) return;
        setBalance(amount);
        setBalanceError("");
      })
      .catch((error) => {
        if (ignore) return;
        setBalance(null);
        setBalanceError(getApiErrorHint(error));
      });

    return () => { ignore = true; };
  }, [product?.id, product?.productId]);

  const handleBuy = async () => {
    if (buying) return;
    if (balance == null) { showToast("엽전 잔액을 확인한 뒤 다시 시도해 주세요."); return; }
    if (balance < total) { showToast("엽전 잔액이 부족해요!"); return; }
    setBuying(true);
    setPurchaseError("");
    try {
      await purchaseStoreProduct({ productId: detail.productId ?? detail.id, quantity: qty });
    } catch (error) {
      setPurchaseError(getApiErrorHint(error));
      showToast("구매를 완료하지 못했습니다.");
      setBuying(false);
      return;
    } finally {
      setBuying(false);
    }
    showToast(`🎉 ${detail.name} 구매 완료!`);
    setTimeout(onBack, 1500);
  };

  return (
    <div style={S.screen} className="web-store-detail-page">
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>상품 상세</span>
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="web-store-detail-layout">
        <div className="web-store-detail-visual" style={{ height: 200, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>{detail.emoji}</div>
        <div className="web-store-detail-content" style={{ padding: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>{detail.name}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.accent, marginBottom: 4 }}>🪙 {detail.price.toLocaleString()} 엽전</div>
          <div style={{ display: "flex", gap: 12, fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>
            <span>재고 {detail.stock}개</span>
            <span>유효기간 구매 후 {detail.validDays}일</span>
          </div>
          <div style={{ background: COLORS.bg, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 8 }}>상품 설명</div>
            <div style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 1.7 }}>{detail.desc}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20, border: "0.5px solid rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>
              <span>내 잔액</span>
              <span style={{ fontWeight: 700, color: COLORS.primary }}>
                {balance == null ? "확인 필요" : `🪙 ${balance.toLocaleString()} 엽전`}
              </span>
            </div>
            {balanceError && <div style={{ fontSize: 13, color: "#D04437", marginBottom: 8 }}>{balanceError}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: COLORS.textMuted }}>수량</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>-</div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{qty}</span>
                <div onClick={() => setQty(q => Math.min(detail.stock, q + 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#fff" }}>+</div>
              </div>
            </div>
          </div>
          {purchaseError && <div style={{ fontSize: 13, color: "#D04437", marginBottom: 10 }}>{purchaseError}</div>}
          <div onClick={handleBuy} style={{ background: COLORS.accent, color: COLORS.primary, borderRadius: 14, padding: "15px 0", textAlign: "center", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {buying ? "구매 중..." : `🪙 ${total.toLocaleString()} 엽전으로 구매`}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── 춘배인증 상점 상세 ───────────────────────────────────────────────
export function StoreShopDetailPage({ shop, onBack, showToast, onQrPay }) {
  const shopId = shop?.shopId ?? shop?.id;
  const [detail, setDetail] = useState(shop || null);
  const [status, setStatus] = useState(shopId ? "loading" : "empty");
  const [reviewOpen, setReviewOpen] = useState(Boolean(shop?.reviewIntent && shop?.reviewWritable !== false));
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [detailError, setDetailError] = useState("");
  const currentShop = detail || {};
  const shopName = currentShop.shopName || currentShop.name || "춘배인증 상점";
  const marketName = currentShop.marketName || currentShop.placeName || currentShop.place?.name || "연결된 장소";
  const shopMenus = Array.isArray(currentShop.menus) ? currentShop.menus : [];
  const shopNotices = Array.isArray(currentShop.notices) ? currentShop.notices : [];
  const canWriteReview = currentShop.reviewWritable !== false;
  const heroImageUrl = currentShop.imageUrl
    || currentShop.thumbnailUrl
    || (Array.isArray(currentShop.imageUrls) ? currentShop.imageUrls[0] : currentShop.imageUrls)
    || "";

  useEffect(() => {
    let ignore = false;
    const nextShopId = shop?.shopId ?? shop?.id;

    setDetail(shop || null);
    setReviewOpen(Boolean(shop?.reviewIntent && shop?.reviewWritable !== false));
    setReviews([]);

    if (!nextShopId) {
      setStatus("empty");
      return () => { ignore = true; };
    }

    setStatus("loading");
    setDetailError("");
    fetchShopDetail(nextShopId)
      .then((data) => {
        if (ignore) return;
        setDetail(prev => ({
          ...prev,
          ...data,
          reviewWritable: shop?.reviewWritable ?? data.reviewWritable,
          reviewId: shop?.reviewId ?? data.reviewId,
        }));
        setStatus("success");
      })
      .catch((error) => {
        if (ignore) return;
        setDetailError(getApiErrorHint(error));
        setStatus("error");
      });

    fetchShopReviews(nextShopId)
      .then((data) => {
        if (!ignore) setReviews(data);
      })
      .catch(() => {
        if (!ignore) setReviews([]);
      });

    return () => { ignore = true; };
  }, [shop]);

  const submitReview = async () => {
    if (reviewSubmitting) return;
    if (!canWriteReview) {
      showToast("이미 리뷰를 작성했거나 리뷰 가능 기간이 아닙니다.");
      return;
    }
    if (!reviewText.trim()) {
      showToast("상점 리뷰 내용을 입력해주세요.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    try {
      await createShopReview({
        shopId: currentShop.shopId,
        paymentHistoryId: currentShop.paymentHistoryId,
        rating,
        content: reviewText,
      });
    } catch (error) {
      setReviewError(getApiErrorHint(error));
      setReviewSubmitting(false);
      return;
    }

    setReviews(prev => [{
      id: Date.now(),
      user: "여행자",
      rating,
      text: reviewText,
      date: "방금",
    }, ...prev]);
    setDetail(prev => ({ ...prev, reviewWritable: false }));
    setReviewText("");
    setReviewOpen(false);
    setReviewSubmitting(false);
    showToast("상점 리뷰가 등록되었습니다.");
  };

  return (
    <div style={S.screen} className="shop-detail-page">
      <div className="web-page-topbar" style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>춘배인증 상점</span>
      </div>
      <div style={S.scrollArea} className="web-detail-scroll">
        <div className="shop-detail-hero" style={{ "--shop-hero-image": heroImageUrl ? `url(${JSON.stringify(heroImageUrl)})` : undefined }}>
          <span>춘배인증 상점</span>
          <strong>{shopName}</strong>
          <p>{currentShop.description || currentShop.headline || "현장에서 QR 엽전 결제를 사용할 수 있는 인증 상점입니다."}</p>
        </div>
        <div className="shop-detail-content">
          {status === "loading" && <SkeletonList count={2} />}
          {status === "empty" && (
            <EmptyState
              icon="상점"
              title="상점 정보를 찾을 수 없습니다."
              description="목록에서 상점을 다시 선택해주세요."
            />
          )}
          {status === "error" && (
            <ErrorState
              title="상점 상세 API를 불러오지 못했습니다."
              description={detailError || "백엔드 경로와 응답 형식을 확인하세요."}
            />
          )}
          {currentShop.reviewIntent && (
            <div className="shop-review-intent">
              <span>결제내역에서 이동했습니다.</span>
              <strong>{currentShop.paidAmount || "결제 금액 확인 중"}</strong>
              <small>{canWriteReview ? (currentShop.paidDesc || "방문한 상점의 후기를 남겨주세요.") : "이미 작성했거나 리뷰 가능 기간이 지난 결제내역입니다."}</small>
            </div>
          )}
          <div className="shop-summary-card">
            <div>
              <img src={CertifiedMark} alt="" />
              <span>{marketName}</span>
              <strong>{shopName}</strong>
            </div>
            <dl>
              <div><dt>대표 메뉴</dt><dd>{currentShop.menu || shopMenus[0]?.name || "대표 메뉴 준비 중"}</dd></div>
              <div><dt>혜택</dt><dd>{currentShop.benefit || currentShop.event?.label || "현장 혜택 확인"}</dd></div>
              <div><dt>결제</dt><dd>{currentShop.acceptsYeopjeon !== false ? "현장 QR 엽전 결제" : "결제 준비 중"}</dd></div>
            </dl>
          </div>
          <div className="shop-action-row">
            <button type="button" onClick={() => showToast("현장에서 가게 QR을 스캔해 금액 입력 후 결제합니다.")}>현장 QR 안내</button>
            <button type="button" onClick={onQrPay}>QR 결제 화면</button>
            <button type="button" disabled={!canWriteReview} onClick={() => canWriteReview && setReviewOpen(!reviewOpen)}>
              {!canWriteReview ? "리뷰 작성 완료" : reviewOpen ? "리뷰 접기" : "상점 리뷰 남기기"}
            </button>
          </div>
          {reviewOpen && (
            <div className="shop-review-form">
              <div className="place-review-stars">
                {[1, 2, 3, 4, 5].map(score => (
                  <button key={score} type="button" className={score <= rating ? "active" : ""} onClick={() => setRating(score)}>★</button>
                ))}
              </div>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="결제한 상점의 메뉴, 응대, QR 결제 경험을 남겨주세요." />
              {reviewError && <div className="shop-review-error">{reviewError}</div>}
              <button type="button" disabled={reviewSubmitting} onClick={submitReview}>{reviewSubmitting ? "등록 중..." : "리뷰 등록"}</button>
            </div>
          )}
          <section className="shop-menu-panel">
            <div className="place-action-head">
              <span>상점 메뉴와 혜택</span>
              <small>{shopMenus.length > 0 ? "상인이 등록한 메뉴입니다." : "등록된 메뉴가 없으면 대표 정보만 보여줍니다."}</small>
            </div>
            {shopMenus.length > 0 ? (
              <div className="shop-menu-grid">
                {shopMenus.map(menu => (
                  <div key={menu.id ?? menu.name} className={menu.available === false ? "is-disabled" : ""}>
                    <strong>{menu.name}</strong>
                    <span>{menu.price > 0 ? `${menu.price.toLocaleString()}엽전` : "가격 확인"}</span>
                    {menu.description && <small>{menu.description}</small>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="shop-menu-grid">
                {[currentShop.menu || "대표 메뉴 준비 중", currentShop.benefit || "춘배 혜택"].map((item, index) => (
                  <div key={`${item}-${index}`}>
                    <strong>{item}</strong>
                    <span>{index === 0 ? "대표" : "혜택"}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="shop-menu-panel">
            <div className="place-action-head">
              <span>가게 공지</span>
              <small>{shopNotices.length > 0 ? "상인이 등록한 최신 안내입니다." : "아직 등록된 공지가 없습니다."}</small>
            </div>
            {shopNotices.length > 0 ? (
              <div className="shop-notice-list">
                {shopNotices.map(notice => (
                  <article key={notice.id ?? `${notice.title}-${notice.createdAt}`}>
                    <div>
                      <strong>{notice.title}</strong>
                      {notice.createdAt && <span>{notice.createdAt}</span>}
                    </div>
                    {notice.content && <p>{notice.content}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="공지"
                title="등록된 공지가 없습니다."
                description="휴무나 재료 소진 안내가 등록되면 이곳에 표시됩니다."
              />
            )}
          </section>
          <section className="shop-review-list">
            <div className="place-action-head">
              <span>상점 리뷰</span>
              <small>상점 리뷰 API가 준비되면 표시됩니다.</small>
            </div>
            {reviews.length === 0 && (
              <EmptyState
                icon="리뷰"
                title="상점 리뷰 API 준비 중"
                description="백엔드 상점 리뷰 조회/작성 API가 연결되면 결제한 사용자의 후기가 표시됩니다."
              />
            )}
            {reviews.map(review => (
              <article key={review.id}>
                <div><strong>{review.user}</strong><span>{review.date}</span></div>
                <em>{"★".repeat(review.rating)}</em>
                <p>{review.text}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
