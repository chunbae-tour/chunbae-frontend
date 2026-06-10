import { motion } from "framer-motion";
import { PwaInstallButton } from "../../components/common";
import ChunbaeImg from "../../assets/hwangchunbae.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut", delay: i * 0.12 },
  }),
};

const float = {
  animate: {
    y: [0, -12, 0],
    transition: { duration: 3.2, ease: "easeInOut", repeat: Infinity },
  },
};

export default function PublicHomePage({ onLogin, onSignup, onExplore }) {
  const explore = (target) => () => onExplore(target);

  return (
    <main className="public-home">
      <div className="public-motion-layer" aria-hidden="true">
        <span className="motion-leaf leaf-a" />
        <span className="motion-leaf leaf-b" />
        <span className="motion-leaf leaf-c" />
        <span className="motion-leaf leaf-d" />
        <span className="motion-coin coin-a" />
        <span className="motion-coin coin-b" />
        <span className="motion-glow glow-a" />
        <span className="motion-glow glow-b" />
      </div>
      <header className="public-nav">
        <div className="public-brand">
          <motion.img
            src={ChunbaeImg}
            alt="춘배 캐릭터"
          />
          <div>
            <strong>춘배투어</strong>
            <span>ChunBae Tour</span>
          </div>
        </div>
        <nav className="public-nav-menu" aria-label="주요 서비스">
          <button type="button" onClick={explore("map")}>전통시장 탐방</button>
          <button type="button" onClick={explore("search")}>테마별 코스</button>
          <button type="button" onClick={explore("fest")}>동네 축제</button>
          <button type="button" onClick={explore("home")}>서비스 소개</button>
        </nav>
        <div className="public-nav-actions">
          <button type="button" className="public-login-link" onClick={onLogin}>로그인</button>
          <button type="button" className="public-ghost" onClick={onSignup}>회원가입</button>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-hero-copy">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            전통시장 · 관광지 · 동행 매칭
          </motion.span>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            오늘 갈 만한 시장과 동네 코스,<br />한 화면에서 둘러보세요
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            현재 위치를 기준으로 가까운 전통시장, 주변 명소, 동네 축제,
            먹거리 골목까지 한 번에 확인할 수 있어요.
          </motion.p>
          <motion.div
            className="public-hero-actions"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <motion.button
              type="button"
              className="public-primary large"
              onClick={explore("home")}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 20 }}
            >
              동네 한 바퀴 둘러보기
            </motion.button>
            <motion.button
              type="button"
              className="public-ghost large"
              onClick={explore("search")}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 20 }}
            >
              가까운 시장 찾기
            </motion.button>
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 20 }}
            >
              <PwaInstallButton className="public-install large">
                앱 설치하기
              </PwaInstallButton>
            </motion.div>
          </motion.div>
          <motion.p
            className="public-hero-note"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            회원가입 없이 주변 코스부터 먼저 볼 수 있어요.
          </motion.p>
          <motion.div
            className="public-hero-signal-row"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
          >
            {[
              { label: "🗺️ 전통시장 코스", tab: "map" },
              { label: "🎉 동네 축제 일정", tab: "fest" },
              { label: "👥 동행 찾기", tab: "chat" },
              { label: "📍 지금 열린 시장", tab: "map" },
            ].map(({ label, tab }) => (
              <motion.button
                key={label}
                type="button"
                onClick={explore(tab)}
                whileHover={{ backgroundColor: "#9a5f00", color: "#fffdf8", borderColor: "#9a5f00" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                {label}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="public-content-grid">
        <div className="public-section">
          <div className="public-section-head">
            <h2>다가오는 축제</h2>
            <span>실시간 축제 정보를 준비 중입니다</span>
          </div>
          <button type="button" className="public-empty-panel" onClick={explore("fest")}>
            축제 캘린더에서 최신 일정을 확인해 주세요.
          </button>
        </div>
      </section>
    </main>
  );
}
