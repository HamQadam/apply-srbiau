import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  Search, 
  BarChart3, 
  Plus,
  FileText,
  LogIn,
  LogOut,
  Wallet,
  User,
  Coins,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  
  const navItems = [
    { to: '/', icon: GraduationCap, label: 'خانه' },
    ...(user ? [{ to: '/dashboard', icon: LayoutDashboard, label: 'داشبورد' }] : []),
    { to: '/applicants', icon: Users, label: 'متقاضیان' },
    { to: '/search', icon: Search, label: 'جستجو' },
    { to: '/stats', icon: BarChart3, label: 'آمار' },
    { to: '/documents', icon: FileText, label: 'اسناد' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">اپلای SRBIAU</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.to || 
                  (item.to !== '/' && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {!isLoading && (
                user ? (
                  <>
                    {/* Ghadam Balance */}
                    <Link
                      to="/wallet"
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-100 transition-colors"
                    >
                      <Coins className="w-4 h-4" />
                      <span>{user.ghadam_balance}</span>
                      <span className="hidden sm:inline">قدم</span>
                    </Link>

                    {/* User Menu */}
                    <div className="relative group">
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {user.display_name || user.phone}
                        </span>
                      </button>
                      
                      {/* Dropdown */}
                      <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <Link
                          to="/wallet"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Wallet className="w-4 h-4" />
                          کیف پول
                        </Link>
                        <button
                          onClick={logout}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-right"
                        >
                          <LogOut className="w-4 h-4" />
                          خروج
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ورود</span>
                  </Link>
                )
              )}

              <Link
                to="/applicants/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">ثبت تجربه</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Mobile Nav */}
        <div className="md:hidden border-t border-gray-100">
          <div className="flex overflow-x-auto px-2 py-2 gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || 
                (item.to !== '/' && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            ساخته شده با ❤️ توسط دانشجویان SRBIAU برای همه دانشجویان
          </p>
        </div>
      </footer>
    </div>
  );
}