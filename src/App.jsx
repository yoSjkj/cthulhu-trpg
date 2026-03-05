import { useGameStore, useSetupStore } from './store/gameStore'
import ApiSetup from './pages/ApiSetup'
import CharacterCreate from './pages/CharacterCreate'
import Game from './pages/Game'
import GameOver from './pages/GameOver'

export default function App() {
  const phase = useGameStore(s => s.phase)
  const apiKey = useSetupStore(s => s.apiKey)
  const selectedScenario = useSetupStore(s => s.selectedScenario)

  if (phase === 'game_over') return <GameOver />

  if (phase === 'game') {
    if (!apiKey) return <ApiSetup hasSave />
    return <Game />
  }

  // character_create phase
  if (!apiKey || !selectedScenario) return <ApiSetup />
  return <CharacterCreate />
}
