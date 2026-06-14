import { useEffect, useRef, useState } from "react";
import { S } from "./constants/colors";
import ChunbaeImg from "./assets/hwangchunbae.png";

import AppShell from "./components/common/AppShell";
import { PwaInstallPrompt, Toast } from "./components/common";
import LoginPage from "./pages/auth/LoginPage";
import OauthSignupPage from "./pages/auth/OauthSignupPage";
import PrivacyPolicyPage from "./pages/auth/PrivacyPolicyPage";
import SignupPage from "./pages/auth/SignupPage";
import HomePage from "./pages/home/HomePage";
import PublicHomePage from "./pages/home/PublicHomePage";
import MapPage from "./pages/map/MapPage";
import PlaceDetailPage from "./pages/map/PlaceDetailPage";
import DirectionPage from "./pages/map/DirectionPage";
import { CommunityListPage, CommunityPostPage, CommunityWritePage } from "./pages/community/CommunityPages";
import { ChatRoomPage, ChatWorkspacePage } from "./pages/chat/ChatPage";
import ChatRequestPage from "./pages/chat/ChatRequestPage";
import { PayChargePage, PayHistoryPage } from "./pages/payment/PaymentPages";
import QRPayPage from "./pages/payment/QRPayPage";
import { StorePage, StoreProductPage, StoreShopDetailPage } from "./pages/store/StorePages";
import { WishlistPage, MyReviewPage, MyReportsPage, OwnedItemsPage } from "./pages/my/MySubPages";
import FestivalCalendarPage from "./pages/festival/FestivalCalendarPage";
import FestivalDetailPage from "./pages/festival/FestivalDetailPage";
import { MerchantShopPage, MerchantMenuPage, MerchantSettlementPage } from "./pages/merchant/MerchantPages";
import { MerchantApplyPage } from "./pages/merchant/MerchantApplyPage";
import {
  AdminAdsPage,
  AdminBannersPage,
  AdminCertificationsPage,
  AdminContentPage,
  AdminDashboardPage,
  AdminFaqsPage,
  AdminFestivalsPage,
  AdminMerchantPage,
  AdminProductsPage,
  AdminRefundsPage,
  AdminReportsPage,
  AdminSettlementsPage,
  AdminShopsPage,
  AdminSupportPage,
  AdminUsersPage,
} from "./pages/admin/AdminPages";
import { MyPage, FestivalPage, NotificationPage, NotificationSettingsPage, FAQPage, SearchPage } from "./pages/misc/MiscPages";
import SupportPage from "./pages/support/SupportPage.jsx";
import {
  clearAuthSession,
  clearPendingOauthSignup,
  completeSocialLoginFromCallback,
  fetchCurrentUser,
  getPendingOauthSignup,
  getStoredAuthSession,
  shouldClearSessionForError,
} from "./services/authService";
import { fetchNotifications, getNotificationToastText } from "./services/notificationService.js";
import { createNotificationRealtimeClient } from "./services/notificationRealtimeService.js";

function getInitialScreenForRole(role) {
  const normalizedRole = String(role || "USER").toUpperCase();
  if (normalizedRole === "MERCHANT") return "merchant";
  if (normalizedRole === "ADMIN") return "adminDashboard";
  return "home";
}

function getRoleEntryFromPath(pathname = window.location.pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "").toLowerCase();
  if (normalizedPath === "/admin") return "ADMIN";
  if (normalizedPath === "/merchant") return "MERCHANT";
  return null;
}

const COMFORTABLE_VIEW_STORAGE_KEY = "chunbae_comfortable_view";
const APP_NAVIGATION_STORAGE_KEY = "chunbae_navigation_state";

