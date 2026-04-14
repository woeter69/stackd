export default function PlayingCard({ faceUp = false, value = '', suit = '' }: { faceUp?: boolean, value?: string, suit?: string }) {
  if (!faceUp) {
    return (
      <div className="w-8 h-12 md:w-10 md:h-14 rounded bg-blue-800 border-2 border-white shadow-md flex items-center justify-center m-0.5">
        <div className="w-6 h-10 md:w-8 md:h-12 border border-blue-400 rounded-sm opacity-50" />
      </div>
    )
  }
  
  const isRed = suit === '♥' || suit === '♦'
  
  return (
    <div className="w-8 h-12 md:w-10 md:h-14 rounded bg-white border border-slate-300 shadow-md flex flex-col justify-between p-1 m-0.5">
      <div className={`text-[10px] md:text-xs font-bold leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </div>
      <div className={`text-xs md:text-sm self-end leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {suit}
      </div>
    </div>
  )
}