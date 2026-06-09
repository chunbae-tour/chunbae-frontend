import { useEffect, useRef, useState } from "react";
import { S } from "./constants/colors";
import ChunbaeImg from "./assets/hwangchunbae.png";

import AppShell from "./components/common/AppShell";
import { Toast } from "./components/common";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import HomePage from "./pages/home/HomePage";
import PublicHomePage from "./pages/home/PublicHomePage";
import MapPage from "./pages/map/MapPage";
import PlaceDetailPage from "./pages/map/PlaceDetailPage";
import DirectionPage from "./pages/map/DirectionPage";
import { CommunityListPage, CommunityPostPage, CommunityWritePage } from "./pages/community/CommunityPages";
import { ChatListPage, ChatRoomPage } from "./pages/chat/ChatPage";
import ChatRequestPage from "./pages/chat/ChatRequestPage";
import { PayChargePage, PayHistoryPage } from "./pages/payment/PaymentPages";
import QRPayPage from "./pages/payment/QRPayPage";
import { StorePage, StoreProductPage, StoreShopDetailPage } from "./pages/store/StorePages";
import { WishlistPage, MyReviewPage, OwnedItemsPage } from "./pages/my/MySubPages";
import FestivalCalendarPage from "./pages/festival/FestivalCalendarPage";
import FestivalDetailPage from "./pages/festival/FestivalDetailPage";
import { MerchantShopPage, MerchantMenuPage, MerchantSettlementPage } from "./pages/merchant/MerchantPages";
import { MerchantApplyPage } from "./pages/merchant/MerchantApplyPage";
import { AdminDashboardPage, AdminUsersPage, AdminReportsPage, AdminMerchantPage, AdminContentPage } from "./pages/admin/AdminPages";
import { MyPage, FestivalPage, ARPage, NotificationPage, NotificationSettingsPage, FAQPage, SearchPage } from "./pages/misc/MiscPages";
import { clearAuthSession, completeSocialLoginFromCallback, fetchCurrentUser, getStoredAuthSession, shouldClearSessionForError } from "./services/authService";

function getInitialScreenForRole(role) {
  const normalizedRole = String(role || "USER").toUpperCase();
  if (normalizedRole === "MERCHANT") return "merchant";
  if (normalizedRole === "ADMIN") return "adminDashboard";
  return "home";
}

const COMFORTABLE_VIEW_STORAGE_KEY = "chunbae_comfortable_view";

