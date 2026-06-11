import { useEffect, useState } from "react";
import { COLORS } from "../../constants/colors";

export function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="app-toast" role="status" aria-live="polite">
      {msg}
    </div>
  );
}

const PWA_INSTALL_DISMISS_KEY = "chunbae:pwa-install-dismissed";
let pwaInstallPromptEvent = null;
let pwaInstallInstalled = false;
let pwaInstallEventsBound = false;
const pwaInstallSubscribers = new Set();

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function getInstallDismissed() {
  try {
    return localStorage.getItem(PWA_INSTALL_DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function setInstallDismissed() {
  try {
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "true");
  } catch {
    // 저장소 접근이 막힌 브라우저에서도 안내 닫기는 현재 세션에서만 처리합니다.
  }
}

function getPwaInstallSnapshot() {
  const standalone = isStandaloneDisplay();
  return {
    canInstall: Boolean(pwaInstallPromptEvent),
    installed: pwaInstallInstalled || standalone,
    isIos: isIosDevice(),
    isStandalone: standalone,
  };
}

function notifyPwaInstallSubscribers() {
  const snapshot = getPwaInstallSnapshot();
  pwaInstallSubscribers.forEach((subscriber) => subscriber(snapshot));
}

function bindPwaInstallEvents() {
  if (pwaInstallEventsBound || typeof window === "undefined") return;
  pwaInstallEventsBound = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    pwaInstallPromptEvent = event;
    notifyPwaInstallSubscribers();
  });

  window.addEventListener("appinstalled", () => {
    pwaInstallInstalled = true;
    pwaInstallPromptEvent = null;
    setInstallDismissed();
    notifyPwaInstallSubscribers();
  });
}

function usePwaInstallState() {
  const [state, setState] = useState(getPwaInstallSnapshot);

  useEffect(() => {
    bindPwaInstallEvents();
    const handleChange = (nextState) => setState(nextState);
    pwaInstallSubscribers.add(handleChange);
    handleChange(getPwaInstallSnapshot());

    return () => {
      pwaInstallSubscribers.delete(handleChange);
    };
  }, []);

  const promptInstall = async () => {
    if (!pwaInstallPromptEvent) return false;
    const promptEvent = pwaInstallPromptEvent;
    pwaInstallPromptEvent = null;
    notifyPwaInstallSubscribers();
    promptEvent.prompt();
    await promptEvent.userChoice;
    notifyPwaInstallSubscribers();
    return true;
  };

  return { ...state, promptInstall };
}

export function PwaInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const { canInstall, installed, isIos, promptInstall } = usePwaInstallState();

  useEffect(() => {
    if (installed) {
      setIsVisible(false);
      return;
    }
    const dismissed = getInstallDismissed();
    setIsVisible(!dismissed && (isIos || canInstall));
  }, [canInstall, installed, isIos]);

  if (!isVisible) return null;

  const handleInstall = async () => {
    if (!canInstall) return;
    setIsVisible(false);
    await promptInstall();
  };

  const handleDismiss = () => {
    setInstallDismissed();
    setIsVisible(false);
  };

  return (
    <aside className="pwa-install-card" aria-label="춘배투어 앱 설치 안내">
      <div className="pwa-install-icon" aria-hidden="true">춘</div>
      <div className="pwa-install-copy">
        <strong>춘배투어를 앱처럼 사용해보세요.</strong>
        <span>{isIos ? "Safari 공유 버튼에서 홈 화면에 추가를 선택하면 됩니다." : "홈 화면에 설치하면 바로 열 수 있어요."}</span>
      </div>
      {canInstall && (
        <button type="button" className="pwa-install-primary" onClick={handleInstall}>
          설치
        </button>
      )}
      <button type="button" className="pwa-install-close" onClick={handleDismiss} aria-label="설치 안내 닫기">
        ×
      </button>
    </aside>
  );
}

