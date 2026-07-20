// test/fmcsa.test.js — SPEC §6.8 fixtures EXACT.
import { describe, it, expect } from 'vitest';
import { parseFmcsaRecord } from '../functions/lib/fmcsa.js';

describe('parseFmcsaRecord (§6.8)', () => {
  it('Fixture 1: ACME MOVERS INC → authorized + meets minimum', () => {
    const raw = {
      legal_name: 'ACME MOVERS INC',
      usdot: '1234567',
      mc: 'MC-654321',
      operating_status: 'AUTHORIZED FOR Property, HHG',
      carrier_operation: 'Interstate; HHG',
      bipd_insurance_on_file: '1000000',
      crash_total: 2,
      inspection_total: 15,
    };
    const r = parseFmcsaRecord(raw);
    expect(r.found).toBe(true);
    expect(r.carrier_name).toBe('ACME MOVERS INC');
    expect(r.usdot).toBe('1234567');
    expect(r.mc).toBe('MC-654321');
    expect(r.authorized_for_hhg).toBe(true);
    expect(r.meets_750k_minimum).toBe(true);
    expect(r.insurance_on_file_usd).toBe(1000000);
    expect(r.crash_total).toBe(2);
    expect(r.inspection_total).toBe(15);
    expect(r.plain_english[0]).toMatch(/^✅ Authorized/);
    expect(r.plain_english[1]).toMatch(/^✅ Carries at least the federal \$750,000/);
    expect(r.plain_english[2]).toBe('Crashes on record (24 mo): 2.');
    expect(r.plain_english[3]).toBe('Inspections on record: 15.');
  });

  it('Fixture 2: ROGUE HAUL LLC → not authorized + below minimum', () => {
    const raw = {
      legal_name: 'ROGUE HAUL LLC',
      usdot: '7654321',
      operating_status: 'NOT AUTHORIZED',
      carrier_operation: 'Interstate',
      bipd_insurance_on_file: '250000',
      crash_total: 5,
      inspection_total: 3,
    };
    const r = parseFmcsaRecord(raw);
    expect(r.found).toBe(true);
    expect(r.carrier_name).toBe('ROGUE HAUL LLC');
    expect(r.usdot).toBe('7654321');
    expect(r.mc).toBe(null);
    expect(r.authorized_for_hhg).toBe(false);
    expect(r.meets_750k_minimum).toBe(false);
    expect(r.insurance_on_file_usd).toBe(250000);
    expect(r.plain_english[0]).toMatch(/^⚠️ NOT authorized/);
    expect(r.plain_english[1]).toMatch(/^⚠️ Liability insurance on file is below/);
    expect(r.plain_english[2]).toBe('Crashes on record (24 mo): 5.');
    expect(r.plain_english[3]).toBe('Inspections on record: 3.');
  });

  it('renders unknown crash/inspection counts as "unknown"', () => {
    const r = parseFmcsaRecord({
      legal_name: 'MYSTERY MOVE CO',
      operating_status: 'AUTHORIZED',
      carrier_operation: 'Interstate; Property',
      bipd_insurance_on_file: '750000',
    });
    expect(r.meets_750k_minimum).toBe(true); // exactly at the $750k minimum
    expect(r.plain_english[2]).toBe('Crashes on record (24 mo): unknown.');
    expect(r.plain_english[3]).toBe('Inspections on record: unknown.');
  });
});
