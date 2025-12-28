import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Track Your University Applications.
              <br />
              Learn from Success Stories.
            </h1>
            <p className="mt-6 text-xl text-blue-100">
              Keep all your applications organized in one place. See how others with similar backgrounds got accepted to your dream schools.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-center"
                  >
                    Start Tracking — It's Free
                  </Link>
                  <Link
                    to="/explore"
                    className="inline-block px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-center"
                  >
                    Browse Programs
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything you need to stay organized
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Track Applications</h3>
            <p className="text-gray-600">
              Keep track of all your programs, deadlines, and documents in one organized dashboard.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Learn from Others</h3>
            <p className="text-gray-600">
              See success stories from students with similar backgrounds who got into your target schools.
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="text-5xl mb-4">🪙</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Earn Ghadam Coins</h3>
            <p className="text-gray-600">
              Share your journey after you get results and earn coins. Help future students succeed.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How Ghadam Works
          </h2>
          
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Add your target programs</h3>
                <p className="text-gray-600 mt-1">
                  Search our database or add custom programs. Track deadlines, documents, and status.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Discover success stories</h3>
                <p className="text-gray-600 mt-1">
                  See how many students from your university got into each program. Use your Ghadam coins to view their full profiles.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Share your journey</h3>
                <p className="text-gray-600 mt-1">
                  After you get your results, share your experience. Earn 70% of the coins when others view your profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to get organized?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of students tracking their applications with Ghadam.
        </p>
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-2xl">🎓</span>
              <span className="font-bold text-white">Ghadam</span>
            </div>
            <div className="text-sm">
              © {new Date().getFullYear()} Ghadam. Built with ❤️ for students everywhere.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
