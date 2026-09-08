import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
      <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100 max-w-sm w-full">
        <h2 className="text-3xl font-black text-slate-900 mb-2">404</h2>
        <p className="text-sm font-bold text-slate-700 mb-1">페이지를 찾을 수 없습니다</p>
        <p className="text-xs text-slate-400 mb-6">요청하신 페이지가 존재하지 않습니다.</p>
        <Link
          href="/mentor"
          className="inline-block rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
        >
          멘토 센터로 가기
        </Link>
      </div>
    </main>
  );
}

