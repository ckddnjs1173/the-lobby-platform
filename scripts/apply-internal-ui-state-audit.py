from pathlib import Path

ROOT = Path.cwd()


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = ROOT / relative_path
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{relative_path}: expected exactly one match, found {count}\n--- OLD ---\n{old[:500]}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"UPDATED {relative_path}")


# Candidate Portal: distinguish a transport/API failure from a missing profile and remove unsupported recommendation copy.
path = "src/app/candidate/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [saving, setSaving] = useState(false);',
    '  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [saving, setSaving] = useState(false);',
)
replace_once(
    path,
    '  const loadPortal = useCallback(async () => {\n    setLoading(true);\n    try {',
    '  const loadPortal = useCallback(async () => {\n    setLoading(true);\n    setLoadError(null);\n    try {',
)
replace_once(
    path,
    '''      toast.error(\n        error instanceof CandidatePortalApiError\n          ? error.message\n          : "Candidate Portal을 불러오지 못했습니다."\n      );''',
    '''      const message =\n        error instanceof CandidatePortalApiError\n          ? error.message\n          : "Candidate Portal을 불러오지 못했습니다.";\n      setLoadError(message);\n      toast.error(message);''',
)
replace_once(
    path,
    '        <div className="flex min-h-[70vh] items-center justify-center pt-20 text-sm font-medium text-brand-muted">',
    '        <div role="status" aria-live="polite" className="flex min-h-[70vh] items-center justify-center pt-20 text-sm font-medium text-brand-muted">',
)
replace_once(
    path,
    '''  if (!profile || !form) {\n    return (''',
    '''  if (loadError) {\n    return (\n      <div className="candidate-surface min-h-screen bg-brand-light">\n        <CandidateHeader />\n        <main className="mx-auto max-w-xl px-5 pb-16 pt-32 sm:px-8">\n          <section role="alert" className="rounded-xl border border-brand-line bg-white px-6 py-12 text-center shadow-card">\n            <h1 className="font-editorial text-2xl text-brand-espresso">마이페이지를 불러오지 못했습니다.</h1>\n            <p className="mt-3 text-sm leading-6 text-brand-muted">{loadError}</p>\n            <button type="button" onClick={() => void loadPortal()} className="mt-6 rounded-lg bg-brand-bronze px-5 py-3 text-xs font-bold text-white">다시 불러오기</button>\n          </section>\n        </main>\n      </div>\n    );\n  }\n\n  if (!profile || !form) {\n    return (''',
)
replace_once(path, '추천 채용 보기 →', '채용공고 보기 →')


# Saved Jobs: load failure must not render as a true empty collection.
path = "src/app/candidate/saved-jobs/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [workingId, setWorkingId] = useState<string | null>(null);',
    '  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [workingId, setWorkingId] = useState<string | null>(null);\n  const [reloadKey, setReloadKey] = useState(0);',
)
replace_once(
    path,
    '''      try {\n        const [savedItems, publicJobs] = await Promise.all([''',
    '''      setLoadError(null);\n      try {\n        const [savedItems, publicJobs] = await Promise.all([''',
)
replace_once(
    path,
    '        toast.error(error instanceof CandidateSavedJobApiError ? error.message : "저장공고를 불러오지 못했습니다.");',
    '        const message = error instanceof CandidateSavedJobApiError ? error.message : "저장공고를 불러오지 못했습니다.";\n        setSaved([]);\n        setJobs([]);\n        setLoadError(message);\n        toast.error(message);',
)
replace_once(path, '  }, [router]);\n\n  const items = useMemo', '  }, [reloadKey, router]);\n\n  const items = useMemo')
replace_once(
    path,
    '''        {loading ? (\n          <div className="mt-7 rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">저장공고를 불러오는 중입니다...</div>\n        ) : items.length === 0 ? (''',
    '''        {loading ? (\n          <div role="status" aria-live="polite" className="mt-7 rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">저장공고를 불러오는 중입니다...</div>\n        ) : loadError ? (\n          <section role="alert" className="mt-7 rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">\n            <p className="text-sm font-bold text-brand-espresso">관심공고를 불러오지 못했습니다.</p>\n            <p className="mt-2 text-xs leading-5 text-brand-muted">{loadError}</p>\n            <button type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>\n          </section>\n        ) : items.length === 0 ? (''',
)


