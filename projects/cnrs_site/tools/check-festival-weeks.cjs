// Run with: node --test tools/check-festival-weeks.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {join} = require('node:path');

const context = {window: {THREE: {}}, matchMedia: () => ({matches: false})};
runInNewContext(readFileSync(join(__dirname, '../js/scene.js'), 'utf8'), context);
const classify = context.window.Studio3D.classify;
const offset = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);

for (const [festival, date] of [
  ['holi', '2026-03-04'], ['holi', '2027-03-23'], ['holi', '2028-03-11'],
  ['holi', '2029-03-01'], ['holi', '2030-03-20'], ['holi', '2031-03-09'],
  ['diwali', '2026-11-08'], ['diwali', '2027-10-29'], ['diwali', '2028-10-17'],
  ['diwali', '2029-11-05'], ['diwali', '2030-10-26'], ['diwali', '2031-11-14'],
  ['christmas', '2026-12-25'], ['christmas', '2027-12-25']
]) {
  test(`${festival} on ${date} occupies exactly seven calendar days`, () => {
    for (let day = -3; day <= 3; day++) {
      for (const sequence of [-1, 0, 1, 2, 8]) {
        for (const weather of [null, {weather_code: 75}]) {
          assert.equal(classify(offset(date, day), weather, sequence), festival);
        }
      }
    }
    for (const day of [-4, 4]) {
      for (const sequence of [0, 1, 2]) assert.notEqual(classify(offset(date, day), null, sequence), festival);
    }
  });
}

test('national holidays and Halloween retain their existing themes outside festival windows', () => {
  for (const [date, theme] of [
    ['2026-01-26', 'republic'], ['2026-08-15', 'independence'], ['2026-07-14', 'france'],
    ['2026-10-25', 'halloween'], ['2026-10-31', 'halloween']
  ]) assert.equal(classify(date, null, 2), theme);
});

test('winter and weather rotation resume outside Christmas week', () => {
  for (const date of ['2026-12-21', '2026-12-29', '2027-01-02']) {
    assert.equal(classify(date, null, 0), 'robots');
    assert.equal(classify(date, null, 1), 'puppets');
    assert.equal(classify(date, null, 2), 'snow');
  }
  assert.equal(classify('2026-04-10', {weather_code: 75}, 2), 'snow');
});
