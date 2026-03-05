import { useGameStore, clearSave } from '../store/gameStore'

const CAUSE_TEXT = {
  death:    { title: '탐사자가 사망했다', sub: '공허는 끝내 당신을 삼켰다.' },
  insanity: { title: '탐사자는 광기에 빠졌다', sub: '진실을 보는 자는 온전할 수 없다.' },
}

export default function GameOver() {
  const gameOverStats = useGameStore(s => s.gameOverStats)
  const reset = useGameStore(s => s.reset)
  const { title, sub } = CAUSE_TEXT[gameOverStats?.cause] ?? CAUSE_TEXT.death

  const handleRestart = () => {
    clearSave()
    reset()
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-xl text-parchment tracking-wide">{title}</h1>
          <p className="text-dust text-sm italic">{sub}</p>
        </div>
        <div className="border border-border p-6 space-y-3 text-left">
          <StatLine label="생존 턴" value={gameOverStats?.turnsPlayed ?? 0} />
          <StatLine label="최저 SAN" value={gameOverStats?.lowestSAN ?? 0} />
          <StatLine label="발견한 단서" value={gameOverStats?.cluesFound ?? 0} />
          <StatLine label="크툴루신화" value={`${gameOverStats?.cthulhuMythosSkill ?? 0}%`} />
        </div>
        <button onClick={handleRestart}
          className="w-full py-3 text-sm tracking-widest uppercase border border-blood text-blood hover:bg-blood hover:text-parchment transition-colors">
          새 탐사자
        </button>
      </div>
    </div>
  )
}

function StatLine({ label, value }) {
  return (
    <div className="flex justify-between text-sm border-b border-border pb-2">
      <span className="text-dust">{label}</span>
      <span className="font-mono text-parchment">{value}</span>
    </div>
  )
}