# Candidate opportunities: same failure/empty distinction.
path = "src/app/candidate/opportunities/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [workingId, setWorkingId] = useState<string | null>(null);',
    '  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [workingId, setWorkingId] = useState<string | null>(null);\n  const [reloadKey, setReloadKey] = useState(0);',
)
replace_once(
    path,
    '      try {\n        const opportunities = await fetchCandidateTalentOpportunities();',
    '      setLoadError(null);\n      try {\n        const opportunities = await fetchCandidateTalentOpportunities();',
)
replace_once(
    path,
    '''        toast.error(\n          error instanceof TalentOpportunityApiError\n            ? error.message\n            : "채용 제안을 불러오지 못했습니다."\n        );''',
    '''        const message =\n          error instanceof TalentOpportunityApiError\n            ? error.message\n            : "채용 제안을 불러오지 못했습니다.";\n        setItems([]);\n        setLoadError(message);\n        toast.error(message);''',
)
replace_once(path, '  }, [router]);\n\n  const respond = async', '  }, [reloadKey, router]);\n\n  const respond = async')
replace_once(
    path,
    '''        {loading ? (\n          <div className="mt-7 rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">채용 제안을 불러오는 중입니다...</div>\n        ) : items.length === 0 ? (''',
    '''        {loading ? (\n          <div role="status" aria-live="polite" className="mt-7 rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">채용 제안을 불러오는 중입니다...</div>\n        ) : loadError ? (\n          <section role="alert" className="mt-7 rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">\n            <p className="text-sm font-bold text-brand-espresso">채용 제안을 불러오지 못했습니다.</p>\n            <p className="mt-2 text-xs leading-5 text-brand-muted">{loadError}</p>\n            <button type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>\n          </section>\n        ) : items.length === 0 ? (''',
)


# B2B shell: accessible mobile navigation, readable microcopy and bounded mobile menu.
path = "src/app/b2b-admin/layout.tsx"
replace_once(
    path,
    '''  useEffect(() => {\n    setMobileOpen(false);\n  }, [pathname]);\n\n  useEffect(() => {\n    if (isLoginPage) {''',
    '''  useEffect(() => {\n    setMobileOpen(false);\n  }, [pathname]);\n\n  useEffect(() => {\n    if (!mobileOpen) return;\n    const handleKeyDown = (event: KeyboardEvent) => {\n      if (event.key === "Escape") setMobileOpen(false);\n    };\n    window.addEventListener("keydown", handleKeyDown);\n    return () => {\n      window.removeEventListener("keydown", handleKeyDown);\n    };\n  }, [mobileOpen]);\n\n  useEffect(() => {\n    if (isLoginPage) {''',
)
replace_once(
    path,
    '<div className="rounded-xl border border-brand-line bg-white px-8 py-7 text-center shadow-card">\n          <div className="font-editorial text-xl text-brand-espresso">THE LOBBY</div>',
    '<div role="status" aria-live="polite" className="rounded-xl border border-brand-line bg-white px-8 py-7 text-center shadow-card">\n          <div className="font-editorial text-xl text-brand-espresso">THE LOBBY</div>',
)
replace_once(
    path,
    '          onClick={() => mobile && setMobileOpen(false)}\n          className={`flex items-center gap-3 rounded-lg px-3 py-3 transition ${',
    '          onClick={() => mobile && setMobileOpen(false)}\n          aria-current={item.active ? "page" : undefined}\n          className={`flex items-center gap-3 rounded-lg px-3 py-3 transition ${',
)
replace_once(path, 'mt-0.5 truncate text-[10px]', 'mt-0.5 truncate text-[11px]')
replace_once(path, 'mt-1 text-[9px] font-semibold uppercase tracking-[0.16em]', 'mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]')
replace_once(
    path,
    '                aria-expanded={mobileOpen}\n                onClick={() => setMobileOpen((value) => !value)}',
    '                aria-expanded={mobileOpen}\n                aria-controls="b2b-mobile-navigation"\n                onClick={() => setMobileOpen((value) => !value)}',
)
replace_once(
    path,
    '<div className="absolute left-0 right-0 top-full z-40 border-b border-brand-line bg-brand-light p-4 shadow-soft lg:hidden">',
    '<div id="b2b-mobile-navigation" className="absolute left-0 right-0 top-full z-40 max-h-[calc(100vh-88px)] overflow-y-auto border-b border-brand-line bg-brand-light p-4 shadow-soft lg:hidden">',
)


