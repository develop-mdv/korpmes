import { MQ_DESKTOP, MQ_MOBILE, MQ_TABLET } from '@/styles/breakpoints';
import { useMediaQuery } from './useMediaQuery';

export function useBreakpoint() {
  const isMobile = useMediaQuery(MQ_MOBILE);
  const isTablet = useMediaQuery(MQ_TABLET);
  const isDesktop = useMediaQuery(MQ_DESKTOP);
  return { isMobile, isTablet, isDesktop };
}
