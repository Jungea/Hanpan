import GameCard from '../components/GameCard'
import { games } from '../games/registry'

export default function Home() {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {games.map((game) => (
        <li key={game.id}>
          <GameCard game={game} />
        </li>
      ))}
    </ul>
  )
}
