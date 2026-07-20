// functions/lib/scenarios.js
// SPEC §6.6 Multi-scenario cost modeling (premium; §3 feature 15, §5 /api/vault/scenario).
// Fixed constants (functions/lib/constants.js):
//   TRUCK_BASE_USD=40.00, TRUCK_MILEAGE_USD_PER_MI=1.00, LABOR_RATE_USD_PER_HR=60.00,
//   CONTAINER_BASE_USD=200.00, CONTAINER_MILEAGE_USD_PER_MI=2.50, FULLSERVICE_USD_PER_LB=0.70.
// Fuel reuses §6.4 fuelCost(distance).
//   DIY truck    = TRUCK_BASE + distance×TRUCK_MILEAGE + fuel_cost(distance) + labor_hours×LABOR_RATE
//   Container    = CONTAINER_BASE + distance×CONTAINER_MILEAGE
//   Full-service = weight_lbs × FULLSERVICE_USD_PER_LB
//   ranked = scenarios sorted by total ascending (ties broken alphabetically by name)
// Rounding (§6): USD → 2 dec at the response boundary.

import { round } from './round.js';
import { fuelCost } from './distance.js';
import {
  TRUCK_BASE_USD,
  TRUCK_MILEAGE_USD_PER_MI,
  LABOR_RATE_USD_PER_HR,
  CONTAINER_BASE_USD,
  CONTAINER_MILEAGE_USD_PER_MI,
  FULLSERVICE_USD_PER_LB,
} from './constants.js';
import { HttpError } from './respond.js';

/**
 * Compute per-scenario cost breakdowns + a cheapest-first ranking.
 * @param {{distance_miles:number,labor_hours:number,weight_lbs:number}} input
 * @returns {{scenarios:{name:string,line_items:{label:string,amount_usd:number}[],total_usd:number}[],ranked:string[]}}
 * @throws {HttpError} VALIDATION on bad inputs (distance>0, labor_hours>=0, weight>0)
 */
export function scenarioModel({ distance_miles, labor_hours, weight_lbs } = {}) {
  if (typeof distance_miles !== 'number' || !Number.isFinite(distance_miles) || distance_miles <= 0) {
    throw new HttpError('VALIDATION', 'distance_miles must be a positive number');
  }
  if (typeof labor_hours !== 'number' || !Number.isFinite(labor_hours) || labor_hours < 0) {
    throw new HttpError('VALIDATION', 'labor_hours must be a number >= 0');
  }
  if (typeof weight_lbs !== 'number' || !Number.isFinite(weight_lbs) || weight_lbs <= 0) {
    throw new HttpError('VALIDATION', 'weight_lbs must be a positive number');
  }

  // §6.4 fuel reuse: fuel_cost(distance) where distance is treated as driving miles.
  const fuel = fuelCost(distance_miles);

  // --- DIY truck (§6.6) ---
  const diyBase = TRUCK_BASE_USD; // 40.00
  const diyMileage = distance_miles * TRUCK_MILEAGE_USD_PER_MI; // distance × 1.00
  const diyLabor = labor_hours * LABOR_RATE_USD_PER_HR; // labor_hours × 60.00
  const diyTotal = diyBase + diyMileage + fuel + diyLabor;
  const diy = {
    name: 'DIY truck',
    line_items: [
      { label: 'Truck base fee', amount_usd: round(diyBase, 2) },
      { label: 'Mileage', amount_usd: round(diyMileage, 2) },
      { label: 'Fuel', amount_usd: round(fuel, 2) },
      { label: 'Labor', amount_usd: round(diyLabor, 2) },
    ],
    total_usd: round(diyTotal, 2),
  };

  // --- Container (§6.6) ---
  const containerBase = CONTAINER_BASE_USD; // 200.00
  const containerMileage = distance_miles * CONTAINER_MILEAGE_USD_PER_MI; // distance × 2.50
  const containerTotal = containerBase + containerMileage;
  const container = {
    name: 'Container',
    line_items: [
      { label: 'Container base fee', amount_usd: round(containerBase, 2) },
      { label: 'Mileage', amount_usd: round(containerMileage, 2) },
    ],
    total_usd: round(containerTotal, 2),
  };

  // --- Full-service (§6.6) ---
  const fullTotal = weight_lbs * FULLSERVICE_USD_PER_LB; // weight × 0.70
  const fullService = {
    name: 'Full-service',
    line_items: [{ label: 'Weight-based full service', amount_usd: round(fullTotal, 2) }],
    total_usd: round(fullTotal, 2),
  };

  const scenarios = [diy, container, fullService];

  // ranked: total ascending; ties broken alphabetically by name (§6.6).
  const ranked = [...scenarios]
    .sort((a, b) => a.total_usd - b.total_usd || a.name.localeCompare(b.name))
    .map((s) => s.name);

  return { scenarios, ranked };
}
