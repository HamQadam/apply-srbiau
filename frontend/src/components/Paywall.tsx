import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Coins, Eye, Unlock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionApi } from '../api/auth';
import { Card, CardContent, Button, Badge } from './ui';

interface PaywallProps {
  applicantId: number;
  displayName: string;
  viewPrice: number;
  applicationCount: number;
  hasDocuments: boolean;
  onAccessGranted: () => void;
}

export function Paywall({
  applicantId,
  displayName,
  viewPrice,
  applicationCount,
  hasDocuments,
  onAccessGranted,
}: PaywallProps) {
  const { user, updateBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canAfford = user && user.ghadam_balance >= viewPrice;

  const handlePurchase = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await subscriptionApi.purchaseAccess(applicantId);
      if (response.success) {
        if (response.new_balance !== null) {
          updateBalance(response.new_balance);
        }
        onAccessGranted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در خرید دسترسی');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
      <CardContent className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
          <Lock className="w-8 h-8 text-gray-500" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          محتوای پروفایل {displayName} قفل است
        </h3>
        
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          برای مشاهده جزئیات کامل پروفایل، اپلیکیشن‌ها، اسناد و نکات این متقاضی
          نیاز به خرید دسترسی دارید.
        </p>

        {/* What's included */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Eye className="w-4 h-4" />
            <span>{applicationCount} اپلیکیشن</span>
          </div>
          {hasDocuments && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>+ اسناد</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-6 py-3 mb-6">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="text-2xl font-bold">{viewPrice}</span>
          <span className="text-gray-500">قدم</span>
        </div>

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">برای خرید دسترسی ابتدا وارد شوید</p>
            <Link to="/login" state={{ from: `/applicants/${applicantId}` }}>
              <Button>ورود به حساب</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              موجودی شما: <span className="font-medium">{user.ghadam_balance}</span> قدم
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            {canAfford ? (
              <Button onClick={handlePurchase} loading={loading}>
                <Unlock className="w-4 h-4 ml-2" />
                خرید دسترسی
              </Button>
            ) : (
              <div className="space-y-2">
                <Badge variant="error">موجودی کافی نیست</Badge>
                <p className="text-sm text-gray-500">
                  نیاز به {viewPrice - user.ghadam_balance} قدم دیگر دارید
                </p>
                <Link to="/applicants/new">
                  <Button variant="secondary" size="sm">
                    پروفایل بسازید و قدم کسب کنید
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
