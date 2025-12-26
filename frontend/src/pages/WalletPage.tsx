import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coins,
  TrendingUp,
  Gift,
  Eye,
  FileText,
  Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { walletApi } from '../api/auth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Button, 
  Input, 
  Spinner,
  Badge,
} from '../components/ui';

export function WalletPage() {
  const { user, updateBalance } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: walletApi.getBalance,
  });

  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: () => walletApi.getTransactions(0, 50),
  });

  const { data: rates } = useQuery({
    queryKey: ['wallet', 'rates'],
    queryFn: walletApi.getRewardRates,
  });

  const withdrawMutation = useMutation({
    mutationFn: (amount: number) => walletApi.withdraw(amount),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      if (user) {
        updateBalance(user.ghadam_balance - parseInt(withdrawAmount));
      }
      setWithdrawAmount('');
      alert(data.message);
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'خطا در برداشت');
    },
  });

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < (balance?.min_withdrawal || 500)) {
      alert(`حداقل مقدار برداشت ${balance?.min_withdrawal || 500} قدم است`);
      return;
    }
    withdrawMutation.mutate(amount);
  };

  const getTransactionIcon = (type: string) => {
    if (type.startsWith('earn')) {
      return <ArrowDownRight className="w-4 h-4 text-green-500" />;
    }
    if (type.startsWith('spend') || type === 'withdraw') {
      return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    }
    return <Coins className="w-4 h-4 text-gray-400" />;
  };

  const formatTransactionType = (type: string) => {
    const labels: Record<string, string> = {
      earn_profile: 'ایجاد پروفایل',
      earn_application: 'افزودن اپلیکیشن',
      earn_document: 'آپلود سند',
      earn_language: 'افزودن مدرک زبان',
      earn_activity: 'افزودن فعالیت',
      earn_view: 'بازدید از پروفایل',
      spend_view: 'مشاهده پروفایل',
      spend_subscribe: 'اشتراک',
      withdraw: 'برداشت',
      bonus: 'پاداش',
    };
    return labels[type] || type;
  };

  if (loadingBalance) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="w-8 h-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">کیف پول قدم</h1>
        <p className="text-gray-600">مدیریت قدم‌های شما</p>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Wallet className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {balance?.ghadam_balance.toLocaleString()} 
                  <span className="text-sm font-normal mr-1">قدم</span>
                </div>
                <div className="text-sm text-gray-500">موجودی فعلی</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {balance?.total_earned.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">کل درآمد</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {balance?.total_spent.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">کل هزینه</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {balance?.total_withdrawn.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">برداشت شده</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Withdraw Section */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">برداشت وجه</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">نرخ تبدیل:</span>
                <span>۱ قدم = {balance?.withdrawal_rate.toLocaleString()} تومان</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">حداقل برداشت:</span>
                <span>{balance?.min_withdrawal} قدم</span>
              </div>
            </div>

            <Input
              type="number"
              placeholder="مقدار قدم"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min={balance?.min_withdrawal}
              max={balance?.ghadam_balance}
            />

            {withdrawAmount && parseInt(withdrawAmount) > 0 && (
              <div className="text-center text-lg font-medium text-green-600">
                = {(parseInt(withdrawAmount) * (balance?.withdrawal_rate || 100)).toLocaleString()} تومان
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleWithdraw}
              loading={withdrawMutation.isPending}
              disabled={!withdrawAmount || parseInt(withdrawAmount) < (balance?.min_withdrawal || 500)}
            >
              درخواست برداشت
            </Button>
          </CardContent>
        </Card>

        {/* Reward Rates */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">نرخ پاداش‌ها</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600">
                  <Gift className="w-4 h-4" /> ایجاد پروفایل
                </span>
                <Badge variant="success">+{rates?.profile_created} قدم</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" /> افزودن اپلیکیشن
                </span>
                <Badge variant="success">+{rates?.application_added} قدم</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" /> اپلیکیشن با نکات
                </span>
                <Badge variant="success">+{rates?.application_with_notes} قدم</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600">
                  <FileText className="w-4 h-4" /> آپلود سند
                </span>
                <Badge variant="success">+{rates?.document_uploaded} قدم</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600">
                  <Eye className="w-4 h-4" /> بازدید از پروفایل شما
                </span>
                <Badge variant="success">+{rates?.view_earned} قدم</Badge>
              </div>
              <hr className="my-2" />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-600">
                  <Eye className="w-4 h-4" /> مشاهده پروفایل دیگران
                </span>
                <Badge variant="warning">-{rates?.view_price_default} قدم</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="font-semibold">تراکنش‌های اخیر</h2>
          </CardHeader>
          <CardContent>
            {loadingTx ? (
              <div className="flex justify-center py-4">
                <Spinner className="w-6 h-6" />
              </div>
            ) : transactions?.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                تراکنشی وجود ندارد
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {transactions?.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(tx.transaction_type)}
                      <div>
                        <div className="text-sm font-medium">
                          {formatTransactionType(tx.transaction_type)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString('fa-IR')}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-medium ${
                        tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
