import { useEffect, useState } from "react";
import { COLORS } from "../../constants/colors";

export function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="app-toast" role="status" aria-live="polite" style={{ position: "absolute", bottom: 90, left: 16, right: 16, background: COLORS.primary, color: "#fff", borderRadius: 12, padding: "12px 16px", zIndex: 200, fontSize: 14, textAlign: "center" }}>
      {msg}
    </div>
  );
}

const PWA_INSTALL_DISMISS_KEY = "chunbae:pwa-install-dismissed";

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

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return undefined;

    const dismissed = getInstallDismissed();
    const ios = isIosDevice();
    setIsIos(ios);
    if (ios && !dismissed) setIsVisible(true);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (dismissed) return;
      setInstallPrompt(event);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsVisible(false);
      setInstallDismissed();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!isVisible) return null;

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setIsVisible(false);
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
      {installPrompt && (
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
