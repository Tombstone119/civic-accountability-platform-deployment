import { Request, Response, NextFunction } from 'express';
import { publicService } from '../services/publicService';
import { currencyService } from '../services/currencyService';

export const publicController = {
  /**
   * @route   GET /api/public/records
   * @desc    Paginated list of published contract records
   * @access  Public (no auth required)
   * @query   q, tags, page, limit
   */
  getRecords: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;

      const result = await publicService.getRecords(page, limit, req.query as Record<string, unknown>);

      res.status(200).json({
        success: true,
        data:    result.data,
        pagination: {
          total:      result.total,
          page:       result.page,
          limit:      result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/public/records/:id
   * @desc    Single public record with approved comments (viewCount incremented)
   * @access  Public
   */
  getRecordById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await publicService.getRecordById(req.params.id);

      res.status(200).json({
        success: true,
        data:    result.record,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/public/records/:id/comments
   * @desc    Approved comments for a public record
   * @access  Public
   */
  getComments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comments = await publicService.getComments(req.params.id);

      res.status(200).json({
        success: true,
        data:    comments,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/public/records/:id/comments
   * @desc    Submit a citizen comment (always starts as pending)
   * @access  Public (no auth required — citizen engagement)
   * @body    { authorName, content, authorEmail?, isAnonymous?, isWhistleblower? }
   */
  addComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await publicService.addComment(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data:    comment,
        message: 'Comment submitted and is awaiting moderation',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/public/comments/:id/moderate
   * @desc    Approve, reject, or flag a comment
   * @access  admin
   * @body    { status?, isFlagged?, flagReason? }
   */
  /**
   * @route   GET /api/public/comments
   * @desc    List all comments with pagination and optional filters
   * @access  admin
   * @query   page, limit, status, isFlagged
   */
  getAllComments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await publicService.getAllComments(req.query as Record<string, unknown>);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          total:      result.total,
          page:       result.page,
          limit:      result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  moderateComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await publicService.moderateComment(req.params.id, req.body);

      res.status(200).json({
        success: true,
        data:    comment,
        message: 'Comment moderated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/public/overview
   * @desc    Aggregate transparency data for the public dashboard (no auth required)
   */
  getOverview: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await publicService.getPublicOverview();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // ─── Third-party: Currency Conversion (Frankfurter API) ─────────────────────

  /**
   * @route   GET /api/public/currencies
   * @desc    List all currencies supported by the Frankfurter exchange-rate API.
   *          Results are cached for 24 hours. Useful for building currency
   *          selector dropdowns in the public portal UI.
   * @access  Public
   */
  getCurrencies: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currencies = await currencyService.getSupportedCurrencies();

      res.status(200).json({
        success: true,
        data:    currencies,
        meta: {
          source:    'Frankfurter (https://www.frankfurter.app)',
          cachedFor: '24 hours',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/public/records/:id/convert
   * @desc    Returns a public record's contract value converted to the requested
   *          currency using live exchange rates from the Frankfurter API.
   * @access  Public
   * @query   to    {string}  Required. Target currency code (e.g. EUR, GBP, JPY).
   * @query   from  {string}  Optional. Source currency code. Defaults to USD.
   *
   * @example GET /api/public/records/abc123/convert?to=EUR&from=USD
   */
  convertRecord: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to, from = 'USD' } = req.query as Record<string, string>;

      if (!to) {
        return res.status(400).json({
          success: false,
          message: "Query parameter 'to' is required (e.g. ?to=EUR). Use GET /api/public/currencies for supported codes.",
        });
      }

      const { record } = await publicService.getRecordById(req.params.id);

      // Extract the contract value from the populated contract field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contractValue: number | undefined = (record.contract as any)?.contractValue;

      if (!contractValue) {
        return res.status(422).json({
          success: false,
          message: 'Contract value is not available for this record.',
        });
      }

      const conversion = await currencyService.convert(contractValue, from, to);

      res.status(200).json({
        success: true,
        data: {
          amount: conversion.convertedAmount,
          rate:   conversion.rate,
          from:   conversion.from,
          to:     conversion.to,
          rateDate: conversion.rateDate,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
