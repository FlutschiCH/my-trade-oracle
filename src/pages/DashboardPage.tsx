import React from 'react';

export const DashboardPage = () => {
export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-6">
      <div className="bg-sky-950/20 border border-sky-400/10 backdrop-blur-xl p-10 rounded-[2.5rem] max-w-4xl mx-auto text-center space-y-6 tracking-tight font-medium">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Your Dashboard</h1>
        <p className="text-lg text-white/80 leading-relaxed">Manage your appointments, clients, and settings here.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 text-sky-400/70 h-48 flex items-center justify-center">
            Upcoming Appointments
          </div>
          <div className="bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 text-sky-400/70 h-48 flex items-center justify-center">
            Client List
          </div>
          <div className="bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 text-sky-400/70 h-48 flex items-center justify-center">
            Settings
          </div>
          <div className="bg-sky-900/30 border border-sky-400/20 rounded-[1.5rem] p-6 text-sky-400/70 h-48 flex items-center justify-center">
            Analytics
          </div>
        </div>
      </div>
    </div>
  );
};
