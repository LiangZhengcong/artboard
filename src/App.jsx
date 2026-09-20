import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const SIZE = { width: 1200, height: 420 }
const DEFAULT_SIZE = { width: 420, height: 147 }
const MIN_SIZE = { width: 180, height: 72 }

const palettes = {
  electric: { label: '电子撞色', colors: ['#1949a3', '#d62f68', '#57a523', '#6d3bc2', '#0b8e9b'], background: ['#f7f4ff', '#e9f8ef'] },
  ink: { label: '经典墨色', colors: ['#111827', '#23314f', '#623d2e', '#0f5960', '#8b3b45'], background: ['#fbf6eb', '#e8eef0'] },
  night: { label: '夜间霓虹', colors: ['#f5efcb', '#ff6a9b', '#54e3df', '#bda2ff', '#ffffff'], background: ['#13151a', '#22263e'] },
  signal: { label: '信号红蓝', colors: ['#f0424f', '#274cce', '#111111', '#f5b82e', '#f7f4ec'], background: ['#edf0ff', '#fff0e8'] },
  poster: { label: '柿红群青', colors: ['#f0442f', '#203bd1', '#151515', '#ffb000', '#f0442f'], background: ['#fff3e6', '#e8edff'] },
  ultraviolet: { label: '紫外酸橙', colors: ['#5728e5', '#b8f000', '#17212b', '#f04e98', '#5728e5'], background: ['#f0eaff', '#f3ffd8'] },
  peacock: { label: '珊瑚孔雀', colors: ['#f05a48', '#007c83', '#12343b', '#f2b134', '#007c83'], background: ['#fff0e8', '#ddf3ee'] },
}
const fonts = ['Georgia', 'Times New Roman', 'Courier New', 'Trebuchet MS', 'Arial Black', 'Palatino', 'Impact', 'Songti SC']
const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function secureRandom() {
  const value = new Uint32Array(1)
  crypto.getRandomValues(value)
  return value[0] / 4294967296
}

function createRandomDraft() {
  const paletteNames = Object.keys(palettes)
  return {
    text: '',
    palette: paletteNames[Math.floor(secureRandom() * paletteNames.length)],
    intensity: Number((0.25 + secureRandom() * 0.7).toFixed(2)),
    outlined: secureRandom() >= 0.5,
  }
}

