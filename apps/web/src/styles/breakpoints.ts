export const MOBILE_MAX = 1023;
export const TABLET_MAX = 1023;

export const MQ_MOBILE = `(max-width: ${MOBILE_MAX}px)`;
export const MQ_TABLET = `(min-width: 768px) and (max-width: ${TABLET_MAX}px)`;
export const MQ_DESKTOP = `(min-width: ${TABLET_MAX + 1}px)`;
