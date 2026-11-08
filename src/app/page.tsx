import Link from "next/link";

const LINKS = [
  { href: "/join", title: "참가자", desc: "팀을 고르고 게임 현황 보기", emoji: "📱", color: "bg-green-500" },
  { href: "/display", title: "메인 스크린", desc: "교회 앞 화면에 띄우기", emoji: "🖥️", color: "bg-sky-500" },
  { href: "/admin", title: "어드민", desc: "오퍼레이터 진행 화면", emoji: "🎛️", color: "bg-red-500" },
];

export default function Home() {
  return (
    <main className="min-h-full flex flex-col items-center justify-center gap-8 p-6 bg-gradient-to-b from-sky-300 to-sky-100">
      <div className="text-center">
        <div className="text-6xl">⭐📖🎲</div>
        <h1 className="font-display text-5xl mt-3 text-slate-800">로마서 8장 암송 파티</h1>
        <p className="mt-2 text-slate-600">달란트를 모아 스타를 얻어라!</p>
      </div>
      <div className="grid gap-4 w-full max-w-md">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`${l.color} rounded-3xl p-5 text-white shadow-lg hover:scale-[1.02] transition`}>
            <div className="font-display text-3xl">
              {l.emoji} {l.title}
            </div>
            <div className="opacity-90">{l.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
