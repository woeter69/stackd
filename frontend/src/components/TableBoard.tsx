import { useRef, useImperativeHandle, forwardRef } from 'react'
import { Crown, User2 } from 'lucide-react'
import Chip from './Chip'
import PlayingCard from './PlayingCard'
import { CHIP_DENOMINATIONS, type ChipValue, type Player, type Room } from '../types'

export interface TableBoardHandle {
  /** Returns the DOM element of the player seat for the given player id */
  getSeatEl: (playerId: string) => HTMLElement | null
  /** Returns the DOM element of the pot zone */
  getPotEl: () => HTMLElement | null
}

interface Props {
  room: Room
  players: Player[]
  myId: string
  /** If true, draw the Baccarat zone labels inside the pot */
  isBaccarat?: boolean
}

/**
 * Returns [x, y] as percentage strings for CSS left/top positioning
 * given an index out of total, arranged around an oval.
 */
function seatPosition(index: number, total: number): { left: string; top: string; transform: string } {
  // Distribute evenly on an ellipse. Start from top-center, go clockwise.
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  const rx = 44 // horizontal radius as % of container
  const ry = 40 // vertical radius
  const cx = 50
  const cy = 50

  const x = cx + rx * Math.cos(angle)
  const y = cy + ry * Math.sin(angle)

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  }
}

/** Renders a small stack of chips representing a balance */
function ChipStack({ balance }: { balance: number }) {
  // Pick denominations greedily
  const stack: { value: ChipValue; count: number }[] = []
  let remaining = balance
  for (const denom of [...CHIP_DENOMINATIONS].reverse() as ChipValue[]) {
    if (remaining <= 0) break
    const count = Math.min(Math.floor(remaining / denom), 4) // cap at 4 per denom for display
    if (count > 0) {
      stack.push({ value: denom, count })
      remaining -= count * denom
    }
  }

  return (
    <div className="flex flex-wrap gap-0.5 justify-center mt-1 max-w-[80px]">
      {stack.map(({ value, count }) =>
        Array.from({ length: count }).map((_, i) => (
          <Chip
            key={`${value}-${i}`}
            value={value}
            size={20}
            className="!cursor-default"
          />
        )),
      )}
    </div>
  )
}

