export default function JobsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-brand-navy mb-4">프리미엄 포지션</h1>
          <p className="text-slate-500">당신의 커리어를 한 단계 높여줄 엄선된 기회들입니다.</p>
        </div>

        {/* Filter Tags */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {['전체', '✈️ 항공사 준비생 추천', '🌐 외국어 필수', '👔 로펌/전문직', '🏨 VVIP 라운지'].map((tag, i) => (
            <button key={i} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${i === 0 ? 'bg-brand-navy text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-gold'}`}>
              {tag}
            </button>
          ))}
        </div>

        {/* Job List */}
        <div className="space-y-4">
          {[
            {
              company: "국내 대형 법무법인",
              title: "VIP 의전 및 프론트 데스크 리셉셔니스트",
              tags: ["항공사 준비생 추천", "신입가능"],
              learn: "최상위 VIP 응대 스킬 및 프로페셔널한 비즈니스 애티튜드 장착",
              loc: "서울 서초구",
              salary: "연 3,400만원"
            },
            {
              company: "글로벌 IT 기업",
              title: "임원진 전담 컨시어지 매니저",
              tags: ["외국어 필수", "경력우대"],
              learn: "네이티브 수준의 비즈니스 영어 활용 및 글로벌 기업 문화 경험",
              loc: "서울 강남구",
              salary: "연 4,000만원"
            },
            {
              company: "5성급 프라이빗 멤버십",
              title: "라운지 고객 응대 및 F&B 서비스",
              tags: ["호텔리어 준비생 추천"],
              learn: "프리미엄 호스피탈리티 실무 및 돌발 상황 대처 능력 배양",
              loc: "서울 용산구",
              salary: "연 3,200만원"
            }
          ].map((job, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer">
              <div className="flex-1">
                <span className="text-xs font-bold text-brand-gold tracking-wide mb-2 block">{job.company}</span>
                <h3 className="text-xl font-bold text-brand-navy mb-3 group-hover:text-slate-600 transition-colors">{job.title}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.tags.map((tag, j) => (
                    <span key={j} className="px-2 py-1 bg-slate-50 text-slate-600 text-[11px] font-medium rounded-md border border-slate-100">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="bg-brand-light p-3 rounded-lg inline-block">
                  <span className="text-[12px] font-bold text-brand-navy block mb-1">💡 What you will learn</span>
                  <span className="text-sm text-slate-600">{job.learn}</span>
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-3 min-w-[120px]">
                <div className="text-sm font-medium text-slate-500">📍 {job.loc}</div>
                <div className="text-sm font-medium text-slate-500">💰 {job.salary}</div>
                <button className="w-full md:w-auto mt-2 bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-gold transition-colors">
                  원클릭 지원
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}