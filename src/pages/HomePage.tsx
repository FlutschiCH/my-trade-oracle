import React from 'react';
import { Button } from '@/components/ui/button';

export const HomePage = () => {
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-6">
      <div className="bg-sky-950/20 border border-sky-400/10 backdrop-blur-xl p-10 rounded-[2.5rem] max-w-4xl mx-auto text-center space-y-8 tracking-tight font-medium">
        <h1 className="text-5xl font-bold text-white mb-4">Your Path to Mental Well-being Starts Here</h1>
        <p className="text-lg text-white/80 leading-relaxed">As a dedicated psychiatrist, I offer personalized online counseling to support your journey towards a serene mind. My approach integrates evidence-based practices with compassionate care, tailored to your unique needs.</p>
        
        <div className="space-y-6 mt-8">
          <h2 className="text-3xl font-semibold text-sky-400">Ready to Connect?</h2>
          <p className="text-white/70">Schedule your confidential session with ease using my integrated calendar.</p>
          {/* Calendly Embed Placeholder */}
          <div className="w-full bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 h-96 flex items-center justify-center text-sky-400/70">
            <p>Calendly Embed Will Go Here</p>
          </div>
          <Button className="mt-6" variant="primary">Book a Session</Button>
        </div>

        <div className="space-y-6 mt-12">
          <h2 className="text-3xl font-semibold text-sky-400">Secure Your Spot</h2>
          <p className="text-white/70">All bookings are securely processed through Stripe, ensuring your privacy and peace of mind.</p>
          {/* Stripe Booking Placeholder */}
          <div className="w-full bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 h-48 flex items-center justify-center text-sky-400/70">
            <p>Stripe Booking/Payment Gateway Will Go Here</p>
          </div>
          <Button className="mt-6" variant="primary">Proceed to Payment</Button>
        </div>
      </div>
    </div>
  );
};