# B2B application pipeline: initial load failure is not an empty pipeline; controls have explicit state/labels.
path = "src/app/b2b-admin/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [refreshing, setRefreshing] = useState(false);',
    '  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [refreshing, setRefreshing] = useState(false);',
)
replace_once(
    path,
    '''      if (initial) setLoading(true);\n      else setRefreshing(true);\n\n      try {\n        setApplications(await fetchB2BApplications());''',
    '''      if (initial) {\n        setLoading(true);\n        setLoadError(null);\n      } else {\n        setRefreshing(true);\n      }\n\n      try {\n        setApplications(await fetchB2BApplications());\n        if (initial) setLoadError(null);''',
)
replace_once(
    path,
    '''          if (!silent) toast.error(error.message);\n        } else if (!silent) {\n          toast.error("권한이 있는 지원 내역을 불러오지 못했습니다.");\n        }\n        if (initial) setApplications([]);''',
    '''          if (initial) setLoadError(error.message);\n          if (!silent) toast.error(error.message);\n        } else {\n          const message = "권한이 있는 지원 내역을 불러오지 못했습니다.";\n          if (initial) setLoadError(message);\n          if (!silent) toast.error(message);\n        }\n        if (initial) setApplications([]);''',
)
replace_once(
    path,
    '<div className="flex min-h-[520px] items-center justify-center rounded-xl border border-brand-line bg-white text-sm font-medium text-brand-muted shadow-card">',
    '<div role="status" aria-live="polite" className="flex min-h-[520px] items-center justify-center rounded-xl border border-brand-line bg-white text-sm font-medium text-brand-muted shadow-card">',
)
replace_once(
    path,
    '''  const metrics = [''',
    '''  if (loadError) {\n    return (\n      <section role="alert" className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-brand-line bg-white px-6 text-center shadow-card">\n        <h2 className="text-base font-bold text-brand-espresso">지원자 파이프라인을 불러오지 못했습니다.</h2>\n        <p className="mt-2 max-w-xl text-sm leading-6 text-brand-muted">{loadError}</p>\n        <button type="button" onClick={() => void refreshApplications({ initial: true })} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>\n      </section>\n    );\n  }\n\n  const metrics = [''',
)
replace_once(
    path,
    'key={mode} type="button" onClick={() => setViewMode(mode)}',
    'key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}',
)
replace_once(path, '<input value={searchQuery}', '<input aria-label="지원자 파이프라인 검색" value={searchQuery}')
replace_once(path, '<select value={stageFilter}', '<select aria-label="지원 단계 필터" value={stageFilter}')
replace_once(path, '<select value={jobFilter}', '<select aria-label="공고 필터" value={jobFilter}')
replace_once(path, '<select value={recruiterFilter}', '<select aria-label="담당자 필터" value={recruiterFilter}')
replace_once(path, '<select value={activityFilter}', '<select aria-label="처리상태 필터" value={activityFilter}')