function getStoredComfortableView() {
  try {
    return localStorage.getItem(COMFORTABLE_VIEW_STORAGE_KEY) === "true";
  } catch {
    return false;
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
  const [storedSession] = useState(() => getStoredAuthSession());
  const [appState, setAppState] = useState(isSocialCallbackPath ? "socialCallback" : "splash");
  const [user, setUser] = useState(storedSession);
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState(() => getInitialScreenForRole(storedSession?.role));
  const [toast, setToast] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [selectedMerchantShopId, setSelectedMerchantShopId] = useState(null);
  const [comfortableView, setComfortableView] = useState(getStoredComfortableView);
  const [likeChangeCounter, setLikeChangeCounter] = useState(0);
  const historyInitializedRef = useRef(false);
  const restoringHistoryRef = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const go = (scr) => setScreen(scr);
  const goHome = () => {
    setAppState("main");
    setTab("home");
    setScreen("home");
  };
  const handleTab = (key) => {
    const mainTabs = ["home", "map", "chat", "my"];
    if (mainTabs.includes(key)) setTab(key);
    setScreen(key);
  };
  const handleLogin = (userData) => {
    const role = String(userData?.role || "USER").toUpperCase();
    setUser(userData);
    setAppState("main");
    setTab("home");
    if (role === "MERCHANT") setScreen("merchant");
    else if (role === "ADMIN") setScreen("adminDashboard");
    else setScreen("home");
  };
  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setAppState("landing");
    setScreen("home");
    setTab("home");
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
      setAppState(state.appState || "landing");
      setScreen(state.screen || "home");
      setTab(state.tab || "home");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (appState === "splash") return;

    const state = { chunbaeTour: true, appState, screen, tab };
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
  }, [appState, screen, tab]);

  useEffect(() => {
    document.documentElement.classList.toggle("comfortable-view", comfortableView);
    try {
      localStorage.setItem(COMFORTABLE_VIEW_STORAGE_KEY, comfortableView ? "true" : "false");
    } catch {
      // localStorage를 사용할 수 없는 환경에서도 화면 상태는 유지합니다.
    }
  }, [comfortableView]);

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
    "ar", "notif", "search", "fest", "festCalendar", "festDetail",
    "pay", "payHistory", "qrpay", "storeProduct", "storeShop",
    "community", "communityPost", "communityWrite",
    "wishlist", "myReview", "ownedItems", "notificationSettings", "faq",
    "merchant", "merchantMenu", "merchantSettlement", "merchantApply",
    "adminDashboard", "adminUsers", "adminReports", "adminMerchant", "adminContent",
  ];
  const showTab = !noTabScreens.includes(screen);

  if (appState === "splash") return <div style={S.app}><SplashScreen onDone={() => setAppState(storedSession ? "main" : "landing")} /></div>;
  if (appState === "socialCallback") return <div style={S.app}><SocialCallbackScreen /></div>;
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
      </div>
    );
  }
  if (appState === "login")  return <div style={S.app}><LoginPage onLogin={handleLogin} onSignup={() => setAppState("signup")} /></div>;
  if (appState === "signup") return <div style={S.app}><SignupPage onBack={() => setAppState("login")} onDone={handleLogin} /></div>;

  return (
    <div style={S.app}>
      <AppShell active={tab} screen={screen} onTab={handleTab} onAR={() => go("ar")} onHome={goHome} user={user} onLogin={() => setAppState("login")} showMobileTab={showTab}>
        {screen === "home"             && <HomePage key={likeChangeCounter} onPlaceClick={handlePlaceClick} onShopClick={handleShopClick} onFestClick={() => go("fest")} onTab={handleTab} showToast={showToast} user={user} />}
        {screen === "map"              && <MapPage key={likeChangeCounter} onPlaceClick={handlePlaceClick} />}
        {screen === "place"            && <PlaceDetailPage place={selectedPlace} onBack={() => go(tab)} showToast={showToast} onDirection={() => go("direction")} onQrPay={() => go("qrpay")} onShopClick={handleShopClick} onLikeChange={handleLikeChange} />}
        {screen === "direction"        && <DirectionPage place={selectedPlace} onBack={() => go("place")} />}
        {screen === "search"           && <SearchPage onBack={() => go(tab)} onPlaceClick={handlePlaceClick} onShopClick={handleShopClick} />}
        {screen === "fest"             && <FestivalPage onBack={() => go(tab)} onCalendar={() => go("festCalendar")} onFestival={(festival) => { setSelectedFestival(festival); go("festDetail"); }} />}
        {screen === "festCalendar"     && <FestivalCalendarPage onBack={() => go("fest")} onFestival={(festival) => { setSelectedFestival(festival); go("festDetail"); }} />}
        {screen === "festDetail"       && <FestivalDetailPage festival={selectedFestival} onBack={() => go("fest")} />}
        {screen === "community"        && <CommunityListPage onPost={(p) => { setSelectedPost(p); go("communityPost"); }} onWrite={() => go("communityWrite")} onBack={() => go(tab)} />}
        {screen === "communityPost"    && <CommunityPostPage post={selectedPost} onBack={() => go("community")} showToast={showToast} user={user} onChatRoom={(room) => { setSelectedRoom(room); go("chatroom"); }} />}
        {screen === "communityWrite"   && <CommunityWritePage onBack={() => go("community")} showToast={showToast} />}
        {screen === "chat"             && <ChatListPage onChatRoom={(r) => { setSelectedRoom(r); go("chatroom"); }} showToast={showToast} />}
        {screen === "chatroom"         && <ChatRoomPage room={selectedRoom} onBack={() => go("chat")} showToast={showToast} onRequest={() => go("chatRequest")} />}
        {screen === "chatRequest"      && <ChatRequestPage room={selectedRoom} onBack={() => go("chatroom")} showToast={showToast} />}
        {screen === "pay"              && <PayChargePage onBack={() => go("my")} onDone={() => go("my")} showToast={showToast} />}
        {screen === "payHistory"       && <PayHistoryPage onBack={() => go("my")} onPlaceClick={handlePlaceClick} onShopClick={handleShopClick} showToast={showToast} />}
        {screen === "qrpay"            && <QRPayPage onBack={() => go(tab)} showToast={showToast} />}
        {screen === "store"            && <StorePage onProduct={handleProductClick} />}
        {screen === "storeProduct"     && <StoreProductPage product={selectedProduct} onBack={() => go("store")} showToast={showToast} />}
        {screen === "storeShop"        && <StoreShopDetailPage shop={selectedShop} onBack={() => go(tab)} showToast={showToast} onQrPay={() => go("qrpay")} />}
        {screen === "my"               && <MyPage key={likeChangeCounter} onTab={handleTab} showToast={showToast} onLogout={handleLogout} onLogin={() => setAppState("login")} onProfileUpdate={setUser} user={user} comfortableView={comfortableView} onComfortableViewChange={setComfortableView} />}
        {screen === "wishlist"         && <WishlistPage onBack={() => go("my")} onPlaceClick={handlePlaceClick} />}
        {screen === "myReview"         && <MyReviewPage onBack={() => go("my")} showToast={showToast} />}
        {screen === "ownedItems"       && <OwnedItemsPage onBack={() => go("my")} showToast={showToast} />}
        {screen === "ar"               && <ARPage onBack={() => go(tab)} />}
        {screen === "notif"            && <NotificationPage onBack={() => go(tab)} />}
        {screen === "notificationSettings" && <NotificationSettingsPage onBack={() => go("my")} showToast={showToast} />}
        {screen === "faq"              && <FAQPage onBack={() => go(tab)} />}
        {screen === "merchant"         && <MerchantShopPage onBack={() => go("my")} showToast={showToast} onMenuManage={() => go("merchantMenu")} onSettlement={() => go("merchantSettlement")} selectedShopId={selectedMerchantShopId} onShopChange={setSelectedMerchantShopId} />}
        {screen === "merchantMenu"     && <MerchantMenuPage onBack={() => go("merchant")} showToast={showToast} selectedShopId={selectedMerchantShopId} />}
        {screen === "merchantSettlement" && <MerchantSettlementPage onBack={() => go("merchant")} showToast={showToast} selectedShopId={selectedMerchantShopId} />}
        {screen === "merchantApply"   && <MerchantApplyPage onBack={() => go("my")} showToast={showToast} onLogin={() => setAppState("login")} />}
        {screen === "adminDashboard"   && <AdminDashboardPage onBack={() => go("my")} onNav={go} />}
        {screen === "adminUsers"       && <AdminUsersPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminReports"     && <AdminReportsPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminMerchant"    && <AdminMerchantPage onBack={() => go("adminDashboard")} showToast={showToast} />}
        {screen === "adminContent"     && <AdminContentPage onBack={() => go("adminDashboard")} showToast={showToast} />}
      </AppShell>
      <Toast msg={toast} />
    </div>
  );
}
