import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "J&C Workspace | The Lobby B2B Admin",
};

export default function B2BAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#fbfbfa] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm">
        <div className="h-12 flex items-center px-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brand-navy rounded-sm"></div>
            <span className="font-semibold text-sm tracking-tight text-slate-900">J&C Workspace</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-2">Core</div>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-100 text-brand-navy rounded-md transition-colors">
            대시보드 홈
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            지원자 DB 관리
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            채용 공고 (JD) 관리
          </button>
          
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 mt-4">Pipeline</div>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            서류 심사 진행중
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            고객사 면접 대기
          </button>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">JC</div>
            <div className="text-xs font-medium text-slate-700">제이앤씨 헤드헌터</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <h1 className="text-sm font-semibold text-slate-800">Overview</h1>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
              System Online
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-[#fcfcfc] p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}