# Organization candidate CRM: preserve a real failure state instead of rendering a fake empty pool.
path = "src/app/b2b-admin/candidates/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [queryText, setQueryText] = useState("");',
    '  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [reloadKey, setReloadKey] = useState(0);\n  const [queryText, setQueryText] = useState("");',
)
replace_once(
    path,
    '    setLoading(true);\n\n    fetchCandidatePoolPage',
    '    setLoading(true);\n    setLoadError(null);\n\n    fetchCandidatePoolPage',
)
replace_once(
    path,
    '''        toast.error(\n          error instanceof CandidatePoolApiError\n            ? error.message\n            : "후보자 풀을 불러오지 못했습니다."\n        );''',
    '''        const message =\n          error instanceof CandidatePoolApiError\n            ? error.message\n            : "후보자 풀을 불러오지 못했습니다.";\n        setCandidates([]);\n        setPagination({ total: 0, limit: PAGE_SIZE, hasMore: false, nextCursor: null });\n        setLoadError(message);\n        toast.error(message);''',
)
replace_once(path, '  }, [session.organizationId, cursor, searchQuery]);', '  }, [session.organizationId, cursor, reloadKey, searchQuery]);')
replace_once(
    path,
    '''        {loading ? (\n          <div className="py-16 text-center text-sm text-slate-400">후보자 풀을 불러오는 중입니다...</div>\n        ) : candidates.length === 0 ? (''',
    '''        {loading ? (\n          <div role="status" aria-live="polite" className="py-16 text-center text-sm text-slate-400">후보자 풀을 불러오는 중입니다...</div>\n        ) : loadError ? (\n          <div role="alert" className="space-y-3 py-16 text-center">\n            <p className="text-sm font-bold text-slate-700">후보자 CRM을 불러오지 못했습니다.</p>\n            <p className="text-xs text-slate-500">{loadError}</p>\n            <button type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }} className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">다시 불러오기</button>\n          </div>\n        ) : candidates.length === 0 ? (''',
)


# Jobs workspace: don't convert a combined jobs/organizations failure into zero counts and a fake empty list.
path = "src/app/b2b-admin/jobs/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [showCreate, setShowCreate] = useState(false);',
    '  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [reloadKey, setReloadKey] = useState(0);\n  const [showCreate, setShowCreate] = useState(false);',
)
replace_once(
    path,
    '    setLoading(true);\n\n    Promise.all([fetchB2BJobs(), fetchB2BOrganizations()])',
    '    setLoading(true);\n    setLoadError(null);\n\n    Promise.all([fetchB2BJobs(), fetchB2BOrganizations()])',
)
replace_once(
    path,
    '''        if (error instanceof JobApiError || error instanceof OrganizationApiError) {\n          toast.error(error.message);\n        } else {\n          toast.error("공고 관리 데이터를 불러오지 못했습니다.");\n        }''',
    '''        const message =\n          error instanceof JobApiError || error instanceof OrganizationApiError\n            ? error.message\n            : "공고 관리 데이터를 불러오지 못했습니다.";\n        setJobs([]);\n        setOrganizations([]);\n        setLoadError(message);\n        toast.error(message);''',
)
replace_once(path, '  }, []);\n\n  const validateForm', '  }, [reloadKey]);\n\n  const validateForm')
replace_once(path, '{counts[status]}</div>', '{loadError ? "—" : counts[status]}</div>')
replace_once(
    path,
    'session.role === "ADMIN" && organizations.length === 0 && !loading ?',
    'session.role === "ADMIN" && organizations.length === 0 && !loading && !loadError ?',
)
replace_once(
    path,
    '''        {loading ? (\n          <div className="py-16 text-center text-sm text-slate-400">공고 목록을 불러오는 중입니다...</div>\n        ) : jobs.length === 0 ? (''',
    '''        {loading ? (\n          <div role="status" aria-live="polite" className="py-16 text-center text-sm text-slate-400">공고 목록을 불러오는 중입니다...</div>\n        ) : loadError ? (\n          <div role="alert" className="px-6 py-16 text-center">\n            <p className="text-sm font-bold text-slate-700">공고 관리 데이터를 불러오지 못했습니다.</p>\n            <p className="mt-2 text-xs text-slate-500">{loadError}</p>\n            <button type="button" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }} className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">다시 불러오기</button>\n          </div>\n        ) : jobs.length === 0 ? (''',
)


