export default function B2BDashboardHome() {
  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">대시보드</h2>
          <p className="text-sm text-slate-500 mt-1">오늘 업데이트된 신규 지원자와 JD 현황입니다.</p>
        </div>
        <button className="bg-brand-navy hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm flex items-center gap-2">
          <span>+</span> AI 공고(JD) 자동 등록
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "신규 미디어 프로필", value: "12", diff: "+3", type: "positive" },
          { label: "진행중인 공고", value: "8", diff: "-", type: "neutral" },
          { label: "고객사 검토 대기", value: "24", diff: "+5", type: "positive" },
          { label: "금주 매칭 완료", value: "3", diff: "0", type: "neutral" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">{stat.label}</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-900 leading-none">{stat.value}</span>
              <span className={`text-xs font-medium ${stat.type === 'positive' ? 'text-emerald-600' : 'text-slate-400'}`}>
                {stat.diff}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* High-density Data Table: 신규 지원자 리스트 */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-800">최근 인입 지원자 (미디어 프로필)</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 스킬 검색..." 
              className="text-sm px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 font-medium w-12">ID</th>
                <th className="py-2.5 px-4 font-medium">지원자명</th>
                <th className="py-2.5 px-4 font-medium">영상 확인</th>
                <th className="py-2.5 px-4 font-medium">핵심 역량</th>
                <th className="py-2.5 px-4 font-medium">희망 지역</th>
                <th className="py-2.5 px-4 font-medium">등록일</th>
                <th className="py-2.5 px-4 font-medium text-right">상태</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {[
                { id: "A-104", name: "김지윤", media: "✅ 45초", skills: "영어 능통, 항공운항과", loc: "강남/서초", date: "10분 전", status: "미확인", statusColor: "bg-red-100 text-red-700" },
                { id: "A-103", name: "이서아", media: "✅ 60초", skills: "호텔 프론트 1년", loc: "여의도", date: "2시간 전", status: "검토중", statusColor: "bg-amber-100 text-amber-700" },
                { id: "A-102", name: "박민호", media: "❌ 사진", skills: "발렛, 의전 경험", loc: "용산/중구", date: "어제", status: "추천완료", statusColor: "bg-emerald-100 text-emerald-700" },
                { id: "A-101", name: "최유진", media: "✅ 30초", skills: "중국어(HSK6)", loc: "강남/서초", date: "어제", status: "추천완료", statusColor: "bg-emerald-100 text-emerald-700" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="py-2 px-4 text-xs font-mono text-slate-400">{row.id}</td>
                  <td className="py-2 px-4 font-medium text-slate-900">{row.name}</td>
                  <td className="py-2 px-4 text-slate-600 text-xs">{row.media}</td>
                  <td className="py-2 px-4 text-slate-600">{row.skills}</td>
                  <td className="py-2 px-4 text-slate-500">{row.loc}</td>
                  <td className="py-2 px-4 text-slate-400 text-xs">{row.date}</td>
                  <td className="py-2 px-4 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}