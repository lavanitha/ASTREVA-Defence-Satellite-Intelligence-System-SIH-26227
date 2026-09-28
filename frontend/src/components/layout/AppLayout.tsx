import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070B14] text-slate-100 font-sans">
      {/* Top Header */}
      <Header />

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-[#070B14] relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
