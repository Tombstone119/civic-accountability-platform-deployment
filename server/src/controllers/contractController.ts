import { Request, Response, NextFunction } from 'express';
import { contractService } from '../services/contractService';
import PDFDocument from 'pdfkit';
import { ContractItem } from '../models/ContractItem';
import { Payment } from '../models/Payment';

const extractPagination = (req: Request) => ({
  page: parseInt(req.query.page as string, 10) || 1,
  limit: parseInt(req.query.limit as string, 10) || 10,
});

const sendPaginated = (
  res: Response,
  result: { data: unknown; total: number; page: number; limit: number; totalPages: number }
) => {
  res.status(200).json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
};

export const contractController = {
  /**
   * @route   GET /api/contracts
   * @desc    List contracts with pagination and filters
   * @access  All authenticated roles
   * @query   page, limit, status, department, vendor, procurementMethod, isPublic, search
   */
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = extractPagination(req);

      const result = await contractService.getAll(page, limit, req.query as Record<string, unknown>);
      sendPaginated(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/contracts/:id
   * @desc    Get full contract detail: contract + items + payment count + financials
   * @access  All authenticated roles
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: result.contract,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/contracts
   * @desc    Create a new contract (blacklist-checks vendor automatically)
   * @access  admin | procurement_officer
   * @body    { contractNo, title, vendor, department, contractValue, procurementMethod, startDate, endDate, description?, category?, tags? }
   */
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.create(req.body, req.user!.userId);

      res.status(201).json({
        success: true,
        data: result.contract,
        warnings: result.warnings,
        message: 'Contract created successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/contracts/:id
   * @desc    Update contract — toggling isPublic=true auto-creates a PublicRecord
   * @access  admin | procurement_officer
   */
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await contractService.update(req.params.id, req.body, req.user!.userId);

      res.status(200).json({
        success: true,
        data: contract,
        message: 'Contract updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/contracts/:id
   * @desc    Delete contract (draft only — cascades items and payments)
   * @access  admin
   */
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await contractService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: 'Contract deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Publish ────────────────────────────────────────────────────────────────

  /**
   * @route   POST /api/contracts/:id/publish
   * @desc    Publish contract to public portal (sets isPublic=true, creates PublicRecord)
   * @access  admin | procurement_officer
   */
  publish: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.publish(req.params.id, req.user!.userId);

      res.status(200).json({
        success: true,
        data: result.publicRecord,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Contract Items ──────────────────────────────────────────────────────────

  /**
   * @route   GET /api/contracts/:id/items
   * @desc    List all line items for a contract (includes overpricing flag)
   * @access  All authenticated roles
   */
  getItems: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await contractService.getItems(req.params.id);

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   POST /api/contracts/:id/items
   * @desc    Add a line item to a contract
   * @access  admin | procurement_officer
   * @body    { description, quantity, unitPrice, unit?, marketPrice? }
   */
  addItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.addItem(req.params.id, req.body);

      res.status(201).json({
        success: true,
        data: result.item,
        warnings: result.warnings,
        message: 'Item added successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   PUT /api/contracts/:id/items/:itemId
   * @desc    Update a line item (totalPrice recalculated automatically)
   * @access  admin | procurement_officer
   */
  updateItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await contractService.updateItem(
        req.params.id,
        req.params.itemId,
        req.body
      );

      res.status(200).json({
        success: true,
        data: result.item,
        warnings: result.warnings,
        message: 'Item updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   DELETE /api/contracts/:id/items/:itemId
   * @desc    Remove a line item
   * @access  admin
   */
  deleteItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await contractService.deleteItem(req.params.id, req.params.itemId);

      res.status(200).json({
        success: true,
        message: 'Item deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Payments sub-resource ───────────────────────────────────────────────────

  /**
   * @route   GET /api/contracts/:id/payments
   * @desc    List paginated payments for a contract
   * @access  admin | procurement_officer
   * @query   page, limit
   */
  getPayments: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = extractPagination(req);

      const result = await contractService.getPayments(req.params.id, page, limit);
      sendPaginated(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route   GET /api/contracts/:id/report
   * @desc    Generate and stream a PDF report for a contract
   * @access  All authenticated roles
   */
  downloadReport: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await contractService.getById(id);
      const contract = result.contract as any;

      const [items, payments] = await Promise.all([
        ContractItem.find({ contract: id } as any).sort({ createdAt: 1 }),
        Payment.find({ contract: id } as any).sort({ paymentDate: -1 }),
      ]);

      const contractNumber = contract.contractNumber ?? id;
      const vendorName = typeof contract.vendor === 'object' ? contract.vendor?.name : 'N/A';
      const deptName = typeof contract.department === 'object' ? contract.department?.name : 'N/A';
      const fmt = (n: number) => `$${n.toLocaleString()}`;
      const fmtDate = (d?: Date | string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract-${contractNumber}-report.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('VeriTrack', { align: 'left' });
      doc.fontSize(12).font('Helvetica').fillColor('#475569').text('Contract Report', { align: 'left' });
      doc.fontSize(10).text(`Generated: ${fmtDate(new Date())}`, { align: 'left' });
      doc.moveDown(1.5);

      // Contract Summary
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('Contract Summary');
      doc.moveDown(0.5);

      const rows: [string, string][] = [
        ['Contract No.', contractNumber],
        ['Title', contract.title ?? '—'],
        ['Vendor', vendorName],
        ['Department', deptName],
        ['Procurement Method', (contract.procurementMethod ?? '').replace(/_/g, ' ')],
        ['Status', contract.status ?? '—'],
        ['Contract Value', fmt(contract.contractValue ?? 0)],
        ['Total Paid', fmt(contract.totalPaid ?? 0)],
        ['Remaining', fmt(Math.max(0, (contract.contractValue ?? 0) - (contract.totalPaid ?? 0)))],
        ['Start Date', fmtDate(contract.startDate)],
        ['End Date', fmtDate(contract.endDate)],
      ];

      doc.fontSize(10).font('Helvetica');
      rows.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').fillColor('#475569').text(`${label}: `, { continued: true });
        doc.font('Helvetica').fillColor('#0f172a').text(value);
      });

      doc.moveDown(1.5);

      // Line Items
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('Line Items');
      doc.moveDown(0.5);

      if (items.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('No line items.');
      } else {
        const colX = [50, 220, 290, 360, 450];
        const headers = ['Description', 'Qty', 'Unit', 'Unit Price', 'Total'];
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
        headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 90, continued: i < headers.length - 1 } as any));
        doc.moveDown(0.5);

        items.forEach((item: any) => {
          const y = doc.y;
          doc.fontSize(9).font('Helvetica').fillColor('#0f172a');
          doc.text(item.description ?? '', colX[0], y, { width: 165 });
          doc.text(String(item.quantity ?? ''), colX[1], y, { width: 65 });
          doc.text(item.unit ?? '—', colX[2], y, { width: 65 });
          doc.text(fmt(item.unitPrice ?? 0), colX[3], y, { width: 85 });
          doc.text(fmt(item.totalPrice ?? 0), colX[4], y, { width: 90 });
          doc.moveDown(0.6);
        });
      }

      doc.moveDown(1.5);

      // Payment History
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('Payment History');
      doc.moveDown(0.5);

      if (payments.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('No payments recorded.');
      } else {
        const colX = [50, 180, 280, 360, 450];
        const headers = ['Ref No.', 'Amount', 'Date', 'Type', 'Status'];
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
        headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 90, continued: i < headers.length - 1 } as any));
        doc.moveDown(0.5);

        payments.forEach((p: any) => {
          const y = doc.y;
          doc.fontSize(9).font('Helvetica').fillColor('#0f172a');
          doc.text(p.referenceNumber ?? p._id.toString().slice(-8).toUpperCase(), colX[0], y, { width: 125 });
          doc.text(fmt(p.amount ?? 0), colX[1], y, { width: 95 });
          doc.text(fmtDate(p.paymentDate), colX[2], y, { width: 75 });
          doc.text((p.paymentType ?? '—').replace(/_/g, ' '), colX[3], y, { width: 85 });
          doc.text(p.status ?? '—', colX[4], y, { width: 90 });
          doc.moveDown(0.6);
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
        .text('Generated by VeriTrack — Confidential', { align: 'center' });

      doc.end();
    } catch (error) {
      next(error);
    }
  },
};
