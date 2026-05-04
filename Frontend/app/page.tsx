// Import the HomePage component directly to avoid redirect loops
import HomePage from './home/page'

// Serve the home page content directly at the root
export default function RootPage() {
  return <HomePage />
}

