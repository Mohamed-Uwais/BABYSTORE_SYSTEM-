function normalize(raw) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length === 11) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '94' + digits.slice(1);
  if (digits.length === 9) return '94' + digits;
  return digits;
}

function display(phone) {
  if (!phone) return '';
  const n = normalize(phone);
  if (!n || n.length !== 11) return phone;
  return `0${n.slice(2, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
}

module.exports = { normalize, display };
