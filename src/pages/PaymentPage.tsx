import React from 'react';
import { Button } from '@/components/ui/button';

export const PaymentPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-6">
      <div className="bg-sky-950/20 border border-sky-400/10 backdrop-blur-xl p-10 rounded-[2.5rem] max-w-2xl mx-auto text-center space-y-6 tracking-tight font-medium">
        <h1 className="text-4xl font-bold text-white mb-4">Complete Your Booking</h1>
        <p className="text-lg text-white/80 leading-relaxed">Your session is almost confirmed! Please proceed with the secure payment via Stripe.</p>
        {/* Stripe Payment Form Placeholder */}
        <div className="w-full bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 h-64 flex items-center justify-center text-sky-400/70">
          <p>This is where the Stripe payment form will be integrated.</p>
        </div>
        <Button className="mt-6" variant="primary">Pay Now</Button>
      </div>
    </div>
  );
};
