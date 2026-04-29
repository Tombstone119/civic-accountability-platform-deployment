# Vendor, Contract & Payment Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six broken features (blacklist, edit contract, report download, payment actions, officer status update, spending refresh) and add GridFS-backed file upload for vendor compliance documents.

**Architecture:** Wave 1 fixes bugs and enables functionality using already-existing backend endpoints; Wave 2 adds multer + GridFS for actual file storage. Both waves share the same codebase — no separate branches needed. All changes are backward-compatible (new optional fields, no schema drops).

**Tech Stack:** React 18 + TypeScript (client), Express + Mongoose + MongoDB (server), multer (memory storage), GridFS (mongoose.mongo.GridFSBucket), pdfkit (PDF generation)

---

## Wave 1 — Bug Fixes & Enhancements

---

### Task 1: Fix "Remove from Blacklist" button

**Files:**
- Modify: `client/src/services/vendorService.ts`
- Modify: `client/src/pages/vendors/VendorDetailPage.tsx:121-125`

The bug: `handleRemoveBlacklist` calls `vendorService.update(id, { isBlacklisted: false, ... })` but the server's `update` method strips `isBlacklisted` from the body (it only updates non-blacklist fields). The correct endpoint is `DELETE /api/vendors/:id/blacklist` via `vendorService.removeFromBlacklist`.

- [ ] **Step 1: Add `removeFromBlacklist` to vendorService**

In `client/src/services/vendorService.ts`, add after `delete`:

```ts
  removeFromBlacklist: (id: string) =>
    apiClient.delete<ApiResponse<Vendor>>(`/vendors/${id}/blacklist`).then(r => r.data),

  blacklistVendor: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Vendor>>(`/vendors/${id}/blacklist`, { reason }).then(r => r.data),
```

- [ ] **Step 2: Fix `handleRemoveBlacklist` in VendorDetailPage**

Replace lines 121-125 in `client/src/pages/vendors/VendorDetailPage.tsx`:

```tsx
  const handleRemoveBlacklist = async () => {
    if (!id) return;
    const res = await vendorService.removeFromBlacklist(id);
    if (res.success && res.data) setVendor(res.data);
  };
```

- [ ] **Step 3: Fix `handleBlacklist` to use the proper endpoint**

Replace lines 113-119:

```tsx
  const handleBlacklist = async () => {
    if (!vendor || !id) return;
    const reason = window.prompt('Enter blacklist reason:');
    if (!reason) return;
    const res = await vendorService.blacklistVendor(id, reason);
    if (res.success && res.data) setVendor(res.data);
  };
```

- [ ] **Step 4: Commit**

```bash
git add client/src/services/vendorService.ts client/src/pages/vendors/VendorDetailPage.tsx
git commit -m "fix: remove from blacklist now calls correct DELETE endpoint"
```

---

### Task 2: Fix Edit Contract (add edit drawer to ContractDetailPage)

**Files:**
- Modify: `client/src/pages/contracts/ContractDetailPage.tsx`

The `PUT /api/contracts/:id` endpoint is fully implemented. The UI just has a `{/* edit modal future */}` comment.

- [ ] **Step 1: Add edit drawer state near the top of `ContractDetailPage` (after `publishing` state, line 63)**

```tsx
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    status: string;
    procurementMethod: string;
    startDate: string;
    endDate: string;
    contractValue: string;
  }>({ title: '', description: '', status: '', procurementMethod: '', startDate: '', endDate: '', contractValue: '' });
```

- [ ] **Step 2: Add `handleEditOpen` and `handleEditSave` handlers (after `handleAddPayment`, before the `if (loading)` block)**

```tsx
  const handleEditOpen = () => {
    if (!contract) return;
    setEditForm({
      title: contract.title,
      description: contract.description ?? '',
      status: contract.status,
      procurementMethod: contract.procurementMethod,
      startDate: contract.startDate?.slice(0, 10) ?? '',
      endDate: contract.endDate?.slice(0, 10) ?? '',
      contractValue: String(contract.contractValue),
    });
    setEditError('');
    setEditDrawerOpen(true);
  };

  const handleEditSave = async () => {
    if (!id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const res = await contractService.update(id, {
        title: editForm.title,
        description: editForm.description || undefined,
        status: editForm.status as Contract['status'],
        procurementMethod: editForm.procurementMethod as Contract['procurementMethod'],
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        contractValue: parseFloat(editForm.contractValue),
      });
      if (res.success && res.data) {
        setContract(res.data);
        setEditDrawerOpen(false);
        setActionMsg('Contract updated successfully.');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? 'Failed to update contract.');
    } finally {
      setEditSaving(false);
    }
  };
```

