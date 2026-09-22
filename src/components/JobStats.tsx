import React from 'react';
import { JobApplication } from '../types';
import { Send, Clock, Users, Award, XCircle, CheckCircle2 } from 'lucide-react';

interface JobStatsProps {
  applications: JobApplication[];
}

export const JobStats: React.FC<JobStatsProps> = ({ applications }) => {
  const total = applications.length;
  const sentOnly = applications.filter((j) => j.status === 'Wysłana').length;
  const inReview = applications.filter((j) => j.status === 'Weryfikacja CV').length;
  const interviewsAndTasks = applications.filter(
    (j) =>
      j.status === 'Rozmowa HR' ||
      j.status === 'Rozmowa techniczna' ||
      j.status === 'Zadanie rekrutacyjne'
  ).length;
  const offers = applications.filter((j) => j.status === 'Oferta').length;
  const rejected = applications.filter((j) => j.status === 'Odrzucona').length;

  const activeProcesses = total - rejected - applications.filter((j) => j.status === 'Zrezygnowano').length;
  const responseRate = total > 0 ? Math.round(((total - sentOnly) / total) * 100) : 0;

  return (
    <div id="job-stats-container" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div id="stat-total" className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Aplikacje</span>
          <Send className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500 font-medium">wszystkich</span>
        </div>
      </div>

      <div id="stat-active" className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">W toku</span>
          <Clock className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-purple-700">{activeProcesses}</span>
          <span className="text-xs text-purple-600/80 font-medium">aktywnych</span>
        </div>
      </div>

      <div id="stat-interviews" className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Rozmowy & Taski</span>
          <Users className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-indigo-700">{interviewsAndTasks}</span>
          <span className="text-xs text-indigo-600/80 font-medium">zaawansowane</span>
        </div>
      </div>

      <div id="stat-offers" className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Oferty</span>
          <Award className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600">{offers}</span>
          <span className="text-xs text-emerald-600/80 font-medium">sukces</span>
        </div>
      </div>

      <div id="stat-rejected" className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Odrzucone</span>
          <XCircle className="w-4 h-4 text-rose-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-rose-600">{rejected}</span>
          <span className="text-xs text-slate-500 font-medium">zakończone</span>
        </div>
      </div>

      <div id="stat-response-rate" className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider">Odzew firm</span>
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-teal-700">{responseRate}%</span>
          <span className="text-xs text-slate-500 font-medium">w procesie</span>
        </div>
      </div>
    </div>
  );
};