export function PwaInstallButton({ className = "", children = "앱 설치하기" }) {
  const { canInstall, installed, isIos, promptInstall } = usePwaInstallState();
  const [guideOpen, setGuideOpen] = useState(false);

  if (installed) return null;

  const handleClick = async () => {
    if (canInstall) {
      await promptInstall();
      return;
    }
    setGuideOpen(true);
  };

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        {children}
      </button>
      <ConfirmDialog
        open={guideOpen}
        title={isIos ? "iPhone에서 홈 화면에 추가" : "브라우저 메뉴에서 앱 설치"}
        description={
          isIos
            ? "Safari에서 공유 버튼을 누른 뒤 홈 화면에 추가를 선택해주세요. 카카오톡이나 네이버 인앱 브라우저에서는 Safari로 열어야 합니다."
            : "Chrome 주소창 또는 메뉴에서 앱 설치, 홈 화면에 추가를 선택해주세요. 인앱 브라우저에서는 Chrome으로 다시 열어야 할 수 있습니다."
        }
        confirmLabel="확인"
        cancelLabel="닫기"
        onConfirm={() => setGuideOpen(false)}
        onCancel={() => setGuideOpen(false)}
      />
    </>
  );
}

export function SectionHeader({ title, onMore }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.primary }}>{title}</span>
      {onMore && (
        <button type="button" className="section-more-button" onClick={onMore}>
          더보기 ›
        </button>
      )}
    </div>
  );
}

export function StarRating({ rating }) {
  return (
    <span style={{ color: COLORS.accent, fontSize: 14, fontWeight: 700 }}>★ {rating}</span>
  );
}

export function SkeletonBlock({ className = "", style }) {
  return <div className={`ui-skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonList({ count = 3, variant = "row" }) {
  return (
    <div className={`ui-skeleton-list ${variant}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="ui-skeleton-item">
          <SkeletonBlock className="ui-skeleton-thumb" />
          <div>
            <SkeletonBlock className="ui-skeleton-line wide" />
            <SkeletonBlock className="ui-skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineLoadingState({ text = "불러오는 중입니다." }) {
  return (
    <div className="ui-inline-loading" role="status" aria-live="polite">
      <span />
      {text}
    </div>
  );
}

export function EmptyState({
  icon = "춘",
  title = "아직 보여줄 내용이 없습니다.",
  description = "데이터가 준비되면 이곳에 표시됩니다.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="ui-state-card empty" role="status">
      <div className="ui-state-icon" aria-hidden="true">{icon}</div>
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "요청을 처리하지 못했습니다.",
  description = "잠시 후 다시 시도해주세요.",
  actionLabel = "다시 시도",
  onRetry,
}) {
  return (
    <div className="ui-state-card error" role="alert">
      <div className="ui-state-icon" aria-hidden="true">!</div>
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className={danger ? "confirm-dialog danger" : "confirm-dialog"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClick={(event) => event.stopPropagation()}
      >
        <strong id="confirm-dialog-title">{title}</strong>
        <p id="confirm-dialog-description">{description}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportDialog({
  open,
  title = "신고하기",
  targetLabel = "선택한 대상",
  reasons = [],
  initialDescription = "",
  submitting = false,
  onSubmit,
  onCancel,
}) {
  const [reason, setReason] = useState(reasons[0]?.value || "OTHER");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason(reasons[0]?.value || "OTHER");
    setDescription(initialDescription);
  }, [open, reasons, initialDescription]);

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit?.({ reason, description: description.trim() });
  };

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <strong id="report-dialog-title">{title}</strong>
        <p>{targetLabel}에 대한 신고 사유를 선택하고 필요한 내용을 적어주세요.</p>
        <label className="report-dialog-field">
          <span>신고 사유</span>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            {reasons.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="report-dialog-field">
          <span>상세 내용</span>
          <textarea
            value={description}
            maxLength={500}
            rows={5}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="상황을 확인할 수 있는 내용을 적어주세요."
          />
        </label>
        <div className="report-dialog-count">{description.length}/500</div>
        <div className="confirm-dialog-actions">
          <button type="button" className="secondary" disabled={submitting} onClick={onCancel}>
            취소
          </button>
          <button type="button" className="primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "접수 중..." : "신고 접수"}
          </button>
        </div>
      </div>
    </div>
  );
}
