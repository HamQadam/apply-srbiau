import { Toaster } from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';

export function ToastHost() {
  const { direction } = useLanguage();

  return (
    <Toaster
      position={direction === 'rtl' ? 'top-left' : 'top-right'}
      toastOptions={{ duration: 4000 }}
      containerStyle={{ direction }}
    />
  );
}
