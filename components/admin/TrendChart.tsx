interface TrendPoint {
  view_date: string
  pv: number
  uv: number
}

/** 近 N 天 PV/UV 双系列柱状图（纯 SVG，无第三方依赖，暗色模式自适应） */
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无访问数据</p>
  }

  const width = 720
  const height = 240
  const padTop = 16
  const padBottom = 28
  const padLeft = 36
  const padRight = 8
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const maxVal = Math.max(5, ...data.map((d) => d.pv))
  const step = plotW / data.length
  const barW = Math.min(18, step * 0.32)

  const y = (v: number) => padTop + plotH - (v / maxVal) * plotH
  // 纵轴 4 条网格线
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    value: Math.round(maxVal * r),
    yPos: padTop + plotH * (1 - r),
  }))
  // 日期标签每 ~1/6 抽样
  const labelEvery = Math.max(1, Math.ceil(data.length / 6))

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
          PV
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" />
          UV
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="近 14 天 PV/UV 趋势"
      >
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={g.yPos}
              y2={g.yPos}
              className="stroke-border"
              strokeWidth="1"
            />
            <text x={padLeft - 6} y={g.yPos + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {g.value}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = padLeft + step * i + step / 2
          const pvH = padTop + plotH - y(d.pv)
          const uvH = padTop + plotH - y(d.uv)
          const date = new Date(`${d.view_date}T00:00:00`)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          return (
            <g key={d.view_date}>
              <rect
                x={cx - barW - 1}
                y={y(d.pv)}
                width={barW}
                height={Math.max(pvH, d.pv > 0 ? 2 : 0)}
                rx="2"
                className="fill-primary"
              >
                <title>{`${d.view_date} PV ${d.pv}`}</title>
              </rect>
              <rect
                x={cx + 1}
                y={y(d.uv)}
                width={barW}
                height={Math.max(uvH, d.uv > 0 ? 2 : 0)}
                rx="2"
                className="fill-muted-foreground/40"
              >
                <title>{`${d.view_date} UV ${d.uv}`}</title>
              </rect>
              {i % labelEvery === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