# Global Talent Pool: separate candidate pool failure from OPEN-job-list failure.
path = "src/app/b2b-admin/talent-pool/page.tsx"
replace_once(
    path,
    '  const [loading, setLoading] = useState(true);\n  const [queryText, setQueryText] = useState("");',
    '  const [loading, setLoading] = useState(true);\n  const [poolError, setPoolError] = useState<string | null>(null);\n  const [jobsLoadError, setJobsLoadError] = useState<string | null>(null);\n  const [poolReloadKey, setPoolReloadKey] = useState(0);\n  const [jobsReloadKey, setJobsReloadKey] = useState(0);\n  const [queryText, setQueryText] = useState("");',
)
replace_once(
    path,
    '''    let cancelled = false;\n    fetchB2BJobs()''',
    '''    let cancelled = false;\n    setJobsLoadError(null);\n    fetchB2BJobs()''',
)
replace_once(
    path,
    '''      .catch((error) => {\n        if (!cancelled) console.error("Talent opportunity job list failed:", error);\n      });''',
    '''      .catch((error) => {\n        if (cancelled) return;\n        console.error("Talent opportunity job list failed:", error);\n        setJobs([]);\n        setJobsLoadError("OPEN 포지션 목록을 불러오지 못했습니다.");\n      });''',
)
replace_once(path, '  }, [session.role]);\n\n  useEffect(() => {\n    if (session.role !== "ADMIN") {', '  }, [jobsReloadKey, session.role]);\n\n  useEffect(() => {\n    if (session.role !== "ADMIN") {')
replace_once(
    path,
    '    let cancelled = false;\n    setLoading(true);\n\n    fetchGlobalTalentPool({',
    '    let cancelled = false;\n    setLoading(true);\n    setPoolError(null);\n\n    fetchGlobalTalentPool({',
)
replace_once(
    path,
    '''        toast.error(\n          error instanceof GlobalTalentPoolApiError\n            ? error.message\n            : "J&C 공개 인재풀을 불러오지 못했습니다."\n        );''',
    '''        const message =\n          error instanceof GlobalTalentPoolApiError\n            ? error.message\n            : "J&C 공개 인재풀을 불러오지 못했습니다.";\n        setItems([]);\n        setPoolError(message);\n        toast.error(message);''',
)
replace_once(path, '  }, [session.role, cursor, searchQuery]);', '  }, [session.role, cursor, poolReloadKey, searchQuery]);')
replace_once(path, '{pagination.total}명</strong>', '{poolError ? "—" : `${pagination.total}명`}</strong>')
replace_once(
    path,
    '''            <p className="mt-1 max-w-3xl text-[12px] leading-5 text-brand-muted">\n              AI 점수가 아니라 후보자가 직접 입력한 희망조건과 현재 OPEN 포지션을 비교한 설명 가능한 신호입니다. 이 신호만으로 자동 추천·지원·제안하지 않습니다.\n            </p>''',
    '''            <p className="mt-1 max-w-3xl text-[12px] leading-5 text-brand-muted">\n              AI 점수가 아니라 후보자가 직접 입력한 희망조건과 현재 OPEN 포지션을 비교한 설명 가능한 신호입니다. 이 신호만으로 자동 추천·지원·제안하지 않습니다.\n            </p>\n            {jobsLoadError ? (\n              <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-line bg-white px-3 py-2 text-xs text-brand-muted">\n                <span>{jobsLoadError}</span>\n                <button type="button" onClick={() => setJobsReloadKey((value) => value + 1)} className="font-bold text-brand-bronze">다시 불러오기</button>\n              </div>\n            ) : null}''',
)
replace_once(path, '{openJobs.length === 0 ? <option value="">공개 포지션 없음</option> : null}', '{openJobs.length === 0 ? <option value="">{jobsLoadError ? "포지션 목록 오류" : "공개 포지션 없음"}</option> : null}')
replace_once(
    path,
    '''      {loading ? (\n        <div className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">공개 인재풀을 불러오는 중입니다...</div>\n      ) : items.length === 0 ? (''',
    '''      {loading ? (\n        <div role="status" aria-live="polite" className="rounded-xl border border-brand-line bg-white py-20 text-center text-sm text-brand-muted shadow-card">공개 인재풀을 불러오는 중입니다...</div>\n      ) : poolError ? (\n        <div role="alert" className="rounded-xl border border-brand-line bg-white px-6 py-16 text-center shadow-card">\n          <p className="text-sm font-bold text-brand-espresso">J&C 공개 인재풀을 불러오지 못했습니다.</p>\n          <p className="mt-2 text-xs text-brand-muted">{poolError}</p>\n          <button type="button" onClick={() => { setLoading(true); setPoolReloadKey((value) => value + 1); }} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>\n        </div>\n      ) : items.length === 0 ? (''',
)