- [ ] **Step 3: Wire the Edit Contract button (line 498)**

Change:
```tsx
          <Button variant="ghost" onClick={() => {/* edit modal future */}}>
            Edit Contract
          </Button>
```
To:
```tsx
          <Button variant="ghost" onClick={handleEditOpen}>
            Edit Contract
          </Button>
```

- [ ] **Step 4: Add the edit drawer just before the closing `</div>` of the component (before the Add Payment Drawer)**

Add after the `{/* Add Payment Drawer */}` Drawer block, before the final `</div>`:

```tsx
      {/* Edit Contract Drawer */}
      <Drawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditError(''); }}
        title="Edit Contract"
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={editSaving} onClick={handleEditSave}>Save Changes</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editError && <Alert type="error" message={editError} onClose={() => setEditError('')} />}
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="under_review">Under Review</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Procurement Method</label>
            <select style={inputStyle} value={editForm.procurementMethod}
              onChange={e => setEditForm(f => ({ ...f, procurementMethod: e.target.value }))}>
              <option value="open_tender">Open Tender</option>
              <option value="restricted_tender">Restricted Tender</option>
              <option value="direct_award">Direct Award</option>
              <option value="framework_agreement">Framework Agreement</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input style={inputStyle} type="date" value={editForm.startDate}
                onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input style={inputStyle} type="date" value={editForm.endDate}
                onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Contract Value (USD)</label>
            <input style={inputStyle} type="number" min="0" value={editForm.contractValue}
              onChange={e => setEditForm(f => ({ ...f, contractValue: e.target.value }))} />
          </div>
        </div>
      </Drawer>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/contracts/ContractDetailPage.tsx
git commit -m "feat: add Edit Contract drawer to ContractDetailPage"
```

---

### Task 3: Contract PDF Report — server endpoint

**Files:**
- Modify: `server/package.json`
- Modify: `server/src/controllers/contractController.ts`
- Modify: `server/src/routes/contractRoutes.ts`

- [ ] **Step 1: Install pdfkit**

```bash
cd server && npm install pdfkit && npm install --save-dev @types/pdfkit
```

Expected: `pdfkit` appears in `server/package.json` dependencies, `@types/pdfkit` in devDependencies.

- [ ] **Step 2: Add `downloadReport` method to contractController**

In `server/src/controllers/contractController.ts`, add at the top of the file after the imports:

```ts
import PDFDocument from 'pdfkit';
import { ContractItem } from '../models/ContractItem';
import { Payment } from '../models/Payment';
```

Then add this method to the `contractController` object, after `getPayments`:

```ts
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
        headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 90, continued: i < headers.length - 1 }));
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
        headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 4 : 90, continued: i < headers.length - 1 }));
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
```

- [ ] **Step 3: Register the report route in contractRoutes.ts**

In `server/src/routes/contractRoutes.ts`, add this block **before** the `router.route('/:id')` block (around line 38), so `:id/report` is matched before the bare `:id` param:

```ts
// ─── Report Download ──────────────────────────────────────────────────────────

/**
 * GET /api/contracts/:id/report  — stream PDF report (all authenticated roles)
 */
router.get(
  '/:id/report',
  authMiddleware,
  requireAuthenticated,
  contractController.downloadReport
);
```

