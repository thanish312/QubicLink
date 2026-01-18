const { secureRandomInt } = require('../../utils/helpers');

describe('secureRandomInt', () => {
  it('should generate a random integer within the specified range', () => {
    const min = 100000;
    const max = 999999;
    const randomInt = secureRandomInt(min, max);
    expect(randomInt).toBeGreaterThanOrEqual(min);
    expect(randomInt).toBeLessThanOrEqual(max);
  });

  it('should generate different integers on subsequent calls', () => {
    const min = 100000;
    const max = 999999;
    const randomInt1 = secureRandomInt(min, max);
    const randomInt2 = secureRandomInt(min, max);
    expect(randomInt1).not.toEqual(randomInt2);
  });
});
