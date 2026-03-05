import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── 초기 상태 ──────────────────────────────────────────────
const INITIAL = {
  phase: 'character_create',
  character: null,
  scenario: null,
  currentLocationId: null,
  revealedClues: [],
  sessionStartSAN: 0,
  sessionSANLoss: 0,
  log: [],
  combat: null,
  gameOverStats: null,
  turnsPlayed: 0,
  lowestSAN: 99,
}

// ── 게임 상태 스토어 (localStorage 영속) ───────────────────
export const useGameStore = create(
  persist(
    (set, get) => ({
      ...INITIAL,

      startGame: (scenario, character) => set({
        phase: 'game',
        scenario,
        character,
        currentLocationId: scenario.locations[0].id,
        sessionStartSAN: character.SAN,
        sessionSANLoss: 0,
        lowestSAN: character.SAN,
        turnsPlayed: 0,
        revealedClues: [],
        log: [{ type: 'system', text: scenario.intro, timestamp: Date.now() }],
      }),

      addLog: (type, text) => set(state => ({
        log: [...state.log, { type, text, timestamp: Date.now() }],
        turnsPlayed: type === 'action' ? state.turnsPlayed + 1 : state.turnsPlayed,
      })),

      revealClue: (clueId) => set(state =>
        state.revealedClues.includes(clueId)
          ? {}
          : { revealedClues: [...state.revealedClues, clueId] }
      ),

      moveLocation: (locationId) => set({ currentLocationId: locationId }),

      applySanLoss: (lossAmount, updatedCharacter) => set(state => ({
        character: updatedCharacter,
        sessionSANLoss: state.sessionSANLoss + lossAmount,
        lowestSAN: Math.min(state.lowestSAN, updatedCharacter.SAN),
      })),

      applyDamage: (updatedCharacter) => set({ character: updatedCharacter }),

      startCombat: (combatState) => set({ combat: combatState }),

      nextTurn: () => set(state => {
        if (!state.combat) return {}
        const next = (state.combat.currentTurn + 1) % state.combat.order.length
        return {
          combat: {
            ...state.combat,
            currentTurn: next,
            round: next === 0 ? state.combat.round + 1 : state.combat.round,
          },
        }
      }),

      endCombat: () => set({ combat: null }),

      gameOver: (cause) => {
        const state = useGameStore.getState()
        const stats = {
          cause,
          lowestSAN:         state.lowestSAN,
          cluesFound:        state.revealedClues.length,
          cthulhuMythosSkill: state.character?.skills?.['크툴루신화'] ?? 0,
          turnsPlayed:       state.turnsPlayed,
          characterName:     state.character?.name ?? '',
          occupation:        state.character?.occupation ?? '',
          scenario:          state.scenario?.title ?? '',
          finalHP:           state.character?.HP ?? 0,
          finalSAN:          state.character?.SAN ?? 0,
          finalLUCK:         state.character?.LUCK ?? 0,
          date:              new Date().toISOString(),
        }
        appendHistory(stats)
        set({ phase: 'game_over', gameOverStats: stats })
      },

      reset: () => set(INITIAL),
    }),
    {
      name: 'coc_save',
      // 저장 제외: combat(전투 중 새로고침은 리셋), gameOverStats
      partialize: (state) => ({
        phase: state.phase,
        character: state.character,
        scenario: state.scenario,
        currentLocationId: state.currentLocationId,
        revealedClues: state.revealedClues,
        sessionStartSAN: state.sessionStartSAN,
        sessionSANLoss: state.sessionSANLoss,
        log: state.log.slice(-200), // 최근 200개로 제한
        turnsPlayed: state.turnsPlayed,
        lowestSAN: state.lowestSAN,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn('세이브 로드 실패:', error)
      },
    }
  )
)

// ── 셋업 스토어 (API 키 + 시나리오 선택, 비영속) ───────────
export const useSetupStore = create((set) => ({
  apiKey: sessionStorage.getItem('coc_api_key') || '',
  selectedScenario: null,

  setApiKey: (key) => {
    sessionStorage.setItem('coc_api_key', key)
    set({ apiKey: key })
  },
  setSelectedScenario: (scenario) => set({ selectedScenario: scenario }),
}))

export function clearSave() {
  localStorage.removeItem('coc_save')
}

// ── 플레이 기록 (coc_history) ─────────────────────────────
const HISTORY_KEY = 'coc_history'
const MAX_HISTORY_ENTRIES = 50

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function appendHistory(entry) {
  try {
    const prev = loadHistory()
    const next = [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch (e) {
    console.warn('기록 저장 실패:', e)
  }
}