# Job operational details: clear old job values before every new fetch and block stale-save UI on failure.
path = "src/app/b2b-admin/job-details/page.tsx"
replace_once(
    path,
    '  const [loadingDetails, setLoadingDetails] = useState(false);\n  const [saving, setSaving] = useState(false);',
    '  const [loadingDetails, setLoadingDetails] = useState(false);\n  const [jobsError, setJobsError] = useState<string | null>(null);\n  const [detailsError, setDetailsError] = useState<string | null>(null);\n  const [saving, setSaving] = useState(false);\n  const [jobsReloadKey, setJobsReloadKey] = useState(0);\n  const [detailsReloadKey, setDetailsReloadKey] = useState(0);',
)
replace_once(
    path,
    '''  useEffect(() => {\n    let cancelled = false;\n    fetchB2BJobs()''',
    '''  useEffect(() => {\n    let cancelled = false;\n    setLoadingJobs(true);\n    setJobsError(null);\n    fetchB2BJobs()''',
)
replace_once(
    path,
    '''        console.error("Job details job list failed:", error);\n        toast.error("공고 목록을 불러오지 못했습니다.");''',
    '''        console.error("Job details job list failed:", error);\n        const message = "공고 목록을 불러오지 못했습니다.";\n        setJobs([]);\n        setJobId("");\n        setJobsError(message);\n        toast.error(message);''',
)
replace_once(path, '  }, []);\n\n  useEffect(() => {\n    if (!jobId) {', '  }, [jobsReloadKey]);\n\n  useEffect(() => {\n    if (!jobId) {')
replace_once(
    path,
    '    let cancelled = false;\n    setLoadingDetails(true);\n    fetchJobOperationalDetails(jobId)',
    '    let cancelled = false;\n    setLoadingDetails(true);\n    setDetailsError(null);\n    setForm(EMPTY);\n    setBenefitsText("");\n    fetchJobOperationalDetails(jobId)',
)
replace_once(
    path,
    '''        toast.error(\n          error instanceof JobOperationalDetailsApiError\n            ? error.message\n            : "공고 상세조건을 불러오지 못했습니다."\n        );''',
    '''        const message =\n          error instanceof JobOperationalDetailsApiError\n            ? error.message\n            : "공고 상세조건을 불러오지 못했습니다.";\n        setForm(EMPTY);\n        setBenefitsText("");\n        setDetailsError(message);\n        toast.error(message);''',
)
replace_once(path, '  }, [jobId]);\n\n  const selectedJob', '  }, [detailsReloadKey, jobId]);\n\n  const selectedJob')
replace_once(path, '          disabled={loadingJobs}', '          disabled={loadingJobs || Boolean(jobsError)}')
replace_once(
    path,
    '''        </select>\n        {selectedJob ? (''',
    '''        </select>\n        {loadingJobs ? (\n          <p role="status" aria-live="polite" className="mt-3 text-xs text-brand-muted">포지션 목록을 불러오는 중입니다...</p>\n        ) : jobsError ? (\n          <div role="alert" className="mt-4 rounded-lg border border-brand-line bg-brand-light p-4 text-xs text-brand-muted">\n            <p>{jobsError}</p>\n            <button type="button" onClick={() => setJobsReloadKey((value) => value + 1)} className="mt-3 font-bold text-brand-bronze">다시 불러오기</button>\n          </div>\n        ) : jobs.length === 0 ? (\n          <p className="mt-3 text-xs text-brand-muted">등록된 포지션이 없습니다.</p>\n        ) : null}\n        {selectedJob ? (''',
)
replace_once(
    path,
    '''          {loadingDetails ? (\n            <div className="py-16 text-center text-sm text-brand-muted">상세조건을 불러오는 중입니다...</div>\n          ) : (''',
    '''          {loadingDetails ? (\n            <div role="status" aria-live="polite" className="py-16 text-center text-sm text-brand-muted">상세조건을 불러오는 중입니다...</div>\n          ) : detailsError ? (\n            <div role="alert" className="py-16 text-center">\n              <p className="text-sm font-bold text-brand-espresso">상세조건을 불러오지 못했습니다.</p>\n              <p className="mt-2 text-xs text-brand-muted">{detailsError}</p>\n              <button type="button" onClick={() => setDetailsReloadKey((value) => value + 1)} className="mt-5 rounded-lg bg-brand-bronze px-4 py-3 text-xs font-bold text-white">다시 불러오기</button>\n            </div>\n          ) : (''',
)


