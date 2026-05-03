import React from 'react';

export const BookingPage = () => {
export default function BookingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-6">
      <div className="bg-sky-950/20 border border-sky-400/10 backdrop-blur-xl p-10 rounded-[2.5rem] max-w-3xl mx-auto text-center space-y-6 tracking-tight font-medium">
        <h1 className="text-4xl font-bold text-white mb-4">Schedule Your Session</h1>
        <p className="text-lg text-white/80 leading-relaxed">Please use the calendar below to find a suitable time for your online counseling session.</p>
        {/* Actual Calendly Embed */}
        <div className="w-full bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 h-[600px] flex items-center justify-center text-sky-400/70">
          <p>This is where the Calendly widget will be embedded.</p>
          {/* Example: <iframe src="YOUR_CALENDLY_LINK" width="100%" height="100%" frameborder="0"></iframe> */}
        </div>
      </div>
    </div>
  );
};
