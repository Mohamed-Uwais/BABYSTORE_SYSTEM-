function distributeCharges(lines, charges) {
  if (!Array.isArray(charges) || charges.length > 100) throw Error('Invalid receipt charges');
  return charges.map(charge => {
    if (!charge.description?.trim() || !charge.payee?.trim() ||
        !Number.isSafeInteger(charge.cents) || charge.cents <= 0) {
      throw Error('Each charge needs a description, payee and positive amount');
    }
    const eligible = lines.filter(line => charge.line_id == null || Number(charge.line_id) === line.id);
    if (!eligible.length) throw Error('Charge has no eligible receipt lines');
    const allocation = {};
    if (charge.basis === 'manual') {
      let sum = 0;
      for (const line of eligible) {
        const cents = charge.shares?.[line.id];
        if (!Number.isSafeInteger(cents) || cents < 0) throw Error('Enter a nonnegative amount for each receiving line');
        sum += cents;
        allocation[line.id] = cents;
      }
      if (sum !== charge.cents) throw Error('Manual line amounts must equal the charge');
    } else {
      const weights = eligible.map(line => {
        if (charge.basis === 'quantity') return line.incoming;
        if (charge.basis === 'value') return line.incoming * Math.round(Number(line.unit_cost_price) * 100);
        if (charge.basis !== 'weight') throw Error('Unknown allocation method');
        const grams = charge.weights?.[line.id];
        if (!Number.isSafeInteger(grams) || grams <= 0) throw Error('Enter the unit weight in grams for every receiving line');
        return line.incoming * grams;
      });
      const total = weights.reduce((a,b) => a+b,0);
      if (!Number.isSafeInteger(total) || total <= 0) throw Error('Allocation basis must have a positive total');
      let cumulative = 0, previous = 0;
      eligible.forEach((line,index) => {
        cumulative += weights[index];
        const rounded = Number((2n*BigInt(cumulative)*BigInt(charge.cents)+BigInt(total))/(2n*BigInt(total)));
        allocation[line.id] = rounded-previous;
        previous = rounded;
      });
    }
    return {...charge, allocation};
  });
}
module.exports = distributeCharges;
