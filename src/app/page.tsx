import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative bg-brand-navy text-white overflow-hidden py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-brand-gold blur-[150px] rounded-full"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <span className="text-brand-gold font-semibold tracking-wider mb-4 border border-brand-gold/30 px-4 py-1 rounded-full text-sm">
            프리미엄 대면 서비스 채용 플랫폼
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            내 커리어의 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-yellow-200">가장 완벽한 첫인상</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl">
            단순한 아르바이트가 아닙니다. 승무원, 호텔리어 합격의 숨은 비결.<br />
            VVIP 응대 실무 경험을 '더 로비'에서 시작하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/register" className="bg-brand-gold text-brand-navy px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] text-center">
              1분 미디어 프로필 등록
            </Link>
            <Link href="/jobs" className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all text-center">
              채용공고 둘러보기
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-brand-navy mb-16">왜 '더 로비'에서 커리어를 시작해야 할까요?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="w-14 h-14 bg-brand-navy text-brand-gold flex items-center justify-center rounded-xl mx-auto mb-6 text-2xl">✈️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">확실한 스펙업 코스</h3>
              <p className="text-gray-600 leading-relaxed">항공사, 5성급 호텔 공채를 준비하시나요? 실전 VVIP 응대 경험은 어떤 자격증보다 강력한 무기가 됩니다.</p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="w-14 h-14 bg-brand-navy text-brand-gold flex items-center justify-center rounded-xl mx-auto mb-6 text-2xl">🎙️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">나를 보여주는 프로필</h3>
              <p className="text-gray-600 leading-relaxed">딱딱한 텍스트 이력서는 그만. 당신의 밝은 미소와 목소리를 담은 짧은 영상으로 기업에 확실한 인상을 남기세요.</p>
            </div>
            <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="w-14 h-14 bg-brand-navy text-brand-gold flex items-center justify-center rounded-xl mx-auto mb-6 text-2xl">💼</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">검증된 프리미엄 일자리</h3>
              <p className="text-gray-600 leading-relaxed">로펌 리셉션, 외국계 기업 데스크, 프라이빗 라운지 등 J&C 전문 헤드헌터가 엄선한 양질의 포지션만 제공합니다.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}