const TableBoard = forwardRef<TableBoardHandle, Props>(function TableBoard(
  { room, players, myId, isBaccarat },
  ref,
) {
  const seatRefs = useRef<Record<string, HTMLElement | null>>({})
  const potRef = useRef<HTMLElement | null>(null)

  useImperativeHandle(ref, () => ({
    getSeatEl: (id) => seatRefs.current[id] ?? null,
    getPotEl: () => potRef.current,
  }))

  const isPoker = room.gameType === 'poker'

  return (
    <div
      className="relative w-full"
      style={{ paddingBottom: '62%' /* aspect ratio ~16:10 */ }}
    >
      {/* ── Felt table SVG background ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 800 500"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Outer rim */}
        <ellipse cx="400" cy="250" rx="390" ry="235" fill="#1a2535" stroke="#475569" strokeWidth="4" />
        {/* Felt */}
        <ellipse cx="400" cy="250" rx="370" ry="218" fill="#0d5c35" />
        {/* Inner felt line */}
        <ellipse cx="400" cy="250" rx="355" ry="203" fill="none" stroke="#1a7a48" strokeWidth="2" />
        {/* Subtle wood grain at edges */}
        <ellipse cx="400" cy="250" rx="388" ry="233" fill="none" stroke="#2d3a4e" strokeWidth="1" />

        {/* Baccarat zone lines */}
        {isBaccarat && (
          <g>
            <line x1="270" y1="190" x2="270" y2="310" stroke="#1a7a48" strokeWidth="1.5" />
            <line x1="530" y1="190" x2="530" y2="310" stroke="#1a7a48" strokeWidth="1.5" />
            <text x="170" y="258" textAnchor="middle" fill="#4ade80" fontSize="18" fontWeight="700" fontFamily="system-ui" opacity="0.6">PLAYER</text>
            <text x="400" y="258" textAnchor="middle" fill="#fbbf24" fontSize="18" fontWeight="700" fontFamily="system-ui" opacity="0.6">TIE</text>
            <text x="630" y="258" textAnchor="middle" fill="#f87171" fontSize="18" fontWeight="700" fontFamily="system-ui" opacity="0.6">BANKER</text>
          </g>
        )}
      </svg>

      {/* ── Community Cards (Poker) ── */}
      {isPoker && (
        <div 
          className="absolute z-10 flex gap-1 items-center justify-center w-full"
          style={{ top: '35%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          {/* Placeholders for community cards */}
          <div className="w-8 h-12 md:w-10 md:h-14 rounded border-2 border-emerald-600/30 bg-emerald-800/20 m-0.5" />
          <div className="w-8 h-12 md:w-10 md:h-14 rounded border-2 border-emerald-600/30 bg-emerald-800/20 m-0.5" />
          <div className="w-8 h-12 md:w-10 md:h-14 rounded border-2 border-emerald-600/30 bg-emerald-800/20 m-0.5" />
          <div className="w-8 h-12 md:w-10 md:h-14 rounded border-2 border-emerald-600/30 bg-emerald-800/20 m-0.5" />
          <div className="w-8 h-12 md:w-10 md:h-14 rounded border-2 border-emerald-600/30 bg-emerald-800/20 m-0.5" />
        </div>
      )}

      {/* ── Pot zone (center) ── */}
      <div
        ref={(el) => { potRef.current = el }}
        className="absolute z-10 flex flex-col items-center justify-center gap-1"
        style={{
          left: '50%', top: '55%',
          transform: 'translate(-50%, -50%)',
          minWidth: 90, minHeight: 70,
        }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/60">
          {isBaccarat ? 'Table' : 'Pot'}
        </span>
        <span className="text-xl font-black text-emerald-300 tabular-nums drop-shadow-lg">
          ${room.pot.toLocaleString()}
        </span>
        {/* Visual chip stack in pot */}
        {room.pot > 0 && <ChipStack balance={Math.min(room.pot, 200)} />}
      </div>

      {/* ── Player seats ── */}
      {players.map((player, index) => {
        const pos = seatPosition(index, players.length)
        const isMe = player.id === myId
        const isDealer = player.role === 'banker'

        return (
          <div
            key={player.id}
            ref={(el) => { seatRefs.current[player.id] = el }}
            className={`absolute z-20 flex flex-col items-center gap-1 cursor-default select-none`}
            style={{ left: pos.left, top: pos.top, transform: pos.transform }}
          >
            {/* Hole Cards (Poker) */}
            {isPoker && (
              <div className="flex -mb-4 z-0 opacity-90 scale-90">
                <div className="transform -rotate-6 translate-x-2">
                  <PlayingCard faceUp={false} />
                </div>
                <div className="transform rotate-6 -translate-x-2">
                  <PlayingCard faceUp={false} />
                </div>
              </div>
            )}

            {/* Avatar bubble */}
            <div
              className={`w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-all z-10 ${
                isMe
                  ? 'bg-emerald-700 border-emerald-400 ring-2 ring-emerald-400/40'
                  : isDealer
                  ? 'bg-amber-900 border-amber-500'
                  : 'bg-slate-700 border-slate-500'
              }`}
            >
              {isDealer
                ? <Crown className="w-5 h-5 text-amber-400" />
                : <User2 className="w-5 h-5 text-slate-300" />
              }
            </div>

            {/* Name + balance card */}
            <div
              className={`rounded-lg px-2 py-1 text-center shadow-xl backdrop-blur-sm border text-[10px] z-10 ${
                isMe
                  ? 'bg-emerald-900/80 border-emerald-600/50 text-emerald-100'
                  : isDealer
                  ? 'bg-amber-900/80 border-amber-600/50 text-amber-100'
                  : 'bg-slate-800/90 border-slate-600/50 text-slate-200'
              }`}
              style={{ minWidth: 64 }}
            >
              <div className="font-bold truncate max-w-[72px]">{player.name}</div>
              <div className={`font-black tabular-nums text-sm ${isMe ? 'text-emerald-300' : isDealer ? 'text-amber-300' : 'text-white'}`}>
                ${player.balance.toLocaleString()}
              </div>
            </div>

            {/* Chip stack */}
            {player.balance > 0 && <ChipStack balance={Math.min(player.balance, 150)} />}
          </div>
        )
      })}
    </div>
  )
})

export default TableBoard
