// 리듀서 시나리오 테스트: npm run test:reducer
// 보드: 1~2 → 갈림(2) → 3~6 / 7~10 → 11~12·🎲·13~15 → 갈림(15) → 16~21·🎲 / 22~27 → 🏪 → 28~30 → 갈림(30) → 31·🎲·32~34 / 35~38 → 39 → 출발 (출발점은 칸이 아님)
// 주제별 파일은 scripts/tests/ 아래. 하나라도 실패하면 예외로 멈춘다.
import "./tests/scenario";
import "./tests/board";
import "./tests/items";
import "./tests/rules";
import "./tests/events";