function getItemPalette(item) {
  return item.palette === 'custom' && item.customPalette
    ? item.customPalette
    : palettes[item.palette] || palettes.electric
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createRandom(seed) {
  const random = mulberry32(seed)
  return {
    number: (min, max) => random() * (max - min) + min,
    integer: (min, max) => Math.floor(random() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(random() * items.length)],
    chance: (probability) => random() < probability,
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function placeNearAnchor(anchorX, anchorY, panelWidth, panelHeight, boundsWidth, boundsHeight) {
  const gap = 12
  const margin = 12
  const roomRight = anchorX + gap + panelWidth <= boundsWidth - margin
  const roomLeft = anchorX - gap - panelWidth >= margin
  const roomBelow = anchorY + gap + panelHeight <= boundsHeight - margin
  const roomAbove = anchorY - gap - panelHeight >= margin

  const left = roomRight
    ? anchorX + gap
    : roomLeft
      ? anchorX - gap - panelWidth
      : clamp(anchorX - panelWidth / 2, margin, Math.max(margin, boundsWidth - panelWidth - margin))

  const top = roomBelow
    ? anchorY + gap
    : roomAbove
      ? anchorY - gap - panelHeight
      : clamp(anchorY - panelHeight / 2, margin, Math.max(margin, boundsHeight - panelHeight - margin))

  return { left, top }
}

function paintBackground(ctx, palette, rng, intensity) {
  const gradient = ctx.createLinearGradient(0, 0, SIZE.width, SIZE.height)
  gradient.addColorStop(0, palette.background[0])
  gradient.addColorStop(1, palette.background[1])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SIZE.width, SIZE.height)
  for (let index = 0; index < 12 + intensity * 20; index += 1) {
    ctx.save()
    ctx.globalAlpha = rng.number(0.025, 0.1)
    ctx.fillStyle = rng.pick(palette.colors)
    ctx.translate(rng.number(0, SIZE.width), rng.number(0, SIZE.height))
    ctx.rotate(rng.number(-0.5, 0.5))
    ctx.fillRect(0, 0, rng.number(30, 160), rng.number(20, 100))
    ctx.restore()
  }
  ctx.globalAlpha = 0.08
  ctx.fillStyle = palette.colors[0]
  for (let index = 0; index < 120 + intensity * 180; index += 1) {
    ctx.fillRect(rng.number(0, SIZE.width), rng.number(0, SIZE.height), rng.number(1, 4), rng.number(1, 4))
  }
  ctx.globalAlpha = 1
}

function paintCharacters(ctx, text, palette, rng, intensity, outlined) {
  const characters = [...text]
  const units = characters.reduce((total, character) => total + (character === ' ' ? 0.45 : 1), 0) || 1
  const padding = 70
  const slot = (SIZE.width - padding * 2) / units
  const fontSize = Math.min(235, Math.max(75, slot * 1.52))
  let x = padding + slot * 0.5
  characters.forEach((character) => {
    if (character === ' ') { x += slot * 0.45; return }
    const size = fontSize * rng.number(0.7, 1.3)
    const color = rng.pick(palette.colors)
    ctx.save()
    ctx.translate(x + rng.number(-slot * 0.13, slot * 0.13), SIZE.height / 2 + rng.number(-64, 64) * intensity)
    ctx.rotate(rng.number(-0.13 - intensity * 0.27, 0.13 + intensity * 0.27))
    ctx.transform(rng.number(0.7, 1.28), rng.number(-0.06, 0.06), rng.number(-0.1 - intensity * 0.16, 0.1 + intensity * 0.16), rng.number(0.8, 1.2), 0, 0)
    ctx.font = `${rng.pick(['400', '600', '800'])} ${size}px ${rng.pick(fonts)}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(3, size * rng.number(0.018, 0.04))
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.globalAlpha = rng.number(0.82, 1)
    ctx.strokeText(character, 0, 0)
    if (!(outlined && rng.chance(0.58))) ctx.fillText(character, 0, 0)
    ctx.restore()
    x += slot * rng.number(0.67 - intensity * 0.12, 0.95)
  })
}

function applyGlitch(ctx, rng, intensity) {
  const snapshot = document.createElement('canvas')
  snapshot.width = SIZE.width
  snapshot.height = SIZE.height
  snapshot.getContext('2d').drawImage(ctx.canvas, 0, 0)
  for (let index = 0; index < 2 + intensity * 12; index += 1) {
    const y = rng.integer(10, SIZE.height - 30)
    const height = rng.integer(3, 9 + Math.round(intensity * 22))
    const offset = rng.number(-1, 1) * (8 + intensity * 42)
    ctx.save()
    ctx.globalAlpha = rng.number(0.5, 0.95)
    ctx.drawImage(snapshot, 0, y, SIZE.width, height, offset, y, SIZE.width, height)
    ctx.restore()
  }
}

function paintLines(ctx, palette, rng, intensity) {
  for (let index = 0; index < 1 + intensity * 4; index += 1) {
    ctx.beginPath()
    ctx.moveTo(-30, rng.number(90, 330))
    ctx.bezierCurveTo(rng.number(180, 380), rng.number(30, 390), rng.number(750, 1030), rng.number(30, 390), SIZE.width + 30, rng.number(90, 330))
    ctx.strokeStyle = rng.pick(palette.colors)
    ctx.globalAlpha = rng.number(0.25, 0.62)
    ctx.lineWidth = rng.number(1.5, 4)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function renderCaptcha(canvas, item) {
  const ctx = canvas.getContext('2d')
  const rng = createRandom(item.seed)
  const palette = getItemPalette(item)
  ctx.clearRect(0, 0, SIZE.width, SIZE.height)
  paintBackground(ctx, palette, rng, item.intensity)
  paintCharacters(ctx, item.text, palette, rng, item.intensity, item.outlined)
  applyGlitch(ctx, rng, item.intensity)
  paintLines(ctx, palette, rng, item.intensity)
}

function safeFileName(text, fallback = 'captcha') {
  const value = text
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 36)
  return value || fallback
}

function downloadCanvas(canvas, fileName) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

function PaletteControl({ value, customPalette, onChange }) {
  const [customExpanded, setCustomExpanded] = useState(false)

  useEffect(() => {
    if (value !== 'custom') setCustomExpanded(false)
  }, [value])

  const toggleCustomPalette = () => {
    if (customExpanded) {
      setCustomExpanded(false)
      return
    }

    const source = value === 'custom' && customPalette
      ? customPalette
      : palettes[value] || palettes.electric

    if (value !== 'custom' || !customPalette) {
      onChange({
        palette: 'custom',
        customPalette: customPalette || {
          colors: source.colors.slice(0, 3),
          background: [...source.background],
        },
      })
    }
    setCustomExpanded(true)
  }

  const updateCustomColor = (group, index, color) => {
    const source = customPalette || palettes.electric
    const values = [...source[group]]
    values[index] = color
    onChange({
      palette: 'custom',
      customPalette: { ...source, [group]: values },
    })
  }

  return (
    <div className="palette-control">
      <div className="adjustment-row palette-row">
        <span>色彩</span>
        <div className="palette-options">
          {Object.entries(palettes).map(([paletteValue, palette]) => (
            <button
              key={paletteValue}
              type="button"
              className={value === paletteValue ? 'is-selected' : ''}
              aria-label={palette.label}
              aria-pressed={value === paletteValue}
              title={palette.label}
              onClick={() => {
                setCustomExpanded(false)
                onChange({ palette: paletteValue })
              }}
            >
              {palette.colors.slice(0, 3).map((color) => <i key={color} style={{ background: color }} />)}
            </button>
          ))}
          <button
            type="button"
            className={`custom-palette-button${value === 'custom' ? ' is-selected' : ''}`}
            aria-label="自定义色彩"
            aria-pressed={value === 'custom'}
            aria-expanded={customExpanded}
            title={customExpanded ? '收起自定义色彩' : '自定义色彩'}
            onClick={toggleCustomPalette}
          >{customExpanded ? '−' : '+'}</button>
        </div>
      </div>
      {customExpanded && value === 'custom' && customPalette && (
        <div className="custom-colors">
          <span>自定义</span>
          <div className="color-inputs">
            {customPalette.colors.map((color, index) => (
              <label key={`foreground-${index}`} title={`文字与线条颜色 ${index + 1}`}>
                <input type="color" value={color} onChange={(event) => updateCustomColor('colors', index, event.target.value)} />
                <i style={{ background: color }} />
              </label>
            ))}
            <em aria-hidden="true" />
            {customPalette.background.map((color, index) => (
              <label key={`background-${index}`} title={`背景颜色 ${index + 1}`}>
                <input type="color" value={color} onChange={(event) => updateCustomColor('background', index, event.target.value)} />
                <i style={{ background: color }} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CaptchaItem({ item, zoom, viewOffset, selected, adjusting, onSelect, onRegenerate, onDelete, onResizeStart, onMoveStart, onToggleAdjust, onUpdate }) {
  const itemRef = useRef(null)
  const toolbarRef = useRef(null)
  const adjustmentRef = useRef(null)
  const canvasRef = useRef(null)
  const [toolbarLayout, setToolbarLayout] = useState({ left: 12, top: 12, visibility: 'hidden', side: 'above' })
  const [adjustmentLayout, setAdjustmentLayout] = useState({ left: 12, top: 12, visibility: 'hidden' })
  useEffect(() => renderCaptcha(canvasRef.current, item), [item])

  useLayoutEffect(() => {
    if (!selected || !itemRef.current || !toolbarRef.current) return undefined

    const updateToolbarLayout = () => {
      const itemRect = itemRef.current.getBoundingClientRect()
      const toolbarRect = toolbarRef.current.getBoundingClientRect()
      const margin = 12
      const gap = 10
      const maxLeft = Math.max(margin, window.innerWidth - toolbarRect.width - margin)
      const aboveTop = itemRect.top - toolbarRect.height - gap
      const belowTop = itemRect.bottom + gap
      const canShowAbove = aboveTop >= margin
      const canShowBelow = belowTop + toolbarRect.height <= window.innerHeight - margin
      const side = canShowAbove || !canShowBelow ? 'above' : 'below'
      const preferredTop = side === 'above' ? aboveTop : belowTop
      const maxTop = Math.max(margin, window.innerHeight - toolbarRect.height - margin)

      setToolbarLayout({
        left: clamp(itemRect.left + itemRect.width / 2 - toolbarRect.width / 2, margin, maxLeft),
        top: clamp(preferredTop, margin, maxTop),
        visibility: 'visible',
        side,
      })
    }

    updateToolbarLayout()
    const observer = new ResizeObserver(updateToolbarLayout)
    observer.observe(toolbarRef.current)
    observer.observe(itemRef.current)
    window.addEventListener('resize', updateToolbarLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateToolbarLayout)
    }
  }, [selected, zoom, viewOffset.x, viewOffset.y, item.x, item.y, item.width, item.height])

  useLayoutEffect(() => {
    if (!adjusting || !itemRef.current || !toolbarRef.current || !adjustmentRef.current) return undefined

    const updateLayout = () => {
      const itemRect = itemRef.current.getBoundingClientRect()
      const toolbarRect = toolbarRef.current.getBoundingClientRect()
      const panelRect = adjustmentRef.current.getBoundingClientRect()
      const margin = 12
      const gap = 8
      const maxLeft = Math.max(margin, window.innerWidth - panelRect.width - margin)
      const maxTop = Math.max(margin, window.innerHeight - panelRect.height - margin)
      const centeredLeft = itemRect.left + itemRect.width / 2 - panelRect.width / 2
      const aboveToolbar = toolbarRect.top - panelRect.height - gap
      const belowToolbar = toolbarRect.bottom + gap
      const aboveItem = itemRect.top - panelRect.height - gap
      const belowItem = itemRect.bottom + gap
      let top

      if (toolbarLayout.side === 'above') {
        top = aboveToolbar >= margin
          ? aboveToolbar
          : belowItem + panelRect.height <= window.innerHeight - margin
            ? belowItem
            : clamp(aboveToolbar, margin, maxTop)
      } else {
        top = belowToolbar + panelRect.height <= window.innerHeight - margin
          ? belowToolbar
          : aboveItem >= margin
            ? aboveItem
            : clamp(belowToolbar, margin, maxTop)
      }

      setAdjustmentLayout({
        left: clamp(centeredLeft, margin, maxLeft),
        top: clamp(top, margin, maxTop),
        visibility: 'visible',
      })
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(adjustmentRef.current)
    window.addEventListener('resize', updateLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLayout)
    }
  }, [adjusting, zoom, viewOffset.x, viewOffset.y, item.x, item.y, item.width, item.height, item.palette, item.customPalette, toolbarLayout.side, toolbarLayout.left, toolbarLayout.top])

  return (
    <div ref={itemRef} className={`captcha-item${selected ? ' is-selected' : ''}`} style={{ left: viewOffset.x + item.x * zoom, top: viewOffset.y + item.y * zoom, width: item.width * zoom, height: item.height * zoom }}
      onPointerDown={(event) => onMoveStart(item, event)} onClick={(event) => { event.stopPropagation(); onSelect(item.id) }}>
      <canvas ref={canvasRef} width={SIZE.width} height={SIZE.height} aria-label={`生成的文字图片：${item.text}`} />
      {selected && (
        <>
          <div ref={toolbarRef} className="item-toolbar" style={toolbarLayout} onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => onRegenerate(item.id)}>重新扰动</button>
            <span className="toolbar-divider" />
            <button className={adjusting ? 'is-active' : ''} type="button" aria-expanded={adjusting} onClick={() => onToggleAdjust(item.id)}>调整</button>
            <span className="toolbar-divider" />
            <button type="button" onClick={() => downloadCanvas(canvasRef.current, `${safeFileName(item.text)}.png`)}>保存</button>
            <span className="toolbar-divider" />
            <button className="danger" type="button" onClick={() => onDelete(item.id)}>删除</button>
          </div>
          {adjusting && (
            <div ref={adjustmentRef} className="item-adjustment" style={adjustmentLayout} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
              <PaletteControl value={item.palette} customPalette={item.customPalette} onChange={(updates) => onUpdate(item.id, updates)} />
              <label className="adjustment-row intensity-row">
                <span>扰动</span>
                <input type="range" min="0.15" max="1" step="0.01" value={item.intensity} onChange={(event) => onUpdate(item.id, { intensity: Number(event.target.value) })} />
                <output>{Math.round(item.intensity * 100)}</output>
              </label>
              <label className="adjustment-row outline-row">
                <span>空心字</span>
                <input type="checkbox" checked={item.outlined} onChange={(event) => onUpdate(item.id, { outlined: event.target.checked })} />
                <i aria-hidden="true" />
              </label>
            </div>
          )}
          {handles.map((direction) => <button key={direction} type="button" className={`resize-handle handle-${direction}`} aria-label={`向 ${direction} 缩放图片`} onPointerDown={(event) => onResizeStart(item, direction, event)} />)}
          <div className="size-readout">{Math.round(item.width)} × {Math.round(item.height)}</div>
        </>
      )}
    </div>
  )
}

function Composer({ position, draft, setDraft, onCancel, onCreate }) {
  const formRef = useRef(null)
  const inputRef = useRef(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [layout, setLayout] = useState({ left: position.left, top: position.top })

  useLayoutEffect(() => {
    if (!formRef.current) return
    const updateLayout = () => {
      const next = placeNearAnchor(
        position.anchorX,
        position.anchorY,
        formRef.current.offsetWidth,
        formRef.current.offsetHeight,
        position.boundsWidth,
        position.boundsHeight,
      )
      setLayout((current) => (
        current.left === next.left && current.top === next.top ? current : next
      ))
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(formRef.current)
    return () => observer.disconnect()
  }, [position.anchorX, position.anchorY, position.boundsWidth, position.boundsHeight, showAdvanced])

  useEffect(() => {
    setShowAdvanced(false)
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => cancelAnimationFrame(frame)
  }, [position.anchorX, position.anchorY])
  return (
    <form ref={formRef} className="composer" style={{ left: layout.left, top: layout.top }} onSubmit={onCreate}
      onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" className="close-button" onClick={onCancel} aria-label="关闭">×</button>
      <label className="field wide"><span className="sr-only">文字</span><input ref={inputRef} value={draft.text} maxLength={24} onChange={(event) => setDraft({ ...draft, text: event.target.value })} placeholder="输入文字…" /></label>
      {showAdvanced && (
        <div className="advanced-settings">
          <PaletteControl value={draft.palette} customPalette={draft.customPalette} onChange={(updates) => setDraft({ ...draft, ...updates })} />
          <label className="field"><span>扰动程度 <b>{Math.round(draft.intensity * 100)}</b></span><input className="range" type="range" min="0.15" max="1" step="0.01" value={draft.intensity} onChange={(event) => setDraft({ ...draft, intensity: Number(event.target.value) })} /></label>
          <label className="switch"><input type="checkbox" checked={draft.outlined} onChange={(event) => setDraft({ ...draft, outlined: event.target.checked })} /><span aria-hidden="true" />混合空心字</label>
        </div>
      )}
      <div className="composer-foot">
        <button
          className="advanced-toggle"
          type="button"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((visible) => !visible)}
        >
          {showAdvanced ? '收起设置' : '更多设置'}
          <span aria-hidden="true">{showAdvanced ? '↑' : '↓'}</span>
        </button>
        <button className="create-button" type="submit" disabled={!draft.text.trim()}>生成</button>
      </div>
    </form>
  )
}

function App() {
  const boardRef = useRef(null)
  const contentRef = useRef(null)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [adjustingId, setAdjustingId] = useState(null)
  const [composer, setComposer] = useState(null)
  const [draft, setDraft] = useState(createRandomDraft)
  const [zoom, setZoom] = useState(1)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
  const [zoomInput, setZoomInput] = useState('100')

  const updateZoom = (nextZoom) => {
    const rect = boardRef.current?.getBoundingClientRect()
    const normalizedZoom = clamp(Number(nextZoom.toFixed(2)), 0.25, 2)
    if (!rect || normalizedZoom === zoom) {
      setZoomInput(String(Math.round(zoom * 100)))
      return
    }

    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const ratio = normalizedZoom / zoom
    setComposer(null)
    setAdjustingId(null)
    setViewOffset((current) => ({
      x: centerX + (current.x - centerX) * ratio,
      y: centerY + (current.y - centerY) * ratio,
    }))
    setZoom(normalizedZoom)
    setZoomInput(String(Math.round(normalizedZoom * 100)))
  }

  const commitZoomInput = () => {
    const percentage = Number.parseFloat(zoomInput)
    if (!Number.isFinite(percentage)) {
      setZoomInput(String(Math.round(zoom * 100)))
      return
    }
    updateZoom(clamp(percentage, 25, 200) / 100)
  }

  useEffect(() => {
    const board = boardRef.current
    if (!board) return undefined

    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      updateZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1))
    }

    board.addEventListener('wheel', onWheel, { passive: false })
    return () => board.removeEventListener('wheel', onWheel)
  }, [zoom])

  useEffect(() => {
    const onKeyDown = (event) => {
      const editing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      if (event.key === 'Escape') { setComposer(null); setAdjustingId(null); setSelectedId(null) }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId && !editing) {
        setItems((current) => current.filter((item) => item.id !== selectedId))
        setAdjustingId(null)
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  const openComposer = (event) => {
    if (event.target !== boardRef.current && event.target !== contentRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const anchorX = event.clientX - rect.left
    const anchorY = event.clientY - rect.top
    const worldX = (anchorX - viewOffset.x) / zoom
    const worldY = (anchorY - viewOffset.y) / zoom
    const estimatedWidth = Math.min(304, rect.width - 24)
    const estimatedHeight = 138
    const { left, top } = placeNearAnchor(anchorX, anchorY, estimatedWidth, estimatedHeight, rect.width, rect.height)
    setSelectedId(null)
    setAdjustingId(null)
    setDraft(createRandomDraft())
    setComposer({ left, top, anchorX, anchorY, worldX, worldY, boundsWidth: rect.width, boundsHeight: rect.height })
  }

  const createItem = (event) => {
    event.preventDefault()
    if (!draft.text.trim() || !composer) return
    const rect = boardRef.current.getBoundingClientRect()
    const id = crypto.randomUUID()
    const worldLeft = -viewOffset.x / zoom
    const worldTop = -viewOffset.y / zoom
    const worldRight = (rect.width - viewOffset.x) / zoom
    const worldBottom = (rect.height - viewOffset.y) / zoom
    const worldWidth = worldRight - worldLeft
    const worldHeight = worldBottom - worldTop
    const margin = 12 / zoom
    const width = Math.min(DEFAULT_SIZE.width, worldWidth - margin * 2)
    const height = Math.min(DEFAULT_SIZE.height, worldHeight - margin * 2)
    const item = { id, ...draft, text: draft.text.trim(), seed: Date.now() % 2147483647,
      x: clamp(composer.worldX - width / 2, worldLeft + margin, worldRight - width - margin),
      y: clamp(composer.worldY - height / 2, worldTop + margin, worldBottom - height - margin), width, height }
    setItems((current) => [...current, item])
    setSelectedId(id)
    setComposer(null)
  }

  const regenerate = (id) => setItems((current) => current.map((item) => item.id === id ? { ...item, seed: (Date.now() + Math.random() * 100000) % 2147483647 } : item))
  const remove = (id) => { setItems((current) => current.filter((item) => item.id !== id)); setAdjustingId(null); setSelectedId(null) }
  const updateItem = (id, updates) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item))
  const selectItem = (id) => { setSelectedId(id); setAdjustingId((current) => current === id ? current : null) }
  const toggleAdjust = (id) => setAdjustingId((current) => current === id ? null : id)

  const saveBoard = () => {
    const rect = boardRef.current.getBoundingClientRect()
    const maxScale = Math.min(2, 4096 / rect.width, 4096 / rect.height)
    const scale = Math.max(1, maxScale)
    const output = document.createElement('canvas')
    output.width = Math.round(rect.width * scale)
    output.height = Math.round(rect.height * scale)
    const context = output.getContext('2d')
    context.scale(scale, scale)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, rect.width, rect.height)

    items.forEach((item) => {
      const rendered = document.createElement('canvas')
      rendered.width = SIZE.width
      rendered.height = SIZE.height
      renderCaptcha(rendered, item)
      context.drawImage(rendered, viewOffset.x + item.x * zoom, viewOffset.y + item.y * zoom, item.width * zoom, item.height * zoom)
    })

    downloadCanvas(output, `captcha-board-${new Date().toISOString().slice(0, 10)}.png`)
  }

  const startResize = (item, direction, event) => {
    event.preventDefault(); event.stopPropagation(); setSelectedId(item.id); setAdjustingId(null)
    const rect = boardRef.current.getBoundingClientRect()
    const start = { pointerX: event.clientX, pointerY: event.clientY, ...item }
    const worldLeft = -viewOffset.x / zoom
    const worldTop = -viewOffset.y / zoom
    const worldRight = (rect.width - viewOffset.x) / zoom
    const worldBottom = (rect.height - viewOffset.y) / zoom
    const margin = 8 / zoom
    document.body.classList.add('is-resizing')
    const move = (moveEvent) => {
      const dx = (moveEvent.clientX - start.pointerX) / zoom
      const dy = (moveEvent.clientY - start.pointerY) / zoom
      let { x, y, width, height } = start
      if (direction.includes('e')) width = clamp(start.width + dx, MIN_SIZE.width, worldRight - start.x - margin)
      if (direction.includes('s')) height = clamp(start.height + dy, MIN_SIZE.height, worldBottom - start.y - margin)
      if (direction.includes('w')) { width = clamp(start.width - dx, MIN_SIZE.width, start.x + start.width - worldLeft - margin); x = start.x + start.width - width }
      if (direction.includes('n')) { height = clamp(start.height - dy, MIN_SIZE.height, start.y + start.height - worldTop - margin); y = start.y + start.height - height }
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, x, y, width, height } : value))
    }
    const end = () => { document.body.classList.remove('is-resizing'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end, { once: true })
  }

  const startMove = (item, event) => {
    if (event.button !== 0 || event.target.closest('button')) return
    event.stopPropagation(); setSelectedId(item.id); setAdjustingId(null); setComposer(null)
    const rect = boardRef.current.getBoundingClientRect()
    const start = { pointerX: event.clientX, pointerY: event.clientY, x: item.x, y: item.y }
    const worldLeft = -viewOffset.x / zoom
    const worldTop = -viewOffset.y / zoom
    const worldRight = (rect.width - viewOffset.x) / zoom
    const worldBottom = (rect.height - viewOffset.y) / zoom
    const margin = 8 / zoom
    document.body.classList.add('is-moving')
    const move = (moveEvent) => {
      const x = clamp(start.x + (moveEvent.clientX - start.pointerX) / zoom, worldLeft + margin, worldRight - item.width - margin)
      const y = clamp(start.y + (moveEvent.clientY - start.pointerY) / zoom, worldTop + margin, worldBottom - item.height - margin)
      setItems((current) => current.map((value) => value.id === item.id ? { ...value, x, y } : value))
    }
    const end = () => { document.body.classList.remove('is-moving'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end, { once: true })
  }

  return (
    <main ref={boardRef} className="whiteboard" onClick={openComposer}>
      {items.length > 0 && (
        <button
          type="button"
          className="save-board-button"
          onClick={(event) => { event.stopPropagation(); saveBoard() }}
        >
          保存画布
        </button>
      )}
      <div className="zoom-control" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label="缩小画布" disabled={zoom <= 0.25} onClick={() => updateZoom(zoom - 0.1)}>−</button>
        <label className="zoom-value" title="输入 25 至 200；双击恢复 100%">
          <span className="sr-only">画布缩放百分比</span>
          <input
            type="text"
            inputMode="decimal"
            value={zoomInput}
            onChange={(event) => setZoomInput(event.target.value.replace(/[^0-9.]/g, ''))}
            onBlur={commitZoomInput}
            onDoubleClick={() => updateZoom(1)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') {
                setZoomInput(String(Math.round(zoom * 100)))
                event.currentTarget.blur()
              }
            }}
          />
          <i aria-hidden="true">%</i>
        </label>
        <button type="button" aria-label="放大画布" disabled={zoom >= 2} onClick={() => updateZoom(zoom + 0.1)}>＋</button>
      </div>
      {items.length === 0 && !composer && (
        <div className="empty-hint" aria-hidden="true">
          <span className="empty-plus" />
          <p>点击任意位置开始创作</p>
        </div>
      )}
      <div ref={contentRef} className="board-content">
        {items.map((item) => <CaptchaItem key={item.id} item={item} zoom={zoom} viewOffset={viewOffset} selected={selectedId === item.id} adjusting={adjustingId === item.id} onSelect={selectItem} onRegenerate={regenerate} onDelete={remove} onResizeStart={startResize} onMoveStart={startMove} onToggleAdjust={toggleAdjust} onUpdate={updateItem} />)}
      </div>
      {composer && <><div className="origin-point" style={{ left: composer.anchorX, top: composer.anchorY }} /><Composer position={composer} draft={draft} setDraft={setDraft} onCancel={() => setComposer(null)} onCreate={createItem} /></>}
    </main>
  )
}

export default App
