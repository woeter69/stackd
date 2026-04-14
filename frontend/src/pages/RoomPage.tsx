import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Check, Wifi, WifiOff, Coins } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import Chip from '../components/Chip'
import TableBoard, { type TableBoardHandle } from '../components/TableBoard'
import { useBetAnimation } from '../hooks/useBetAnimation'
import ChipAnimationLayer from '../components/ChipAnimationLayer'
import { useAuth } from '../context/AuthContext'
import { CHIP_DENOMINATIONS, type ChipValue } from '../types'

export default function RoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const boardRef = useRef<TableBoardHandle>(null)
  const { chips, tableRef, fireChip } = useBetAnimation()

  const handleChipFly = useCallback((payload: { senderId: string; receiverId: string; amount: number }) => {
    if (!boardRef.current) return
    const { senderId, receiverId, amount } = payload
    
    // Determine largest chip to fly visually
    const denom = [...CHIP_DENOMINATIONS].reverse().find(d => amount >= d) ?? 1
    
    // Pot is always the center pot zone. MINT implies banker to player, or from pot? MINT means "BANKER_MINT".
    // For visual purposes, MINT flies from the pot zone to the player.
    const fromEl = senderId === 'BANKER_MINT' ? boardRef.current.getPotEl() : boardRef.current.getSeatEl(senderId)
    const toEl = receiverId === 'POT' ? boardRef.current.getPotEl() : boardRef.current.getSeatEl(receiverId)
    
    // Trigger animation
    fireChip(denom as ChipValue, fromEl, toEl)
    
    // Pot Pulse FX
    if (receiverId === 'POT' || senderId === 'BANKER_MINT') {
      const pot = boardRef.current.getPotEl()
      if (pot) {
        pot.classList.remove('pot-pulse')
        void pot.offsetWidth // trigger reflow
        pot.classList.add('pot-pulse')
      }
    }
  }, [fireChip])

  const { state, setState, connected, socketError, transfer, mint } = useSocket(code, token, handleChipFly)

  // Our identity from sessionStorage
  const myId = sessionStorage.getItem('playerId') ?? ''
  const myRole = sessionStorage.getItem('playerRole') ?? 'player'

  // Load room state on mount via REST
  useEffect(() => {
    if (!code || !token) return
    fetch(`/api/rooms/${code}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => setState(data))
      .catch(() => navigate('/'))
  }, [code, token])

  // Transfer builder state
  const [stack, setStack] = useState<Partial<Record<ChipValue, number>>>({})
  const [targetId, setTargetId] = useState<string>('POT')
  const [mintTargetId, setMintTargetId] = useState<string>('')
  const [mintAmount, setMintAmount] = useState<number>(100)
  const [copied, setCopied] = useState(false)

  const stackTotal = CHIP_DENOMINATIONS.reduce(
    (sum, denom) => sum + (stack[denom] ?? 0) * denom,
    0,
  )

  function addChip(denom: ChipValue) {
    setStack((prev) => ({ ...prev, [denom]: (prev[denom] ?? 0) + 1 }))
  }

  function removeChip(denom: ChipValue) {
    setStack((prev) => {
      const next = { ...prev }
      if ((next[denom] ?? 0) > 0) next[denom] = (next[denom] as number) - 1
      return next
    })
  }

  function clearStack() {
    setStack({})
  }

  function handleTransfer() {
    if (stackTotal <= 0 || !targetId) return
    transfer({ senderId: myId, receiverId: targetId, amount: stackTotal })
    clearStack()
  }

  function handleMint() {
    if (mintAmount <= 0 || !mintTargetId) return
    mint({ targetPlayerId: mintTargetId, amount: mintAmount })
  }

  // Effect to automatically select Dealer as target for Blackjack players
  useEffect(() => {
    if (state?.room?.gameType === 'blackjack' && targetId === 'POT') {
      const banker = state.players.find(p => p.role === 'banker')
      if (banker) setTargetId(banker.id)
    }
  }, [state?.room?.gameType, state?.players])

  function copyCode() {
    navigator.clipboard.writeText(code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const players = state?.players ?? []
  const me = players.find((p) => p.id === myId)

  const totalChips = players.reduce((sum, p) => sum + p.balance, 0)

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <ChipAnimationLayer chips={chips} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#1e293b]/90 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f172a] border border-[#334155] hover:border-emerald-600 transition-colors group"
          >
            <span className="text-xs text-slate-400">Room</span>
            <span className="font-mono font-bold text-white tracking-widest">{code}</span>
            {copied
              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
              : <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
          </button>
          {connected
            ? <Wifi className="w-4 h-4 text-emerald-400" />
            : <WifiOff className="w-4 h-4 text-slate-600 animate-pulse" />}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400">Total chips in play</span>
          <span className="text-lg font-bold text-emerald-400">${totalChips.toLocaleString()}</span>
        </div>
      </header>

      {/* Error toast */}
      {socketError && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-lg bg-red-900/60 border border-red-700 text-red-300 text-sm">
          ⚠️ {socketError}
        </div>
      )}

      {/* ── Game Board Area ──────────────────────────────────────────────── */}
      <main className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl" ref={tableRef}>
          {state?.room ? (
            <TableBoard
              ref={boardRef}
              room={state.room}
              players={players}
              myId={myId}
              isBaccarat={state.room.gameType === 'baccarat'}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400">
              Loading table...
            </div>
          )}
        </div>

        {/* Banker Mint Panel */}
        {myRole === 'banker' && (
          <div className="mt-6 p-4 rounded-xl bg-[#1e293b] border border-amber-700/40">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Mint Chips
            </h3>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Player</label>
                <select
                  value={mintTargetId}
                  onChange={(e) => setMintTargetId(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select player…</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Amount ($)</label>
                <input
                  type="number"
                  value={mintAmount}
                  min={1}
                  onChange={(e) => setMintAmount(Number(e.target.value))}
                  className="w-28 px-3 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                onClick={handleMint}
                disabled={!mintTargetId || mintAmount <= 0}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm font-semibold text-white transition-colors"
              >
                Mint
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Action Bar ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-[#1e293b]/95 backdrop-blur border-t border-[#334155] p-4 space-y-3">
        {/* Chip Tray */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 mr-2">Tray</span>
          <div className="flex gap-2 flex-wrap">
            {CHIP_DENOMINATIONS.map((denom) => {
              const count = stack[denom] ?? 0
              return (
                <div key={denom} className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => addChip(denom)}
                    className="active:scale-95 transition-transform"
                    title={`Add $${denom} chip`}
                  >
                    <Chip value={denom} size={42} />
                  </button>
                  {count > 0 && (
                    <button
                      onClick={() => removeChip(denom)}
                      className="text-[10px] text-slate-400 hover:text-red-400 transition-colors leading-none"
                    >
                      ×{count}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Transfer Controls */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex-1 px-3 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-sm text-white min-w-[100px]">
            Stack:{' '}
            <span className={stackTotal > 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
              ${stackTotal.toLocaleString()}
            </span>
          </div>

          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1 min-w-[130px]"
          >
            {state?.room?.gameType !== 'blackjack' && <option value="POT">→ {state?.room?.gameType === 'baccarat' ? 'Table Zones' : 'Pot'}</option>}
            {players
              .filter((p) => p.id !== myId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  → {p.role === 'banker' ? `Dealer (${p.name})` : p.name}
                </option>
              ))}
          </select>

          <button
            onClick={handleTransfer}
            disabled={stackTotal <= 0 || !me}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors whitespace-nowrap"
          >
            Send
          </button>

          {stackTotal > 0 && (
            <button
              onClick={clearStack}
              className="px-3 py-2 rounded-lg border border-[#334155] text-slate-400 hover:text-white text-sm transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
