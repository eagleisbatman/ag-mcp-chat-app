import { t } from '../../constants/strings';

export function getGenericErrorMessage(): string {
  return t('system.errorFallback');
}

export function getNetworkErrorMessage(): string {
  return t('chat.noInternet');
}

export function getTimeoutErrorMessage(): string {
  return t('errors.requestTimeout');
}

export function getHttpErrorMessage(status: number): string {
  if (status === 408) return getTimeoutErrorMessage();
  if (status >= 500) return t('errors.serverError');
  return getGenericErrorMessage();
}