- [ ] **Step 4: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/contractController.ts server/src/routes/contractRoutes.ts server/package.json server/package-lock.json
git commit -m "feat: add PDF report download endpoint for contracts"
```

---

### Task 4: Contract PDF Report — client wiring

**Files:**
- Modify: `client/src/services/contractService.ts`
- Modify: `client/src/pages/contracts/ContractDetailPage.tsx`

- [ ] **Step 1: Add `downloadReport` to contractService**

In `client/src/services/contractService.ts`, add after `addItem`:

```ts
  downloadReport: async (id: string): Promise<void> => {
    const response = await apiClient.get(`/contracts/${id}/report`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-report-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
```

- [ ] **Step 2: Add download state and handler to ContractDetailPage**

Add state (alongside `publishing` state on line 63):

```tsx
  const [downloadingReport, setDownloadingReport] = useState(false);
```

Add handler (after `handleEditSave`, before the `if (loading)` block):

```tsx
  const handleDownloadReport = async () => {
    if (!id) return;
    setDownloadingReport(true);
    try {
      await contractService.downloadReport(id);
    } catch {
      setActionErr('Failed to generate report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  };
```

- [ ] **Step 3: Wire the Download Report button**

Find the Download Report button in the Audit Compliance card (around line 448-458). Replace:

```tsx
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px 14px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <Download size={14} /> Download Report
            </button>
```

With:

```tsx
            <button
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '8px 14px',
                fontSize: '13px', fontWeight: 600, cursor: downloadingReport ? 'not-allowed' : 'pointer',
                opacity: downloadingReport ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!downloadingReport) e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
              onMouseLeave={e => { if (!downloadingReport) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            >
              <Download size={14} /> {downloadingReport ? 'Generating…' : 'Download Report'}
            </button>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/services/contractService.ts client/src/pages/contracts/ContractDetailPage.tsx
git commit -m "feat: wire Download Report button to PDF endpoint"
```

---

### Task 5: Payment Edit & Delete in ContractDetailPage

**Files:**
- Modify: `client/src/pages/contracts/ContractDetailPage.tsx`

The backend `PUT /api/payments/:id` and `DELETE /api/payments/:id` already exist (admin-only for now — Task 6 loosens this).

- [ ] **Step 1: Add payment edit/delete state**

Add after the `editDrawerOpen` state block:

```tsx
  const [editPaymentDrawerOpen, setEditPaymentDrawerOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState('');
  const [editPaymentForm, setEditPaymentForm] = useState<{ status: string; notes: string; referenceNumber: string }>({
    status: '', notes: '', referenceNumber: '',
  });
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
```

- [ ] **Step 2: Add `handleEditPaymentOpen`, `handleEditPaymentSave`, `handleDeletePayment`**

Add after `handleDownloadReport`:

```tsx
  const handleEditPaymentOpen = (p: Payment) => {
    setEditingPayment(p);
    setEditPaymentForm({ status: p.status, notes: '', referenceNumber: p.referenceNumber ?? '' });
    setEditPaymentError('');
    setEditPaymentDrawerOpen(true);
  };

  const handleEditPaymentSave = async () => {
    if (!editingPayment) return;
    setEditPaymentSaving(true);
    setEditPaymentError('');
    try {
      await paymentService.update(editingPayment._id, {
        status: editPaymentForm.status as Payment['status'],
        referenceNumber: editPaymentForm.referenceNumber || undefined,
      });
      const res = await paymentService.list({ contract: id!, limit: 100 });
      setPayments(res.data);
      setEditPaymentDrawerOpen(false);
      setActionMsg('Payment updated successfully.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditPaymentError(msg ?? 'Failed to update payment.');
    } finally {
      setEditPaymentSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return;
    setDeletingPaymentId(paymentId);
    try {
      await paymentService.delete(paymentId);
      setPayments(prev => prev.filter(p => p._id !== paymentId));
      setActionMsg('Payment deleted.');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setActionErr(msg ?? 'Failed to delete payment.');
    } finally {
      setDeletingPaymentId(null);
    }
  };
```

- [ ] **Step 3: Replace the MoreVertical Actions column in the payments table**

Find the Actions cell in the payments table (around line 387-391). Replace:

```tsx
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
```

With:

```tsx
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {canWrite && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEditPaymentOpen(p)}
                              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: '#1e3a8a', background: '#eff3ff', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p._id)}
                              disabled={deletingPaymentId === p._id || p.status === 'completed'}
                              title={p.status === 'completed' ? 'Completed payments cannot be deleted' : ''}
                              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: (deletingPaymentId === p._id || p.status === 'completed') ? 'not-allowed' : 'pointer', opacity: (deletingPaymentId === p._id || p.status === 'completed') ? 0.5 : 1 }}
                            >
                              {deletingPaymentId === p._id ? '…' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </td>
```

- [ ] **Step 4: Remove the now-unused `MoreVertical` import**

In the imports line at the top, change:
```tsx
import { AlertTriangle, MoreVertical, Download, Plus } from 'lucide-react';
```
To:
```tsx
import { AlertTriangle, Download, Plus, Pencil, Trash2 } from 'lucide-react';
```

(We use text buttons instead of icons, so we don't actually need Pencil/Trash2 — just remove MoreVertical):
```tsx
import { AlertTriangle, Download, Plus } from 'lucide-react';
```

- [ ] **Step 5: Add the Edit Payment drawer (after the Edit Contract drawer)**

```tsx
      {/* Edit Payment Drawer */}
      <Drawer
        open={editPaymentDrawerOpen}
        onClose={() => { setEditPaymentDrawerOpen(false); setEditPaymentError(''); }}
        title="Edit Payment"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditPaymentDrawerOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={editPaymentSaving} onClick={handleEditPaymentSave}>Save Changes</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editPaymentError && <Alert type="error" message={editPaymentError} onClose={() => setEditPaymentError('')} />}
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={editPaymentForm.status}
              onChange={e => setEditPaymentForm(f => ({ ...f, status: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Reference Number</label>
            <input style={inputStyle} value={editPaymentForm.referenceNumber}
              onChange={e => setEditPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))}
              placeholder="REF-XXXX" />
          </div>
        </div>
      </Drawer>
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/contracts/ContractDetailPage.tsx
git commit -m "feat: add Edit and Delete actions to Payment History table"
```

---

### Task 6: Payment status update for Procurement Officers

**Files:**
- Modify: `server/src/routes/paymentRoutes.ts`
- Modify: `client/src/pages/payments/PaymentsListPage.tsx`

- [ ] **Step 1: Loosen payment PUT to officer+ on the server**

In `server/src/routes/paymentRoutes.ts`, change `requireAdmin` to `requireOfficer` on the PUT route (line 36):

```ts
  .put(
    writeRateLimiter,
    authMiddleware,
    requireOfficer,
    paymentUpdateValidation,
    validateRequest,
    paymentController.update
  )
```

- [ ] **Step 2: Add status update UI to PaymentsListPage**

Add state near the top of `PaymentsListPage` (after `createError` state):

```tsx
  const [statusModalPayment, setStatusModalPayment] = useState<Payment | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [newStatus, setNewStatus] = useState<PaymentStatus>('pending');
```

Add handler (after `handleCreate`):

```tsx
  const handleUpdateStatus = async () => {
    if (!statusModalPayment) return;
    setStatusUpdating(true);
    setStatusUpdateError('');
    try {
      await paymentService.update(statusModalPayment._id, { status: newStatus });
      setStatusModalPayment(null);
      fetchPayments();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStatusUpdateError(msg ?? 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };
```

- [ ] **Step 3: Add an Actions column to the table header**

In the `<thead>` block, after the `Processed By` `<th>`, add:

```tsx
                  {canWrite && <th style={thStyle()}>Actions</th>}
```

- [ ] **Step 4: Add Actions cell to each table row**

In the table row mapping, after the `processedBy` `<td>`:

```tsx
                      {canWrite && (
                        <td style={tdStyle}>
                          <button
                            onClick={() => { setStatusModalPayment(p); setNewStatus(p.status); setStatusUpdateError(''); }}
                            style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: '#1e3a8a', background: '#eff3ff', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Update Status
                          </button>
                        </td>
                      )}
```

- [ ] **Step 5: Add the status update modal (just before the Record Payment Drawer)**

```tsx
      {/* Update Status Modal */}
      {statusModalPayment && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Update Payment Status</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569' }}>
              Ref: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{statusModalPayment.referenceNumber ?? statusModalPayment._id.slice(-8).toUpperCase()}</span>
            </p>
            {statusUpdateError && (
              <div style={{ marginBottom: '12px' }}>
                <Alert type="error" message={statusUpdateError} onClose={() => setStatusUpdateError('')} />
              </div>
            )}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>New Status</label>
              <select style={inputStyle} value={newStatus} onChange={e => setNewStatus(e.target.value as PaymentStatus)}>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStatusModalPayment(null)} style={{ flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                Cancel
              </button>
              <button onClick={handleUpdateStatus} disabled={statusUpdating} style={{ flex: 1, height: '40px', border: 'none', borderRadius: '6px', background: '#1e3a8a', color: '#fff', cursor: statusUpdating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, opacity: statusUpdating ? 0.8 : 1 }}>
                {statusUpdating ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 6: Commit both server and client changes**

```bash
git add server/src/routes/paymentRoutes.ts client/src/pages/payments/PaymentsListPage.tsx
git commit -m "feat: allow procurement officers to update payment status"
```

---

### Task 7: Fix Spending Summary "Refresh Data" button

**Files:**
- Modify: `client/src/services/publicService.ts`
- Modify: `client/src/pages/spending/SpendingSummaryPage.tsx`

The `publicService.refreshSpending()` already uses the authenticated `apiClient` — the implementation is correct. The page's `handleRefresh` already handles success/error. Looking at `SpendingSummaryPage.tsx` lines 70-83, the logic is correct.

The real issue: `POST /api/spending/refresh-summary` requires admin, but the button is shown to all users. Add a role guard.

- [ ] **Step 1: Add `useAuth` to SpendingSummaryPage and hide the button for non-admins**

In `client/src/pages/spending/SpendingSummaryPage.tsx`, add the import after the existing imports:

```tsx
import { useAuth } from '../../context/AuthContext';
```

Add inside the component function, after `const navigate = useNavigate();`:

```tsx
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
```

- [ ] **Step 2: Guard the Refresh Data button**

Wrap the `<Button>` for Refresh Data (around line 128-136) in a conditional:

```tsx
        {isAdmin && (
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            loading={refreshing}
            icon={<RefreshCw size={14} />}
          >
            Refresh Data
          </Button>
        )}
```

- [ ] **Step 3: Verify `refreshSpending` passes body correctly**

In `client/src/services/publicService.ts`, the current implementation:
```ts
  refreshSpending: (fiscalYear?: number) =>
    apiClient.post<ApiResponse<unknown>>('/spending/refresh-summary', { fiscalYear: fiscalYear ?? new Date().getFullYear() }).then(r => r.data),
```
This is already correct. No change needed.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/spending/SpendingSummaryPage.tsx client/src/services/publicService.ts
git commit -m "fix: guard Refresh Data button to admin only in SpendingSummaryPage"
```

---

## Wave 2 — GridFS File Upload System

---

### Task 8: Install multer and set up GridFS bucket factory

**Files:**
- Modify: `server/package.json`
- Create: `server/src/config/gridfs.ts`

- [ ] **Step 1: Install multer**

```bash
cd server && npm install multer && npm install --save-dev @types/multer
```

Expected: `multer` in dependencies, `@types/multer` in devDependencies.

- [ ] **Step 2: Create GridFS bucket factory**

Create `server/src/config/gridfs.ts`:

```ts
import mongoose from 'mongoose';

let bucket: mongoose.mongo.GridFSBucket | null = null;

export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
  if (!bucket) {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB connection not established');
    }
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });
  }
  return bucket;
}
```

- [ ] **Step 3: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/config/gridfs.ts server/package.json server/package-lock.json
git commit -m "feat: add GridFS bucket factory and install multer"
```

---

### Task 9: Update VendorDocument model with file metadata fields

**Files:**
- Modify: `server/src/models/VendorDocument.ts`

- [ ] **Step 1: Add optional file fields to the interface and schema**

Replace the full content of `server/src/models/VendorDocument.ts` with:

```ts
import { Schema, model, Document } from 'mongoose';

export interface IVendorDocument extends Document {
  vendor: Schema.Types.ObjectId;
  documentType: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  isVerified: boolean;
  verifiedBy?: Schema.Types.ObjectId;
  verifiedAt?: Date;
  fileUrl?: string;
  gridfsId?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  isExpired: boolean; // virtual
  createdAt: Date;
  updatedAt: Date;
}

const VendorDocumentSchema = new Schema<IVendorDocument>(
  {
    vendor:         { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    documentType:   { type: String, required: true },
    documentNumber: { type: String },
    issueDate:      { type: Date },
    expiryDate:     { type: Date },
    isVerified:     { type: Boolean, default: false },
    verifiedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt:     { type: Date },
    fileUrl:        { type: String },
    gridfsId:       { type: String },
    originalName:   { type: String },
    mimeType:       { type: String },
    fileSize:       { type: Number },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

VendorDocumentSchema.virtual('isExpired').get(function () {
  return this.expiryDate ? this.expiryDate < new Date() : false;
});

export const VendorDocument = model<IVendorDocument>('VendorDocument', VendorDocumentSchema);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/models/VendorDocument.ts
git commit -m "feat: add gridfsId, originalName, mimeType, fileSize to VendorDocument schema"
```

---

### Task 10: Add file upload and download endpoints on the server

**Files:**
- Modify: `server/src/controllers/vendorController.ts`
- Modify: `server/src/routes/vendorRoutes.ts`

- [ ] **Step 1: Add multer and GridFS imports to vendorController**

At the top of `server/src/controllers/vendorController.ts`, replace the import block with:

```ts
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Types } from 'mongoose';
import { vendorService } from '../services/vendorService';
import { VendorDocument } from '../models/VendorDocument';
import { getGridFSBucket } from '../config/gridfs';
import { NotFoundError } from '../utils/errors';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed: PDF, images, Word docs.`));
    }
  },
});
```

- [ ] **Step 2: Update `addDocument` to handle file upload**

Replace the existing `addDocument` method body (lines 178-190) with:

```ts
  addDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { documentType, documentNumber, issueDate, expiryDate } = req.body;

      let gridfsId: string | undefined;
      let originalName: string | undefined;
      let mimeType: string | undefined;
      let fileSize: number | undefined;
      let fileUrl: string | undefined;

      if (req.file) {
        const bucket = getGridFSBucket();
        const uploadStream = bucket.openUploadStream(req.file.originalname, {
          contentType: req.file.mimetype,
          metadata: { vendorId: id, documentType },
        });

        await new Promise<void>((resolve, reject) => {
          uploadStream.end(req.file!.buffer, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        gridfsId = uploadStream.id.toString();
        originalName = req.file.originalname;
        mimeType = req.file.mimetype;
        fileSize = req.file.size;
        fileUrl = `gridfs:${gridfsId}`;
      }

      const doc = await vendorService.addDocument(id, {
        documentType,
        documentNumber,
        issueDate,
        expiryDate,
        fileUrl,
        gridfsId,
        originalName,
        mimeType,
        fileSize,
      });

      res.status(201).json({
        success: true,
        data: doc,
        message: 'Document added successfully',
      });
    } catch (error) {
      next(error);
    }
  },
```

- [ ] **Step 3: Add `downloadDocumentFile` method to vendorController (after `deleteDocument`)**

```ts
  /**
   * @route   GET /api/vendors/:id/documents/:docId/file
   * @desc    Stream the uploaded file for a vendor document from GridFS
   * @access  All authenticated roles
   */
  downloadDocumentFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, docId } = req.params;

      const doc = await VendorDocument.findOne({ _id: docId, vendor: id } as any);
      if (!doc || !doc.gridfsId) {
        throw new NotFoundError('Document file not found');
      }

      const bucket = getGridFSBucket();
      const objectId = new Types.ObjectId(doc.gridfsId);

      res.setHeader('Content-Type', doc.mimeType ?? 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${doc.originalName ?? 'document'}"`
      );

      const downloadStream = bucket.openDownloadStream(objectId);

      downloadStream.on('error', () => {
        if (!res.headersSent) {
          res.status(404).json({ success: false, message: 'File not found in storage' });
        }
      });

      downloadStream.pipe(res);
    } catch (error) {
      next(error);
    }
  },
