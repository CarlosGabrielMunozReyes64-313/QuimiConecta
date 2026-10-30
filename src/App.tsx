import { useState } from 'react'
import { GameScreen } from './components/screens/GameScreen'
import { InstructionsScreen } from './components/screens/InstructionsScreen'
import { RegisterScreen } from './components/screens/RegisterScreen'
import { ResultsScreen } from './components/screens/ResultsScreen'
import { Stage } from './components/screens/Stage'
import { TitleScreen } from './components/screens/TitleScreen'
import { useStageLayout } from './hooks/useStageLayout'
import type { GameResult, Player } from './types/game'
import styles from './App.module.css'

type Screen = 'title' | 'instructions' | 'register' | 'game' | 'results'

/** Máquina de pantallas de QuimiConecta. */
export default function App() {
  const fit = useStageLayout()
  const [screen, setScreen] = useState<Screen>('title')
  const [player, setPlayer] = useState<Player | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [round, setRound] = useState(0)

  const startGame = (p: Player) => {
    setPlayer(p)
    setResult(null)
    setRound((r) => r + 1)
    setScreen('game')
  }

  return (
    <Stage fit={fit}>
      <div key={`${screen}-${round}`} className={styles.screen}>
        {screen === 'title' ? (
          <TitleScreen fit={fit} onStart={() => setScreen('register')} onInstructions={() => setScreen('instructions')} />
        ) : null}
        {screen === 'instructions' ? (
          <InstructionsScreen fit={fit} onBack={() => setScreen('title')} onStart={() => setScreen('register')} />
        ) : null}
        {screen === 'register' ? (
          <RegisterScreen fit={fit} initial={player} onBack={() => setScreen('title')} onDone={startGame} />
        ) : null}
        {screen === 'game' && player ? (
          <GameScreen
            fit={fit}
            player={player}
            onFinish={(r) => {
              setResult(r)
              setScreen('results')
            }}
            onQuit={() => setScreen('title')}
          />
        ) : null}
        {screen === 'results' && player && result ? (
          <ResultsScreen
            fit={fit}
            player={player}
            result={result}
            onReplay={() => startGame(player)}
            onChangePlayer={() => {
              setPlayer(null)
              setScreen('register')
            }}
            onMenu={() => setScreen('title')}
          />
        ) : null}
      </div>
    </Stage>
  )
}
