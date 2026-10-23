// Development-only helper for refreshing the committed NASA/JPL Horizons
// golden vectors in tests/natal.test.mjs. It does not run in production.
const charts = [
  ["san-diego-1960", "1960-09-12T14:35:00.000Z"],
  ["poznan-1970", "1970-06-04T03:00:00.000Z"],
  ["boise-1974", "1974-08-02T18:00:00.000Z"],
  ["brussels-1992", "1992-12-08T23:35:00.000Z"],
  ["j2000", "2000-01-01T12:00:00.000Z"],
];
const bodies = { sun: 10, moon: 301, mercury: 199, venus: 299, mars: 499, jupiter: 599, saturn: 699, uranus: 799, neptune: 899, pluto: 999 };
const result = Object.fromEntries(charts.map(([name, utc]) => [name, { utc, positions: {} }]));
for (const [body, command] of Object.entries(bodies)) {
  const params = new URLSearchParams({ format: "json", COMMAND: `'${command}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'31'", CSV_FORMAT: "'YES'", ANG_FORMAT: "'DEG'", TIME_TYPE: "'UT'", TLIST_TYPE: "'JD'", TLIST: `'${charts.map(([, utc]) => new Date(utc).getTime() / 86400000 + 2440587.5).join("\n")}'` });
  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);
  const payload = await response.json();
  const rows = payload.result.split("$$SOE")[1].split("$$EOE")[0].trim().split(/\r?\n/);
  rows.forEach((row, index) => { result[charts[index][0]].positions[body] = Number(row.split(",")[3]); });
}
console.log(JSON.stringify(Object.values(result), null, 2));