# Recruiting analytics micro-label floor.
replace_once(
    "src/app/b2b-admin/analytics/page.tsx",
    '<div className="text-[9px] text-slate-400">{item.date.slice(5)}</div>',
    '<div className="text-[10px] text-slate-400">{item.date.slice(5)}</div>',
)


# Permanent static regression gate for all internal state contracts.
path = "tests/p1-product-ux-check.cjs"
replace_once(
    path,
    'console.log("P1_PRODUCT_UX_CHECK_PASSED");',
    '''console.log("STEP_5: INTERNAL_WORKSPACE_RESILIENCE");\nconst candidatePortal = read("src/app/candidate/page.tsx");\nconst savedJobsPage = read("src/app/candidate/saved-jobs/page.tsx");\nconst opportunitiesPage = read("src/app/candidate/opportunities/page.tsx");\nconst b2bLayout = read("src/app/b2b-admin/layout.tsx");\nconst b2bPipeline = read("src/app/b2b-admin/page.tsx");\nconst candidatePool = read("src/app/b2b-admin/candidates/page.tsx");\nconst b2bJobs = read("src/app/b2b-admin/jobs/page.tsx");\nconst globalTalentPool = read("src/app/b2b-admin/talent-pool/page.tsx");\nconst jobDetails = read("src/app/b2b-admin/job-details/page.tsx");\nconst recruitingAnalytics = read("src/app/b2b-admin/analytics/page.tsx");\n\nassert(\n  candidatePortal.includes("const [loadError, setLoadError]") &&\n    candidatePortal.includes('role="alert"') &&\n    candidatePortal.includes("다시 불러오기") &&\n    !candidatePortal.includes("추천 채용 보기") &&\n    savedJobsPage.includes("const [loadError, setLoadError]") &&\n    savedJobsPage.includes("const [reloadKey, setReloadKey]") &&\n    savedJobsPage.includes('role="alert"') &&\n    opportunitiesPage.includes("const [loadError, setLoadError]") &&\n    opportunitiesPage.includes("const [reloadKey, setReloadKey]") &&\n    opportunitiesPage.includes('role="alert"'),\n  "CANDIDATE_INTERNAL_SURFACES_MUST_SEPARATE_LOAD_FAILURE_FROM_EMPTY_STATE"\n);\n\nassert(\n  b2bLayout.includes('aria-controls="b2b-mobile-navigation"') &&\n    b2bLayout.includes('id="b2b-mobile-navigation"') &&\n    b2bLayout.includes('aria-current={item.active ? "page" : undefined}') &&\n    b2bLayout.includes('event.key === "Escape"') &&\n    !b2bLayout.includes("text-[9px]"),\n  "B2B_NAVIGATION_MUST_EXPOSE_CONTROLLED_CURRENT_AND_READABLE_STATE"\n);\n\nassert(\n  b2bPipeline.includes("const [loadError, setLoadError]") &&\n    b2bPipeline.includes('aria-label="지원 단계 필터"') &&\n    b2bPipeline.includes("aria-pressed={viewMode === mode}") &&\n    candidatePool.includes("const [loadError, setLoadError]") &&\n    b2bJobs.includes("const [loadError, setLoadError]") &&\n    globalTalentPool.includes("const [poolError, setPoolError]") &&\n    globalTalentPool.includes("const [jobsLoadError, setJobsLoadError]"),\n  "B2B_WORKSPACES_MUST_SEPARATE_API_FAILURE_FROM_EMPTY_DATA"\n);\n\nassert(\n  jobDetails.includes("const [detailsError, setDetailsError]") &&\n    jobDetails.includes("setForm(EMPTY);") &&\n    jobDetails.includes("setBenefitsText(\\\"\\\");") &&\n    jobDetails.includes('role="alert"') &&\n    jobDetails.includes("setDetailsReloadKey") &&\n    !recruitingAnalytics.includes("text-[9px]"),\n  "JOB_DETAILS_MUST_CLEAR_STALE_FORM_BEFORE_LOADING_ANOTHER_POSITION"\n);\n\nconsole.log("P1_PRODUCT_UX_CHECK_PASSED");''',
)

print("INTERNAL_UI_STATE_AUDIT_TRANSFORMED")