function getStoredComfortableView() {
  try {
    return localStorage.getItem(COMFORTABLE_VIEW_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function readStoredNavigationState() {
  try {
    const raw = sessionStorage.getItem(APP_NAVIGATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.chunbaeTour ? parsed : null;
  } catch {
    sessionStorage.removeItem(APP_NAVIGATION_STORAGE_KEY);
    return null;
  }
}

function writeStoredNavigationState(state) {
  try {
    sessionStorage.setItem(APP_NAVIGATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 세션 저장소를 사용할 수 없는 환경에서는 브라우저 히스토리만 사용합니다.
  }
}

function clearStoredNavigationState() {
  try {
    sessionStorage.removeItem(APP_NAVIGATION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function SplashScreen({ onDone }) {
  useState(() => { setTimeout(onDone, 1800); });
  return (
    <div style={{ ...S.screen, background: "#1A1A2E", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <img
            src={ChunbaeImg}
            alt="춘배 캐릭터"
            style={{ width: 140, height: 140, objectFit: "contain", marginBottom: 16 }}
        />
        <div style={{ color: "#FFB41E", fontSize: 28, fontWeight: 700 }}>춘배투어</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8 }}>ChunBae Tour</div>
      </div>
      <div style={{ position: "absolute", bottom: 60, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>로딩 중...</div>
    </div>
  );
}

function SocialCallbackScreen() {
  return (
    <div style={{ ...S.screen, background: "#1A1A2E", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#FFB41E", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>로그인 처리 중...</div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>소셜 로그인 정보를 확인하고 있습니다.</div>
    </div>
  );
}

export default function App() {
  const socialCallbackMatch = window.location.pathname.match(/^\/oauth\/(naver|kakao)\/callback$/i);
  const socialCallbackProvider = socialCallbackMatch?.[1];
  const isSocialCallbackPath = Boolean(socialCallbackProvider);
  const [entryRole, setEntryRole] = useState(() => getRoleEntryFromPath());
  const [storedSession] = useState(() => getStoredAuthSession(entryRole || undefined));
  const [storedNavigation] = useState(() => storedSession ? readStoredNavigationState() : null);
  const [hasPendingOauthSignup] = useState(() => !storedSession && Boolean(getPendingOauthSignup()?.signupTicket));
  const hasStoredMainNavigation = storedNavigation?.appState === "main";
  const [appState, setAppState] = useState(isSocialCallbackPath ? "socialCallback" : hasPendingOauthSignup ? "oauthSignup" : entryRole && !storedSession ? "roleLogin" : hasStoredMainNavigation ? "main" : "splash");
  const [user, setUser] = useState(storedSession);
  const [tab, setTab] = useState(storedNavigation?.tab || "home");
  const [screen, setScreen] = useState(() => storedNavigation?.screen || getInitialScreenForRole(storedSession?.role));
  const [toast, setToast] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState(storedNavigation?.selectedPlace || null);
  const [selectedRoom, setSelectedRoom] = useState(storedNavigation?.selectedRoom || null);
  const [selectedPost, setSelectedPost] = useState(storedNavigation?.selectedPost || null);
  const [selectedProduct, setSelectedProduct] = useState(storedNavigation?.selectedProduct || null);
  const [selectedShop, setSelectedShop] = useState(storedNavigation?.selectedShop || null);
  const [selectedFestival, setSelectedFestival] = useState(storedNavigation?.selectedFestival || null);
  const [selectedMerchantShopId, setSelectedMerchantShopId] = useState(storedNavigation?.selectedMerchantShopId || null);
  const [comfortableView, setComfortableView] = useState(getStoredComfortableView);
  const [likeChangeCounter, setLikeChangeCounter] = useState(0);
  const [privacyBackState, setPrivacyBackState] = useState("login");
  const historyInitializedRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const notificationSeenIdsRef = useRef(new Set());
  const notificationInitializedRef = useRef(false);
  const notificationRealtimeRef = useRef(null);

  const getNavigationState = () => ({
    chunbaeTour: true,
    appState,
    screen,
    tab,
    selectedPlace,
    selectedRoom,
    selectedPost,
    selectedProduct,
    selectedShop,
    selectedFestival,
    selectedMerchantShopId,
  });

  const restoreNavigationState = (state = {}) => {
    setAppState(state.appState || "landing");
    setScreen(state.screen || "home");
    setTab(state.tab || "home");
    setSelectedPlace(state.selectedPlace || null);
    setSelectedRoom(state.selectedRoom || null);
    setSelectedPost(state.selectedPost || null);
    setSelectedProduct(state.selectedProduct || null);
    setSelectedShop(state.selectedShop || null);
    setSelectedFestival(state.selectedFestival || null);
    setSelectedMerchantShopId(state.selectedMerchantShopId || null);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const requestSystemNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("이 브라우저는 시스템 알림을 지원하지 않습니다.");
      return "unsupported";
    }

    const currentPermission = window.Notification.permission;
    if (currentPermission === "granted") return currentPermission;

    if (currentPermission === "denied") {
      showToast("브라우저 알림이 차단되어 있습니다. 주소창 설정에서 알림을 허용해주세요.");
      return currentPermission;
    }

    try {
      const permission = await window.Notification.requestPermission();
      if (permission === "granted") {
        showToast("다른 탭을 보고 있을 때도 알림을 받을 수 있어요.");
      }
      return permission;
    } catch {
      return window.Notification.permission;
    }
  };
  const getNotificationIdentity = (notification) => {
    if (!notification) return "";
    if (notification.id) return String(notification.id);
    return [
      notification.type || "notification",
      notification.referenceType || "none",
      notification.referenceId || "none",
      notification.time || "",
    ].join(":");
  };
  const showSystemNotification = (notification) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (document.visibilityState === "visible") return;
    if (window.Notification.permission !== "granted") return;

    const popup = new window.Notification(notification?.title || "춘배투어 알림", {
      body: notification?.displayMessage || notification?.text || notification?.message || "새 알림이 도착했습니다.",
      icon: "/chunbae-favicon.png",
      tag: getNotificationIdentity(notification) || undefined,
    });
    popup.onclick = () => {
      window.focus();
      handleNotificationNavigate(notification);
      popup.close();
    };
  };
  const syncNotificationSnapshot = (items = [], announceNew = false) => {
    setUnreadNotificationCount(items.filter(item => !item.read).length);

    const previousSeenIds = notificationSeenIdsRef.current;
    const nextSeenIds = new Set(previousSeenIds);
    const freshUnread = [];

    items.forEach((item) => {
      const key = getNotificationIdentity(item);
      if (!key) return;
      if (!previousSeenIds.has(key) && !item.read) freshUnread.push(item);
      nextSeenIds.add(key);
    });

    notificationSeenIdsRef.current = nextSeenIds;

    if (announceNew && notificationInitializedRef.current && freshUnread.length > 0) {
      showToast(getNotificationToastText(freshUnread[0]));
      showSystemNotification(freshUnread[0]);
    }
    notificationInitializedRef.current = true;
  };
  const handleIncomingNotification = (notification) => {
    const key = getNotificationIdentity(notification);
    if (key && notificationSeenIdsRef.current.has(key)) return;
    if (key) notificationSeenIdsRef.current.add(key);
    if (!notification.read) {
      setUnreadNotificationCount(count => count + 1);
    }
    showToast(getNotificationToastText(notification));
    showSystemNotification(notification);
  };
  const handleNotificationNavigate = (notification) => {
    const data = notification?.data ?? notification?.payload ?? {};
    const referenceType = String(notification?.referenceType || "").toUpperCase();
    const notificationType = String(notification?.type || "").toUpperCase();
    const referenceId = notification?.referenceId;
    const explicitRoomId = notification?.chatRoomId
      ?? notification?.roomId
      ?? notification?.chatRoom?.chatRoomId
      ?? data?.chatRoomId
      ?? data?.roomId
      ?? data?.chatRoom?.chatRoomId;
    const roomId = explicitRoomId
      ?? (referenceType === "CHAT_ROOM" ? referenceId : null);
    const isJoinRequestNotification = referenceType === "JOIN_REQUEST" || notificationType.includes("JOIN_REQUEST");

    if (roomId && isJoinRequestNotification) {
      setSelectedRoom({
        id: roomId,
        chatRoomId: roomId,
        title: notification.title || "참여 신청",
        openManagementTab: "requests",
        managementRequestKey: Date.now(),
      });
      setTab("chat");
      setScreen("chat");
      return;
    }

    if (roomId && (referenceType === "CHAT_ROOM" || notificationType.includes("CHAT"))) {
      setSelectedRoom({
        id: roomId,
        chatRoomId: roomId,
        title: notification.title || "채팅방",
      });
      setTab("chat");
      setScreen("chat");
      return;
    }

    if (isJoinRequestNotification) {
      setTab("chat");
      setScreen("chat");
      showToast("신청이 들어온 채팅방 정보를 알림에서 찾지 못했어요. 채팅방 목록에서 해당 방을 열어 신청 관리를 확인해주세요.");
      return;
    }

    showToast("이 알림으로 이동할 화면 정보가 아직 없습니다.");
  };
  const go = (scr) => setScreen(scr);
  const openPrivacyPolicy = (backState = "login") => {
    setPrivacyBackState(backState);
    setAppState("privacyPolicy");
  };
  const goHome = () => {
    setAppState("main");
    setTab("home");
    setScreen("home");
  };
  const handleTab = (key) => {
    const mainTabs = ["home", "map", "community", "chat", "my"];
    if (mainTabs.includes(key)) setTab(key);
    setScreen(key);
  };
  const handleLogin = (userData) => {
    const role = String(userData?.role || "USER").toUpperCase();
    clearStoredNavigationState();
    setUser(userData);
    setAppState("main");
    setTab("home");
    if (role === "MERCHANT") setScreen("merchant");
    else if (role === "ADMIN") setScreen("adminDashboard");
    else setScreen("home");
  };
  const handleLogout = () => {
    clearAuthSession();
    clearStoredNavigationState();
    notificationRealtimeRef.current?.disconnect();
    notificationRealtimeRef.current = null;
    notificationSeenIdsRef.current = new Set();
    notificationInitializedRef.current = false;
    setUnreadNotificationCount(0);
    setUser(null);
    setAppState(entryRole ? "roleLogin" : "landing");
    setScreen("home");
    setTab("home");
  };
  const handleRoleLoginHome = () => {
    setEntryRole(null);
    window.history.pushState({ chunbaeTour: true, appState: "landing", screen: "home", tab: "home" }, "", "/");
    setAppState("landing");
  };
  const handlePlaceClick = (place) => { setSelectedPlace(place); go("place"); };
  const handleProductClick = (product) => { setSelectedProduct(product); go("storeProduct"); };
  const handleShopClick = (shop) => { setSelectedShop(shop); go("storeShop"); };
  const handleLikeChange = (placeId, isLiked) => {
    // 찜 상태가 변경되면 마이페이지를 갱신하도록 카운터 증가
    setLikeChangeCounter(prev => prev + 1);
  };

  useEffect(() => {
    if (!isSocialCallbackPath) return;

    let ignore = false;
    setAppState("socialCallback");
    completeSocialLoginFromCallback(socialCallbackProvider)
      .then((profile) => {
        if (ignore) return;
        handleLogin(profile);
        window.history.replaceState({ chunbaeTour: true, appState: "main", screen: "home", tab: "home" }, "", "/");
      })
      .catch((error) => {
        if (ignore) return;
        if (error.code === "SOCIAL_SIGNUP_REQUIRED") {
          setAppState("oauthSignup");
          setToast("소셜 회원가입을 완료해주세요.");
          window.history.replaceState({ chunbaeTour: true, appState: "oauthSignup", screen: "home", tab: "home" }, "", "/");
          return;
        }
        clearAuthSession();
        setUser(null);
        setAppState("login");
        setToast(error.message || "소셜 로그인 처리 중 문제가 발생했습니다.");
        window.history.replaceState({ chunbaeTour: true, appState: "login", screen: "home", tab: "home" }, "", "/");
      });

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (!state?.chunbaeTour) return;
      restoringHistoryRef.current = true;
      restoreNavigationState(state);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (appState === "splash") return;

    const state = getNavigationState();
    if (appState === "main") {
      writeStoredNavigationState(state);
    } else if (appState === "landing" || appState === "login" || appState === "roleLogin") {
      clearStoredNavigationState();
    }

    if (!historyInitializedRef.current) {
      window.history.replaceState(state, "", window.location.href);
      historyInitializedRef.current = true;
      return;
    }

    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      return;
    }

    window.history.pushState(state, "", window.location.href);
  }, [appState, screen, tab, selectedPlace, selectedRoom, selectedPost, selectedProduct, selectedShop, selectedFestival, selectedMerchantShopId]);

  useEffect(() => {
    document.documentElement.classList.toggle("comfortable-view", comfortableView);
    try {
      localStorage.setItem(COMFORTABLE_VIEW_STORAGE_KEY, comfortableView ? "true" : "false");
    } catch {
      // localStorage를 사용할 수 없는 환경에서도 화면 상태는 유지합니다.
    }
  }, [comfortableView]);

  useEffect(() => {
    if (!user) {
      notificationRealtimeRef.current?.disconnect();
      notificationRealtimeRef.current = null;
      notificationSeenIdsRef.current = new Set();
      notificationInitializedRef.current = false;
      setUnreadNotificationCount(0);
      return undefined;
    }

    let stopped = false;
    const pollNotifications = () => {
      fetchNotifications({ size: 20 })
        .then((items) => {
          if (!stopped) syncNotificationSnapshot(items, true);
        })
        .catch(() => {});
    };

    pollNotifications();
    const pollTimer = window.setInterval(pollNotifications, 30000);
    const client = createNotificationRealtimeClient({
      onNotification: (notification) => {
        if (!stopped) handleIncomingNotification(notification);
      },
    });
    notificationRealtimeRef.current = client;
    client.connect();

    return () => {
      stopped = true;
      window.clearInterval(pollTimer);
      client.disconnect();
      if (notificationRealtimeRef.current === client) {
        notificationRealtimeRef.current = null;
      }
    };
  }, [user?.userId]);

  useEffect(() => {
    if (!storedSession) return;
    if (String(storedSession.role || "USER").toUpperCase() !== "USER") {
      // TODO: MERCHANT/ADMIN 내 정보 API가 확정되면 권한별 세션 검증을 추가합니다.
      return;
    }

    let ignore = false;
    fetchCurrentUser()
      .then((profile) => {
        if (!ignore) setUser(profile);
      })
      .catch((error) => {
        if (ignore || !shouldClearSessionForError(error)) return;
        clearAuthSession();
        clearStoredNavigationState();
        setUser(null);
        setAppState("login");
        setScreen("home");
        setTab("home");
        setToast("세션이 만료되었습니다. 다시 로그인해주세요.");
      });

    return () => { ignore = true; };
  }, [storedSession]);

  const noTabScreens = [
    "place", "direction", "chatroom", "chatRequest",
    "notif", "search", "fest", "festCalendar", "festDetail",
    "pay", "payHistory", "qrpay", "storeProduct", "storeShop",
    "community", "communityPost", "communityWrite",
    "wishlist", "myReview", "myReports", "ownedItems", "notificationSettings", "faq", "support",
    "merchant", "merchantMenu", "merchantSettlement", "merchantApply",
    "adminDashboard", "adminUsers", "adminReports", "adminMerchant", "adminContent",
    "adminRefunds", "adminSettlements", "adminAds", "adminCertifications", "adminSupport",
    "adminBanners", "adminFaqs", "adminProducts", "adminFestivals", "adminShops",
  ];
  const showTab = !noTabScreens.includes(screen);

  const withPwaInstall = (content) => (
    <div style={S.app}>
      {content}
      <PwaInstallPrompt />
    </div>
  );

  if (appState === "splash") return withPwaInstall(<SplashScreen onDone={() => setAppState(storedSession ? "main" : "landing")} />);
  if (appState === "socialCallback") return withPwaInstall(<SocialCallbackScreen />);
  if (appState === "landing") {
    const handlePublicExplore = (target = "home") => {
      setAppState("main");
      handleTab(target);
    };

    return (
      <div style={S.app}>
        <PublicHomePage
          onLogin={() => setAppState("login")}
          onSignup={() => setAppState("signup")}
          onExplore={handlePublicExplore}
        />
        <PwaInstallPrompt />
      </div>
    );
  }
  if (appState === "roleLogin") return withPwaInstall(<LoginPage role={entryRole} onLogin={handleLogin} onHome={handleRoleLoginHome} onPrivacy={() => openPrivacyPolicy("roleLogin")} />);
  if (appState === "login")  return withPwaInstall(<LoginPage role="USER" onLogin={handleLogin} onSignup={() => setAppState("signup")} onPrivacy={() => openPrivacyPolicy("login")} />);
  if (appState === "signup") return withPwaInstall(<SignupPage onBack={() => setAppState("login")} onDone={handleLogin} onPrivacy={() => openPrivacyPolicy("signup")} />);
  if (appState === "oauthSignup") return withPwaInstall(<OauthSignupPage onBack={() => { clearPendingOauthSignup(); setAppState("login"); }} onDone={handleLogin} onPrivacy={() => openPrivacyPolicy("oauthSignup")} />);
  if (appState === "privacyPolicy") return withPwaInstall(<PrivacyPolicyPage onBack={() => setAppState(privacyBackState)} />);

  return (
    <div style={S.app}>
      <AppShell active={tab} screen={screen} onTab={handleTab} onHome={goHome} user={user} onLogin={() => setAppState("login")} showMobileTab={showTab} unreadNotificationCount={unreadNotificationCount} onNotificationIntent={requestSystemNotificationPermission}>
        {screen === "home"             && <HomePage key={likeChangeCounter} onPlaceClick={handlePlaceClick} onShopClick={handleShopClick} onFestClick={(festival) => { setSelectedFestival(festival); go("festDetail"); }} onTab={handleTab} onSignup={() => setAppState("signup")} showToast={showToast} user={user} />}
        {screen === "map"              && <MapPage key={likeChangeCounter} onPlaceClick={handlePlaceClick} />}
        {screen === "place"            && <PlaceDetailPage place={selectedPlace} onBack={() => go(tab)} showToast={showToast} onDirection={() => go("direction")} onQrPay={() => go("qrpay")} onShopClick={handleShopClick} onLikeChange={handleLikeChange} onCompanionMore={() => go("community")} onCompanionWrite={() => go("communityWrite")} />}
        {screen === "direction"        && <DirectionPage place={selectedPlace} onBack={() => go("place")} />}
        {screen === "search"           && <SearchPage onBack={() => go(tab)} onPlaceClick={handlePlaceClick} onShopClick={handleShopClick} />}
        {screen === "fest"             && <FestivalPage onBack={() => go(tab)} onCalendar={() => go("festCalendar")} onFestival={(festival) => { setSelectedFestival(festival); go("festDetail"); }} />}
        {screen === "festCalendar"     && <FestivalCalendarPage onBack={() => go("fest")} onFestival={(festival) => { setSelectedFestival(festival); go("festDetail"); }} />}
        {screen === "festDetail"       && <FestivalDetailPage festival={selectedFestival} onBack={() => go("fest")} />}
        {screen === "community"        && <CommunityListPage onPost={(p) => { setSelectedPost(p); go("communityPost"); }} onWrite={() => go("communityWrite")} onBack={() => go(tab)} />}
        {screen === "communityPost"    && <CommunityPostPage post={selectedPost} onBack={() => go("community")} showToast={showToast} user={user} onChatRoom={(room) => { setSelectedRoom(room); go("chatroom"); }} onPlaceClick={handlePlaceClick} />}
        {screen === "communityWrite"   && <CommunityWritePage onBack={() => go("community")} showToast={showToast} />}
        {screen === "chat"             && <ChatWorkspacePage selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} onOpenMobileRoom={() => go("chatroom")} onLogin={() => setAppState("login")} showToast={showToast} />}
        {screen === "chatroom"         && <ChatRoomPage room={selectedRoom} onBack={() => go("chat")} showToast={showToast} />}
        {screen === "chatRequest"      && <ChatRequestPage room={selectedRoom} onBack={() => go("chat")} showToast={showToast} />}
        {screen === "pay"              && <PayChargePage onBack={() => go("my")} onDone={() => go("my")} showToast={showToast} />}
        {screen === "payHistory"       && <PayHistoryPage onBack={() => go("my")} onPlaceClick={handlePlaceClick} onShopClick={handleShopClick} showToast={showToast} />}
        {screen === "qrpay"            && <QRPayPage onBack={() => go(tab)} showToast={showToast} />}
        {screen === "store"            && <StorePage onProduct={handleProductClick} />}
        {screen === "storeProduct"     && <StoreProductPage product={selectedProduct} onBack={() => go("store")} showToast={showToast} />}
        {screen === "storeShop"        && <StoreShopDetailPage shop={selectedShop} onBack={() => go(tab)} showToast={showToast} onQrPay={() => go("qrpay")} />}
        {screen === "my"               && <MyPage key={likeChangeCounter} onTab={handleTab} showToast={showToast} onLogout={handleLogout} onLogin={() => setAppState("login")} onProfileUpdate={setUser} user={user} comfortableView={comfortableView} onComfortableViewChange={setComfortableView} />}
        {screen === "wishlist"         && <WishlistPage onBack={() => go("my")} onPlaceClick={handlePlaceClick} />}
        {screen === "myReview"         && <MyReviewPage onBack={() => go("my")} showToast={showToast} />}
        {screen === "myReports"        && <MyReportsPage onBack={() => go("my")} />}
        {screen === "ownedItems"       && <OwnedItemsPage onBack={() => go("my")} showToast={showToast} />}
        {screen === "notif"            && <NotificationPage onBack={() => go(tab)} onNotificationClick={handleNotificationNavigate} onUnreadCountChange={setUnreadNotificationCount} />}
        {screen === "notificationSettings" && <NotificationSettingsPage onBack={() => go("my")} showToast={showToast} />}
        {screen === "faq"              && <FAQPage onBack={() => go(tab)} />}
        {screen === "support"          && <SupportPage onBack={() => go("my")} showToast={showToast} user={user} onLogin={() => setAppState("login")} />}
        {screen === "merchant"         && <MerchantShopPage onBack={() => go("my")} showToast={showToast} onMenuManage={() => go("merchantMenu")} onSettlement={() => go("merchantSettlement")} selectedShopId={selectedMerchantShopId} onShopChange={setSelectedMerchantShopId} />}
        {screen === "merchantMenu"     && <MerchantMenuPage onBack={() => go("merchant")} showToast={showToast} selectedShopId={selectedMerchantShopId} />}
        {screen === "merchantSettlement" && <MerchantSettlementPage onBack={() => go("merchant")} showToast={showToast} selectedShopId={selectedMerchantShopId} />}
        {screen === "merchantApply"   && <MerchantApplyPage onBack={() => go("my")} showToast={showToast} onLogin={() => setAppState("login")} />}
        {screen === "adminDashboard"   && <AdminDashboardPage onBack={() => go("my")} onNav={go} />}
        {screen === "adminUsers"       && <AdminUsersPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminReports"     && <AdminReportsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminMerchant"    && <AdminMerchantPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminContent"     && <AdminContentPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminRefunds"     && <AdminRefundsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminSettlements" && <AdminSettlementsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminAds"         && <AdminAdsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminCertifications" && <AdminCertificationsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminSupport"     && <AdminSupportPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminBanners"     && <AdminBannersPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminFaqs"        && <AdminFaqsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminProducts"    && <AdminProductsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminFestivals"   && <AdminFestivalsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminShops"       && <AdminShopsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
      </AppShell>
      <PwaInstallPrompt />
      <Toast msg={toast} />
    </div>
  );
}
