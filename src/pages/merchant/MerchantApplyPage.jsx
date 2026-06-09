import { useState } from "react";
import { COLORS, S } from "../../constants/colors";
import { ConfirmDialog } from "../../components/common";
import { getApiErrorHint } from "../../services/apiClient.js";
import { applyMerchant } from "../../services/merchantService.js";
import { geocodeAddress } from "../../services/placeService.js";

export function MerchantApplyPage({ onBack, showToast, onLogin }) {
  const [form, setForm] = useState({
    shopName: "",
    category: "",
    address: "",
    lat: "",
    lng: "",
    businessNumber: "",
    phone: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.shopName || !form.address || !form.businessNumber || !form.lat || !form.lng) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }

    setConfirmOpen(false);
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        shopName: form.shopName,
        category: form.category || undefined,
        address: form.address,
        lat: Number(form.lat),
        lng: Number(form.lng),
        businessNumber: form.businessNumber,
        phone: form.phone || undefined,
        description: form.description || undefined,
      };
      await applyMerchant(payload);
      showToast("상인 신청이 완료되었습니다. 심사 결과를 기다려주세요.");
      onBack();
    } catch (err) {
      setError(getApiErrorHint(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFindCoordinates = async () => {
    if (!form.address.trim()) {
      setError("좌표를 찾을 주소를 입력해주세요.");
      return;
    }

    setGeocoding(true);
    setError("");
    try {
      const result = await geocodeAddress(form.address);
      setForm(prev => ({
        ...prev,
        address: result.addressName || prev.address,
        lat: result.lat == null ? prev.lat : String(result.lat),
        lng: result.lng == null ? prev.lng : String(result.lng),
      }));
      showToast("주소 좌표를 찾았습니다.");
    } catch (err) {
      setError(getApiErrorHint(err) || err.message || "주소 좌표를 찾지 못했습니다.");
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div style={S.screen}>
      <div style={{ background: COLORS.primary, padding: "44px 16px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span onClick={onBack} style={{ color: "#fff", fontSize: 20, cursor: "pointer" }}>←</span>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>🏪 상인 신청</span>
      </div>
      <div style={S.scrollArea}>
        <div style={{ padding: 16 }}>
          <div style={{ background: "#FFF3D0", borderRadius: 12, padding: "12px 14px", color: "#B87800", fontSize: 14, marginBottom: 16 }}>
            상인 신청 후 관리자 심사를 거쳐 승인되면 상인 기능을 이용할 수 있습니다.
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              가게명 <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <input
              type="text"
              value={form.shopName}
              onChange={(e) => handleChange("shopName", e.target.value)}
              placeholder="예: 우리 가게"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              업종
            </label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              placeholder="예: 분식, 한식, 간식"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              주소 <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="예: 서울특별시 종로구 창경궁로 88"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
            <button
              type="button"
              onClick={handleFindCoordinates}
              disabled={geocoding}
              style={{ width: "100%", marginTop: 10, background: COLORS.greenBg, color: COLORS.green, border: "1px solid rgba(15, 116, 84, 0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 14, fontWeight: 700, cursor: geocoding ? "default" : "pointer" }}
            >
              {geocoding ? "좌표 찾는 중..." : "주소로 위경도 찾기"}
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              위도 (Latitude) <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => handleChange("lat", e.target.value)}
              placeholder="예: 37.5700"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              경도 (Longitude) <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => handleChange("lng", e.target.value)}
              placeholder="예: 126.9900"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              사업자등록번호 <span style={{ color: "#E24B4A" }}>*</span>
            </label>
            <input
              type="text"
              value={form.businessNumber}
              onChange={(e) => handleChange("businessNumber", e.target.value)}
              placeholder="예: 123-45-67891"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              연락처
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="예: 02-123-4567 (선택)"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              가게 소개
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="가게에 대한 간단한 소개를 입력해주세요."
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 8, fontSize: 14, resize: "none" }}
            />
          </div>

          {error && (
            <div style={{ background: "#FFE5E5", borderRadius: 12, padding: "12px 14px", color: "#E24B4A", fontSize: 14, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            style={{ width: "100%", background: COLORS.primary, color: "#fff", borderRadius: 12, padding: "14px", fontSize: 16, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "신청 중..." : "상인 신청하기"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="상인 신청을 제출할까요?"
        description="제출 후 관리자 심사를 거쳐 승인되면 상인 기능을 이용할 수 있습니다."
        confirmLabel="신청하기"
        cancelLabel="취소"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
