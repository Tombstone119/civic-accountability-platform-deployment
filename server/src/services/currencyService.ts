import axios from 'axios';
import { BadRequestError } from '../utils/errors';

const FRANKFURTER_BASE = 'https://api.frankfurter.app';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CurrencyMap {
  [code: string]: string;
}

export interface ConversionResult {
  originalAmount: number;
  from: string;
  to: string;
  rate: number;
  convertedAmount: number;
  rateDate: string;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let currencyCache: { data: CurrencyMap; fetchedAt: number } | null = null;

// ─── Service ──────────────────────────────────────────────────────────────────

export const currencyService = {
  /**
   * Returns all currencies supported by the Frankfurter API.
   * Results are cached in memory for 24 hours to avoid hammering the external API.
   *
   * Source: https://api.frankfurter.app/currencies
   */
  getSupportedCurrencies: async (): Promise<CurrencyMap> => {
    if (currencyCache && Date.now() - currencyCache.fetchedAt < CURRENCY_CACHE_TTL) {
      return currencyCache.data;
    }

    const response = await axios.get<CurrencyMap>(`${FRANKFURTER_BASE}/currencies`, {
      timeout: 8_000,
    });

    currencyCache = { data: response.data, fetchedAt: Date.now() };
    return response.data;
  },

  /**
   * Converts an amount from one currency to another using live exchange rates.
   *
   * Calls: GET https://api.frankfurter.app/latest?amount=<n>&from=<FROM>&to=<TO>
   *
   * @param amount  - The monetary value to convert
   * @param from    - Source currency code (e.g. "USD")
   * @param to      - Target currency code (e.g. "EUR")
   */
  convert: async (amount: number, from: string, to: string): Promise<ConversionResult> => {
    const fromCode = from.toUpperCase();
    const toCode   = to.toUpperCase();

    // Trivial case — same currency
    if (fromCode === toCode) {
      return {
        originalAmount:  amount,
        from:            fromCode,
        to:              toCode,
        rate:            1,
        convertedAmount: amount,
        rateDate:        new Date().toISOString().split('T')[0],
      };
    }

    try {
      const response = await axios.get(`${FRANKFURTER_BASE}/latest`, {
        params:  { amount, from: fromCode, to: toCode },
        timeout: 8_000,
      });

      const convertedAmount: number = response.data.rates[toCode];
      const rate = parseFloat((convertedAmount / amount).toFixed(6));

      return {
        originalAmount: amount,
        from:           fromCode,
        to:             toCode,
        rate,
        convertedAmount,
        rateDate:       response.data.date,
      };
    } catch (err: unknown) {
      // Frankfurter returns HTTP 422 for unrecognised currency codes
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        throw new BadRequestError(
          `Invalid currency code: '${fromCode}' or '${toCode}'. ` +
          'Use GET /api/public/currencies to see supported codes.'
        );
      }
      throw err;
    }
  },
};
