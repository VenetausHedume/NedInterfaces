/* Words the markers treat as the same. Starter list — add to it as real answers show what gets missed.
   Keep entries to true exam-equivalents; a loose synonym gives marks away. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NedSynonyms = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    general: {
      increase: ['rise', 'go up', 'grow', 'higher', 'greater', 'bigger', 'larger'],
      decrease: ['fall', 'drop', 'go down', 'reduce', 'lower', 'less', 'smaller'],
      fast: ['quick', 'rapid'],
      wage: ['pay', 'salary', 'earnings'],
      firm: ['business', 'company', 'producer'],
      consumer: ['customer', 'buyer'],
      cost: ['expense'],
      heat: ['thermal energy'],
      conductor: ['conducts'],
      resistance: ['resistive'],
      speed: ['velocity'],
      particle: ['molecule'],
      temperature: ['temp'],
      liver: ['hepatic'],
      enzyme: ['enzymes'],
      safe: ['secure', 'safety'],
      lend: ['loan', 'give loans'],
      deposit: ['save', 'savings'],
    },
  };
});
