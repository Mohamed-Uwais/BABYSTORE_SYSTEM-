// Shared by the storefront and API. New records use the local 10-digit form;
// historical customer records are never rewritten by this validator.
export const MOBILE_PHONE_HELP = 'Enter a Sri Lankan mobile number, for example 077 123 4567 or +94 77 123 4567.';

export function normalizeMobilePhone(value) {
  if (typeof value !== 'string') return null;
  const compact = value.trim().replace(/[\s-]/g, '');
  if (/^07\d{8}$/.test(compact)) return compact;
  if (/^7\d{8}$/.test(compact)) return `0${compact}`;
  if (/^\+?947\d{8}$/.test(compact)) return `0${compact.replace(/^\+?94/, '')}`;
  return null;
}

export function mobilePhoneAliases(value) {
  const local = normalizeMobilePhone(value);
  return local ? [local, local.slice(1), `94${local.slice(1)}`, `+94${local.slice(1)}`] : [];
}
