"use client";

import { EVENT_MODE_LABEL, FORKS, RED_MODE_LABEL, SHOP_AT, SPACES, SPACE_LABEL } from "@/game/board";
import { ITEMS, ITEM_IDS, RANDOM_ITEM_POOL } from "@/game/items";
import { FULL_BAG_TALENTS } from "@/game/reducer";
import type { Settings } from "@/game/types";
import { ItemIcon } from "@/components/ItemIcon";

/**
 * 운영자용 전체 게임 설명서.
 * 참가자 도움말에는 숨긴 규칙(해프닝 종류, 스타 재배치 규칙, 어려운 칸 모드 배정 등)까지 모두 적는다.
 * 숫자는 현재 설정값을 그대로 읽어 온다.
 */
export function ManualTab({ settings }: { settings: Settings }) {
  const r = settings.rewards;
  const byType = (t: keyof typeof r) => SPACES.filter((s) => s.type === t).map((s) => s.id);
  const reds = SPACES.filter((s) => s.type === "red");
  const events = SPACES.filter((s) => s.type === "event");
  const poolCount = RANDOM_ITEM_POOL.reduce<Record<string, number>>((m, id) => ({ ...m, [id]: (m[id] ?? 0) + 1 }), {});

  return (
    <div className="flex flex-col gap-6 max-w-3xl text-slate-800 leading-relaxed">
      <Section title="한눈에 보기">
        <ul className="list-disc pl-5">
          <li>총 <b>{settings.totalTurns}턴</b>. 모든 팀이 한 번씩 움직이면 1턴. 시작 달란트 <b>{settings.startTalents}</b>.</li>
          <li>주사위 <b>{settings.diceCount}개</b>를 실물로 굴리고 운영자가 각 눈을 입력하면 합만큼 말이 자동으로 이동해요. 도착한 칸의 로마서 8장 구절을 암송해 달란트를 얻어요.</li>
          <li>달란트로 <b>스타({settings.starPrice}달란트)</b>를 사요. 보드에는 항상 <b>{settings.starCount}개</b>의 스타가 떠 있어요.</li>
          <li>게임이 끝나면 보너스 스타를 더해 <b>스타 → 달란트</b> 순으로 순위를 매겨요.</li>
          <li>달란트는 실물로도 주고받아요. 화면의 “MC 실물 달란트 안내”가 지급·회수할 금액(10·5·1권 조합)을 알려 줘요.</li>
        </ul>
      </Section>

      <Section title="한 턴의 흐름">
        <ol className="list-decimal pl-5">
          <li><b>아이템 사용(선택)</b>: 굴리기 전에 이동 아이템(트리플/선택 다이스, 워프·황금 파이프)을 쓸 수 있어요. 턴당 이동 아이템 1개.</li>
          <li><b>주사위 입력</b>: 운영자가 주사위마다 나온 눈을 차례로 누르면 말이 이동해요.</li>
          <li><b>갈림길</b>: 이동 중 갈림길(3·16·30번 칸)에 서면 팀이 길을 고르고 운영자가 입력해요. 남은 칸 수만큼 계속 이동해요.</li>
          <li><b>스타 지나가기</b>: 이동 경로에 스타가 있고 살 수 있는 달란트가 있으면 멈춰서 물어봐요. 사겠다고 하면 <b>그 칸의 구절을 암송</b>해야 하고, 성공하면 스타를 사요(암송 보상 달란트도 받아요). 실패하면 못 사고, 어느 쪽이든 남은 칸을 계속 가요.</li>
          <li><b>상점</b>: {SHOP_AT}번 칸으로 들어가는 길목(지름길·바깥길 합류점)을 지날 때 상점이 열려요. 아이템을 사거나 그냥 지나가요.</li>
          <li><b>도착 칸 암송</b>: 도착한 칸의 구절을 암송. 운영자가 성공/실패를 판정해요. 암송 아이템(방패, 2배권, 힌트권)은 이때 써요. 턴당 암송 아이템 1개.</li>
          <li><b>칸 효과 정산</b> 후 “다음 팀으로”.</li>
        </ol>
        <p className="mt-2 text-sm text-slate-600">출발 칸을 지나면 바퀴 수가 올라가고, 같은 구절을 다시 만나도 그대로 암송해요.</p>
      </Section>

      <Section title="칸 종류와 보상">
        <table className="w-full text-sm">
          <tbody>
            <Row k="일반 칸" v={`장절을 보고 그대로 암송. 성공 +${r.blue}`} ids={byType("blue")} />
            <Row k="어려운 칸" v={`긴 구절. 칸마다 난이도 방식이 정해져 있어요(아래 표). 성공 +${r.red}`} ids={byType("red")} />
            <Row k="이벤트 칸" v={`특별한 방식으로 암송(아래 표). 성공 +${r.event}`} ids={byType("event")} />
            <Row k="선물 칸" v={`성공하면 +${r.item} 달란트와 랜덤 아이템 1개`} ids={byType("item")} />
            <Row k="해프닝 칸" v={`멈추는 즉시 해프닝 1개가 랜덤 발생(아래). 그 후 암송, 성공 +${r.happening}`} ids={byType("happening")} />
            <Row k="축복 칸" v={`멈추는 즉시 꼴찌 팀(스타→달란트 최하위)에 +5 달란트. 그 후 암송, 성공 +${r.bless}`} ids={byType("bless")} />
          </tbody>
        </table>
        <p className="text-sm text-slate-600 mt-2">실패하면 달란트를 받지 못해요(차감은 없어요). 아이템을 쓴 경우에도 아이템은 돌려주지 않아요.</p>

        <h4 className="font-bold mt-4 mb-1">어려운 칸 방식 (칸마다 고정)</h4>
        <ul className="grid sm:grid-cols-3 gap-x-4 text-sm">
          {reds.map((s) => (
            <li key={s.id}>
              <b>{s.id}절</b> · {s.redMode ? RED_MODE_LABEL[s.redMode] : ""}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600 mt-1">빈칸 채우기: 화면에 일부 단어가 가려진 본문이 떠요. 첫 단어만 보고: 첫 단어만 보여줘요. 힌트 없음: 장절만 보여요(일반 칸과 같지만 구절이 길어요). 방패를 쓰면 빈칸 채우기 방식으로 바뀌고 보상은 그대로예요.</p>

        <h4 className="font-bold mt-4 mb-1">이벤트 칸 방식 (칸마다 고정)</h4>
        <ul className="text-sm">
          {events.map((s) => (
            <li key={s.id}>
              <b>{s.id}절</b> · {s.eventMode ? EVENT_MODE_LABEL[s.eventMode] : ""}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600 mt-1">3절 연속은 앞뒤 절을 포함해 3절(예: 20·21·22절)을 이어서 암송해요. 어려운 칸·이벤트 칸 성공은 “도전 스타” 집계에 들어가요.</p>
      </Section>

      <Section title="해프닝 (참가자에게는 비공개)">
        <p className="text-sm text-slate-600 mb-1">해프닝 칸에 멈추면 아래 넷 중 하나가 같은 확률로 일어나요. 결과는 이벤트 순번으로 정해지므로 되돌리기(Undo) 후 다시 해도 같은 결과예요.</p>
        <ul className="list-disc pl-5">
          <li><b>스타 대이동</b>: 보드의 스타가 모두 다른 곳으로 옮겨져요.</li>
          <li><b>달란트 비</b>: 모든 팀 +2 달란트.</li>
          <li><b>황금 라운드</b>: 이번 턴(라운드) 동안 모든 팀의 암송 보상 2배.</li>
          <li><b>깜짝 선물</b>: 랜덤 아이템 1개. 가방이 가득 차 있으면 대신 +{FULL_BAG_TALENTS} 달란트.</li>
        </ul>
      </Section>

      <Section title="스타">
        <ul className="list-disc pl-5">
          <li>가격 {settings.starPrice}달란트, 스타 할인권을 쓰면 {settings.couponStarPrice}달란트. 지나가거나 도착했을 때 모두 살 수 있어요.</li>
          <li>사려면 그 칸의 구절을 먼저 암송해야 해요(그 칸의 난이도 규칙 적용). 스타 칸에 도착한 경우에는 암송 1번으로 도착 보상과 스타 구매를 함께 처리해요.</li>
          <li>구매하면 스타는 사라지고 새 스타가 다른 곳에 나타나요. 새 위치 규칙: 선물 칸과 1번 칸, 지금 말이 서 있는 칸은 제외, 구매한 팀 앞 6칸 이내 제외, 다른 스타와 최소 10칸(안 되면 7·4·1칸) 떨어진 곳 중 랜덤.</li>
          <li>마지막 {settings.finalBoostTurns}턴은 암송 보상이 2배예요(화면에 “보상 2배” 뱃지). 황금 라운드·달란트 2배권과 겹치면 곱해져요.</li>
        </ul>
      </Section>

      <Section title="아이템">
        <ul className="list-disc pl-5 mb-3">
          <li>팀당 최대 {settings.inventoryLimit}개. 가득 찬 상태에서 아이템을 받게 되면 대신 +{FULL_BAG_TALENTS} 달란트.</li>
          <li>상점은 통과할 때만 열려요(도착해서가 아니라). 보유 달란트와 가방 여유가 있어야 구매 버튼이 활성화돼요.</li>
          <li>게임 종료 시 남은 아이템은 1개당 {settings.itemRefund}달란트로 환급돼요.</li>
        </ul>
        <ul className="flex flex-col gap-2">
          {ITEM_IDS.map((id) => (
            <li key={id} className="flex gap-3 items-start">
              <span className="inline-flex w-9 h-9 rounded-xl bg-slate-200 items-center justify-center shrink-0">
                <ItemIcon id={id} size={24} />
              </span>
              <span className="text-sm">
                <b>{ITEMS[id].name}</b> <span className="text-slate-500">({ITEMS[id].price}달란트)</span>
                <br />
                {ITEM_DETAIL[id]}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600 mt-3">
          선물 칸·깜짝 선물의 랜덤 뽑기 비율:{" "}
          {Object.entries(poolCount)
            .map(([id, n]) => `${ITEMS[id as keyof typeof ITEMS].name} ${n}`)
            .join(" · ")}{" "}
          (총 {RANDOM_ITEM_POOL.length}장 중).
        </p>
      </Section>

      <Section title="갈림길">
        <ul className="list-disc pl-5">
          {Object.entries(FORKS).map(([at, opts]) => (
            <li key={at}>
              <b>{at}번 칸</b>: {opts.map((o) => `${o.label}(${o.to}절부터)`).join(" / ")}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="게임 종료와 시상">
        <ol className="list-decimal pl-5">
          <li>마지막 턴이 끝나면 남은 아이템을 환급하고 시상식으로 넘어가요.</li>
          <li>보너스 스타(설정에서 켜고 끌 수 있어요): <b>암송 스타</b>(암송 성공 횟수 최다), <b>달란트 스타</b>(달란트 보유 최다), <b>도전 스타</b>(어려운 칸·이벤트 칸 성공 최다). 동점이면 모두 받아요. 0이면 아무도 못 받아요.</li>
          <li>최종 순위는 <b>스타(보너스 포함) → 달란트</b> 순. 그래도 같으면 공동 순위.</li>
          <li>시상식 화면은 운영자가 “다음”을 눌러 한 단계씩 공개해요.</li>
        </ol>
      </Section>

      <Section title="운영 팁">
        <ul className="list-disc pl-5">
          <li><b>되돌리기/다시 실행</b>: 진행 탭 상단. 달란트가 바뀌면 실물로 회수·지급할 금액을 확인창에 보여줘요.</li>
          <li><b>강제 개입</b> 탭에서 달란트 조정, 위치 이동, 스타·아이템 수정이 가능해요(장부에 남아요).</li>
          <li><b>일시정지</b>를 누르면 참가자 화면에 “잠시만요”가 떠요.</li>
          <li>참가자 화면 “?” 도움말에는 해프닝 종류, 스타 재배치 규칙, 어려운 칸 방식 같은 세부 규칙은 보이지 않아요.</li>
        </ul>
      </Section>
    </div>
  );
}

const ITEM_DETAIL: Record<string, string> = {
  tripleDice: "굴리기 전에 사용. 주사위 3개를 굴려 합(3~18)만큼 이동해요.",
  selectDice: "굴리기 전에 사용. 낮음 또는 높음을 고르면 굴린 모든 주사위 눈이 그 범위로 바뀌어요(낮음: 4→1, 5→2, 6→3 / 높음: 1→4, 2→5, 3→6). 운영자는 나온 눈을 그대로 입력하면 자동 변환돼요.",
  warpPipe: "굴리기 전에 사용. 다른 팀이 서 있는 칸 중 하나로 랜덤 이동하고, 그 칸에 도착한 것으로 처리해요(암송·칸 효과 적용). 출발 칸에 있는 팀은 대상에서 제외. 이 턴엔 주사위를 굴리지 않아요.",
  goldenPipe: "굴리기 전에 사용. 앞으로 가장 가까운 스타 칸으로 바로 이동해 도착 처리. 스타를 살 달란트가 있어야 구매까지 이어져요.",
  shield: "어려운 칸에 도착했거나 어려운 칸의 스타를 살 때 사용. 그 칸의 방식(첫 단어만 보고 / 힌트 없음)을 가장 쉬운 '빈칸 채우기'로 바꿔요. 보상은 어려운 칸 금액 그대로이고 도전 스타 집계에도 들어가요. 원래 빈칸 채우기인 칸에서는 쓸 수 없어요.",
  doubleTalent: "도착 칸 암송 때 사용. 이번 암송 성공 보상이 2배(마지막 턴 보너스·황금 라운드와 중첩).",
  hint: "암송 중 막혔을 때 사용. 사회자가 다음 단어 하나를 알려줘요(1회).",
  starCoupon: "스타를 살 때 자동 적용. 스타 가격이 할인돼요. 1회용.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="font-display text-xl mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Row({ k, v, ids }: { k: string; v: string; ids: number[] }) {
  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-1.5 pr-3 font-bold whitespace-nowrap">{k}</td>
      <td className="py-1.5 pr-3">{v}</td>
      <td className="py-1.5 text-slate-500 whitespace-nowrap">{ids.length ? `${ids.join("·")}절` : ""}</td>
    </tr>
  );
}
// SPACE_LABEL은 칸 이름의 기준으로 유지 (참가자 화면과 동일한 이름을 쓰기 위함)
void SPACE_LABEL;