```

- [ ] **Step 4: Update vendorService.addDocument signature to accept new fields**

In `server/src/services/vendorService.ts`, update the `addDocument` method signature:

```ts
  addDocument: async (
    vendorId: string,
    data: {
      documentType: string;
      documentNumber?: string;
      issueDate?: Date;
      expiryDate?: Date;
      fileUrl?: string;
      gridfsId?: string;
      originalName?: string;
      mimeType?: string;
      fileSize?: number;
    }
  ) => {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new NotFoundError('Vendor not found');

    const doc = await VendorDocument.create({ vendor: new Types.ObjectId(vendorId), ...data } as any);
    return doc;
  },
```

- [ ] **Step 5: Register the file download route and update upload route with multer**

In `server/src/routes/vendorRoutes.ts`, add the import at the top:

```ts
import { vendorController, upload } from '../controllers/vendorController';
```

Update the documents POST route to use multer middleware:

```ts
router
  .route('/:id/documents')
  .get(authMiddleware, requireOfficer, vendorController.getDocuments)
  .post(
    authMiddleware,
    requireOfficer,
    upload.single('file'),
    vendorController.addDocument
  );
```

Add a new route for file download (after the `/:id/documents/:docId` route):

```ts
/**
 * GET /api/vendors/:id/documents/:docId/file  — stream document file (authenticated)
 */
