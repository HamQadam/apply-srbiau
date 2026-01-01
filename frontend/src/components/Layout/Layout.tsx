import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
