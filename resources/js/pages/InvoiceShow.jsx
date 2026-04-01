import React from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Download, Printer } from 'lucide-react';

export default function InvoiceShow({ auth, invoice }) {
  return (
    <AppLayout user={auth?.user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2.45rem] font-semibold tracking-[-0.04em] text-[#3a2513]">Invoice Preview</h1>
            <p className="mt-2 text-[0.95rem] text-[#73563a]">
              {invoice.invoice_number} for {invoice.customer_name}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/fat-clients/billing"
              className="inline-flex items-center justify-center rounded-[1.05rem] border border-[#d9c4a9] bg-white px-6 py-3.5 text-[1rem] font-semibold text-[#4f3118]"
            >
              Back to Billing
            </Link>
            <a
              href={invoice.print_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-[1.05rem] border border-[#d9c4a9] bg-white px-6 py-3.5 text-[1rem] font-semibold text-[#4f3118]"
            >
              <Printer className="h-5 w-5" />
              Print Invoice
            </a>
            <a
              href={invoice.download_url}
              className="inline-flex items-center gap-3 rounded-[1.05rem] bg-[#4f3118] px-6 py-3.5 text-[1rem] font-semibold text-white transition hover:bg-[#402612]"
            >
              <Download className="h-5 w-5" />
              Download PDF
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-[#e0d1bf] bg-white shadow-none">
          <iframe
            src={invoice.preview_url}
            title={`Invoice ${invoice.invoice_number}`}
            className="h-[1120px] w-full bg-white"
          />
        </div>
      </div>
    </AppLayout>
  );
}
