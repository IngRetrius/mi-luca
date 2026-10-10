import { describe, expect, it } from 'vitest';

import {
  currentTrm,
  officialRates,
  parseEcbCsv,
  parseTrm,
  roundRate,
  type OfficialSources,
} from './official-rates';

// Cotizaciones inventadas, con la forma de cada fuente.
const trmJson = [
  {
    valor: '4000.50',
    unidad: 'COP',
    vigenciadesde: '2026-10-10T00:00:00.000',
    vigenciahasta: '2026-10-13T00:00:00.000',
  },
  {
    valor: '4100',
    unidad: 'COP',
    vigenciadesde: '2026-10-09T00:00:00.000',
    vigenciahasta: '2026-10-09T00:00:00.000',
  },
];

const ecbCsv = [
  'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE',
  'EXR.D.ARS.EUR.SP00.A,D,ARS,EUR,SP00,A,2020-10-30,91.5953',
  'EXR.D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,2026-10-09,0.8',
  'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-10-09,1.25',
].join('\n');

const sources: OfficialSources = { trm: parseTrm(trmJson), ecb: parseEcbCsv(ecbCsv) };

describe('parseTrm', () => {
  it('lee el valor y los días en que rige', () => {
    expect(parseTrm(trmJson)[0]).toEqual({
      copPerUsd: 4000.5,
      from: '2026-10-10',
      to: '2026-10-13',
    });
  });

  it('descarta lo que no es una fila de la TRM', () => {
    expect(parseTrm({ error: true })).toEqual([]);
    expect(parseTrm([null, { valor: '', vigenciadesde: '2026-10-10' }, { valor: 'x' }])).toEqual(
      [],
    );
    expect(
      parseTrm([{ valor: '4000', vigenciadesde: '2026-02-30', vigenciahasta: '2026-03-01' }]),
    ).toEqual([]);
  });
});

describe('currentTrm', () => {
  it('toma la que rige hoy, aunque ya esté publicada la de mañana', () => {
    expect(currentTrm(sources.trm, '2026-10-09')?.copPerUsd).toBe(4100);
    expect(currentTrm(sources.trm, '2026-10-12')?.copPerUsd).toBe(4000.5);
  });

  it('sin la de hoy usa la última reciente, y ninguna si todas son viejas', () => {
    expect(currentTrm(sources.trm, '2026-10-15')?.from).toBe('2026-10-10');
    expect(currentTrm(sources.trm, '2026-10-30')).toBeNull();
    expect(currentTrm(sources.trm, '2026-10-08')).toBeNull();
  });
});

describe('parseEcbCsv', () => {
  it('lee moneda, fecha y valor por euro de cada fila', () => {
    expect(parseEcbCsv(ecbCsv)).toContainEqual({
      currency: 'USD',
      perEur: 1.25,
      date: '2026-10-09',
    });
  });

  it('ignora filas incompletas y un archivo sin las columnas', () => {
    expect(parseEcbCsv('CURRENCY,TIME_PERIOD,OBS_VALUE\nUSD,2026-10-09,\nXX,2026-10-09,2')).toEqual(
      [],
    );
    expect(parseEcbCsv('<html>error</html>')).toEqual([]);
  });
});

describe('roundRate', () => {
  it('deja seis cifras significativas y hasta 8 decimales', () => {
    expect(roundRate(4000.5)).toBe(4000.5);
    expect(roundRate(1 / 1.1206)).toBe(0.892379);
    expect(roundRate(0.000277243)).toBe(0.00027724);
  });
});

describe('officialRates', () => {
  it('con base en pesos: el dólar es la TRM y el euro y la libra se cruzan con el BCE', () => {
    const rates = officialRates('COP', '2026-10-12', sources);
    expect(rates.get('USD')).toEqual({
      currency: 'USD',
      rateToBase: 4000.5,
      asOf: '2026-10-10',
      sources: ['trm'],
      derived: false,
    });
    // 4.000,5 pesos por dólar × 1,25 dólares por euro.
    expect(rates.get('EUR')).toEqual({
      currency: 'EUR',
      rateToBase: 5000.63,
      asOf: '2026-10-09',
      sources: ['trm', 'ecb'],
      derived: true,
    });
    // 5.000,625 pesos por euro ÷ 0,8 libras por euro.
    expect(rates.get('GBP')?.rateToBase).toBe(6250.78);
    expect(rates.has('COP')).toBe(false);
  });

  it('con base en euros: el dólar es el del BCE invertido y el peso se cruza con la TRM', () => {
    const rates = officialRates('EUR', '2026-10-12', sources);
    expect(rates.get('USD')).toMatchObject({ rateToBase: 0.8, sources: ['ecb'], derived: false });
    expect(rates.get('COP')).toMatchObject({ rateToBase: 0.00019998, derived: true });
  });

  it('sin cotización reciente no hay sugerencia', () => {
    expect(officialRates('COP', '2026-10-12', sources).has('ARS')).toBe(false);
    expect(officialRates('CLP', '2026-10-12', sources).size).toBe(0);
  });

  it('si el BCE no responde, con base en pesos queda solo la TRM', () => {
    const rates = officialRates('COP', '2026-10-12', { trm: sources.trm, ecb: [] });
    expect([...rates.keys()]).toEqual(['USD']);
  });
});
