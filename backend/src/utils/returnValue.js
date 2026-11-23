const cents = value => Math.round(Number(value) * 100);

// Allocate the saved bill discount across line totals after their own discounts.
// Cumulative rounding makes the last line absorb only the rounding remainder.
function paidLines(lines, discount) {
  const ordered = [...lines].sort((a,b)=>a.id-b.id);
  const gross = ordered.reduce((sum,line)=>sum+cents(line.line_total),0);
  const deduction = Math.min(gross, Math.max(0,cents(discount || 0)));
  const paid = new Map();
  let cumulative = 0, previous = 0;
  for (const line of ordered) {
    const amount = cents(line.line_total);
    cumulative += amount;
    const allocated = gross ? Number((2n*BigInt(deduction)*BigInt(cumulative)+BigInt(gross))/(2n*BigInt(gross))) : 0;
    paid.set(Number(line.id),amount-(allocated-previous));
    previous=allocated;
  }
  return paid;
}

function linkedRefund(remainingCents,remainingUnits,qty) {
  if (!Number.isSafeInteger(qty) || qty<1 || qty>remainingUnits) throw Error('Invalid remaining return quantity');
  return Math.round(Math.max(0,remainingCents)*qty/remainingUnits)/100;
}
module.exports = {paidLines,linkedRefund,cents};