router.get(
  '/:id/documents/:docId/file',
  authMiddleware,
  requireAuthenticated,
  vendorController.downloadDocumentFile
);
```

Note: Remove `vendorDocumentValidation, validateRequest` from the POST route since multer handles multipart and validation would conflict with form-data parsing.

- [ ] **Step 6: Verify server compiles**

```bash
cd server && npm run build 2>&1 | tail -30
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/vendorController.ts server/src/routes/vendorRoutes.ts server/src/services/vendorService.ts
git commit -m "feat: add GridFS file upload and download for vendor documents"
```

---

### Task 11: Frontend — file upload UI and document table actions

**Files:**
- Modify: `client/src/services/vendorService.ts`
- Modify: `client/src/pages/vendors/VendorDetailPage.tsx`

- [ ] **Step 1: Add new service methods to vendorService**

In `client/src/services/vendorService.ts`, replace the `addDocument` method and add new methods:

```ts
  uploadDocument: (id: string, formData: FormData, onProgress?: (pct: number) => void) =>
    apiClient.post<ApiResponse<VendorDocument>>(`/vendors/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }).then(r => r.data),

  updateDocument: (id: string, docId: string, data: Partial<VendorDocument>) =>
    apiClient.put<ApiResponse<VendorDocument>>(`/vendors/${id}/documents/${docId}`, data).then(r => r.data),

  deleteDocument: (id: string, docId: string) =>
    apiClient.delete<ApiResponse<null>>(`/vendors/${id}/documents/${docId}`).then(r => r.data),

  viewDocumentFile: async (id: string, docId: string): Promise<void> => {
    const response = await apiClient.get(`/vendors/${id}/documents/${docId}/file`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  },
```

Keep `removeFromBlacklist`, `blacklistVendor`, `list`, `get`, `create`, `update`, `delete`, `getDocuments` as they are. Remove the old `addDocument` method (replace with `uploadDocument`).

- [ ] **Step 2: Add file upload state to VendorDetailPage**

Add these states after the existing `docSaving` state:

```tsx
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docError, setDocError] = useState('');

  // Edit document drawer
  const [showEditDocDrawer, setShowEditDocDrawer] = useState(false);
  const [editingDoc, setEditingDoc] = useState<VendorDocument | null>(null);
  const [editDocForm, setEditDocForm] = useState<{ documentNumber: string; issueDate: string; expiryDate: string; isVerified: boolean }>({
    documentNumber: '', issueDate: '', expiryDate: '', isVerified: false,
  });
  const [editDocSaving, setEditDocSaving] = useState(false);

  // View document
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  // Delete document
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
```

- [ ] **Step 3: Update `handleDocUpload` to use FormData and file input**

Replace the existing `handleDocUpload` (lines 141-151):

```tsx
  const handleDocUpload = async () => {
    if (!id) return;
    if (!docForm.documentType) { setDocError('Document type is required.'); return; }
    setDocSaving(true);
    setDocError('');
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('documentType', docForm.documentType ?? '');
      if (docForm.documentNumber) formData.append('documentNumber', docForm.documentNumber);
      if (docForm.issueDate) formData.append('issueDate', docForm.issueDate);
      if (docForm.expiryDate) formData.append('expiryDate', docForm.expiryDate);
      if (docFile) formData.append('file', docFile);

      const res = await vendorService.uploadDocument(id, formData, pct => setUploadProgress(pct));
      if (res.success && res.data) {
        setDocuments(prev => [res.data!, ...prev]);
        setShowDocDrawer(false);
        setDocForm({});
        setDocFile(null);
        setUploadProgress(0);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDocError(msg ?? 'Upload failed.');
    } finally {
      setDocSaving(false);
    }
  };
```

- [ ] **Step 4: Add edit doc and delete doc handlers**

Add after `handleDocUpload`:

```tsx
  const handleEditDocOpen = (doc: VendorDocument) => {
    setEditingDoc(doc);
    setEditDocForm({
      documentNumber: doc.documentNumber ?? '',
      issueDate: doc.issueDate?.slice(0, 10) ?? '',
      expiryDate: doc.expiryDate?.slice(0, 10) ?? '',
      isVerified: doc.isVerified,
    });
    setShowEditDocDrawer(true);
  };

  const handleEditDocSave = async () => {
    if (!id || !editingDoc) return;
    setEditDocSaving(true);
    try {
      const res = await vendorService.updateDocument(id, editingDoc._id, {
        documentNumber: editDocForm.documentNumber || undefined,
        issueDate: editDocForm.issueDate || undefined,
        expiryDate: editDocForm.expiryDate || undefined,
        isVerified: editDocForm.isVerified,
      });
      if (res.success && res.data) {
        setDocuments(prev => prev.map(d => d._id === editingDoc._id ? res.data! : d));
        setShowEditDocDrawer(false);
      }
    } finally {
      setEditDocSaving(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!id || !window.confirm('Delete this document? This cannot be undone.')) return;
    setDeletingDocId(docId);
    try {
      await vendorService.deleteDocument(id, docId);
      setDocuments(prev => prev.filter(d => d._id !== docId));
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleViewDoc = async (docId: string) => {
    if (!id) return;
    setViewingDocId(docId);
    try {
      await vendorService.viewDocumentFile(id, docId);
    } finally {
      setViewingDocId(null);
    }
  };
```

- [ ] **Step 5: Add file input to the Upload Document drawer**

In the Upload Document drawer form (around line 574), add a file picker field after the Expiry Date field:

```tsx
              <div>
                <label style={labelStyle}>File (PDF, image, Word doc — max 10MB)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                  onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                  style={{ width: '100%', fontSize: '13px', color: '#0f172a' }}
                />
                {docFile && (
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                    {docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ marginTop: '8px', background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, background: '#1e3a8a', height: '100%', transition: 'width 0.2s' }} />
                  </div>
                )}
              </div>
              {docError && (
                <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{docError}</p>
              )}
```

- [ ] **Step 6: Add View, Edit, Delete columns to the documents table**

Update the table headers (around line 333). Replace:
```tsx
            {['Document Type', 'Doc No.', 'Issue Date', 'Expiry Date', 'Verified', 'Status'].map((h, i) => (
```
With:
```tsx
            {['Document Type', 'Doc No.', 'Issue Date', 'Expiry Date', 'Verified', 'Status', 'Actions'].map((h, i) => (
```

Update `colSpan={6}` in the empty state to `colSpan={7}`.

Add action cells at the end of each document row (after the Status `<td>`, before `</tr>`):

```tsx
                    <td style={{ padding: '14px 24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {doc.gridfsId && (
                          <button
                            onClick={() => handleViewDoc(doc._id)}
                            disabled={viewingDocId === doc._id}
                            style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#1e3a8a', background: '#eff3ff', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            {viewingDocId === doc._id ? '…' : 'View'}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleEditDocOpen(doc)}
                            style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteDoc(doc._id)}
                            disabled={deletingDocId === doc._id}
                            style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', opacity: deletingDocId === doc._id ? 0.5 : 1 }}
                          >
                            {deletingDocId === doc._id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
```

- [ ] **Step 7: Add the Edit Document drawer (after the Delete Confirmation Modal)**

```tsx
      {/* Edit Document Drawer */}
      {showEditDocDrawer && editingDoc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowEditDocDrawer(false)} />
          <div style={{ width: '480px', background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Edit Document</h3>
              <button onClick={() => setShowEditDocDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}>×</button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <label style={labelStyle}>Document Number</label>
                <input type="text" value={editDocForm.documentNumber}
                  onChange={e => setEditDocForm(f => ({ ...f, documentNumber: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Issue Date</label>
                <input type="date" value={editDocForm.issueDate}
                  onChange={e => setEditDocForm(f => ({ ...f, issueDate: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input type="date" value={editDocForm.expiryDate}
                  onChange={e => setEditDocForm(f => ({ ...f, expiryDate: e.target.value }))}
                  style={inputStyle} />
              </div>
              {user?.role === 'admin' && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <input type="checkbox" checked={editDocForm.isVerified}
                      onChange={e => setEditDocForm(f => ({ ...f, isVerified: e.target.checked }))} />
                    Mark as Verified
                  </label>
                </div>
              )}
            </div>
            <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowEditDocDrawer(false)} style={{ flex: 1, height: '40px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancel</button>
              <button onClick={handleEditDocSave} disabled={editDocSaving} style={{ flex: 1, height: '40px', border: 'none', borderRadius: '6px', background: '#1e3a8a', color: '#fff', cursor: editDocSaving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, opacity: editDocSaving ? 0.8 : 1 }}>
                {editDocSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 8: Update VendorDocument type to include new fields**

In `client/src/types/index.ts`, update the `VendorDocument` interface:

```ts
export interface VendorDocument {
  _id: string;
  vendor: string | Vendor;
  documentType: DocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  isVerified: boolean;
  fileUrl?: string;
  gridfsId?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
}
```

- [ ] **Step 9: Commit**

```bash
git add client/src/services/vendorService.ts client/src/pages/vendors/VendorDetailPage.tsx client/src/types/index.ts
git commit -m "feat: add GridFS file upload UI and document View/Edit/Delete actions"
```

---

## Self-Review Checklist

Before considering this plan done, verify:

- [ ] All spec sections map to a task: blacklist fix ✓ (T1), edit contract ✓ (T2), PDF report ✓ (T3+T4), payment edit/delete ✓ (T5), officer status update ✓ (T6), spending refresh ✓ (T7), GridFS setup ✓ (T8), model update ✓ (T9), server upload/download endpoints ✓ (T10), frontend upload + actions ✓ (T11)
- [ ] No TBD or placeholder steps
- [ ] `vendorService.uploadDocument` used consistently (T10 Step 1 defines it, T11 Step 1 adds it to client service)
- [ ] `getGridFSBucket` defined in T8, imported in T10
- [ ] `VendorDocument` interface updated in T11 Step 8 before it's used in T11 Steps 3-7
- [ ] multer installed in T8, imported in T10
- [ ] pdfkit installed in T3, imported in T3 Step 2

---

## Environment Notes

After Wave 1 and Wave 2 are complete:
- Run `npm install` at root to pull in new server deps (pdfkit, multer)
- MongoDB `uploads` bucket is created automatically on first GridFS file upload
- No new environment variables needed
